import { consts, messages, MISSION_PARTICIPATION_STATUS } from '@hermyx/shared';
import pool from '../config/db.config.js';
import { AppError } from '../utils/error.util.js';
import * as reviewModel from '../models/review.model.js';
import * as missionService from './mission.service.js';
import * as userService from './user.service.js';

/// Endpoint complex functions
// Get user reviews
export const getUserReviews = async (uid, pagination) => {
  // Treats pagination
  const pageData = pagination || {
    page: consts.PAGINATION.DEFAULT_PAGE,
    limit: consts.PAGINATION.DEFAULT_LIMIT,
    offset:
      (consts.PAGINATION.DEFAULT_PAGE - 1) * consts.PAGINATION.DEFAULT_LIMIT,
  };

  // Gets user by uid
  const user = await userService.getUserByUidOrThrow(uid);

  // Checks if reviews are visible
  const reviewsVisible = user.configuration?.show_missions_to_others !== false;
  if (!reviewsVisible) {
    return {
      averageRating: 0,
      totalReviews: 0,
      reviews: [],
      reviewsVisible,
      pagination: buildPagination(pageData, 0),
    };
  }

  // Then returns all reviews
  const result = await reviewModel.findByUserUid(uid, pageData);
  return {
    ...result,
    reviewsVisible,
    pagination: buildPagination(pageData, result.totalReviews),
  };
};

export const reviewAdventurer = async ({
  missionId,
  adventurerId,
  ownerId,
  rating,
  comment,
}) =>
  createReview({
    missionId,
    adventurerId,
    reviewerId: ownerId,
    rating,
    comment,
    reviewerRole: 'owner',
  });

export const reviewOwner = async ({
  missionId,
  adventurerId,
  rating,
  comment,
}) =>
  createReview({
    missionId,
    adventurerId,
    reviewerId: adventurerId,
    rating,
    comment,
    reviewerRole: 'adventurer',
  });

const createReview = async ({
  missionId,
  adventurerId,
  reviewerId,
  rating,
  comment,
  reviewerRole,
}) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const participation =
      await missionService.getMissionParticipationReviewContext(
        missionId,
        adventurerId,
        client,
      );
    validateReview(participation, reviewerId, reviewerRole);

    const review = await reviewModel.create({ rating, comment }, client);
    if (reviewerRole === 'owner') {
      await missionService.updateMissionParticipationOwnerReview(
        participation.id,
        review.id,
        client,
      );
      await userService.updateAdventurerRating(adventurerId, client);
    } else {
      await missionService.updateMissionParticipationAdventurerReview(
        participation.id,
        review.id,
        client,
      );
      await userService.updateOwnerRating(participation.owner_id, client);
    }
    await client.query('COMMIT');
    return review;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const validateReview = (participation, reviewerId, reviewerRole) => {
  if (!participation)
    throw new AppError(messages.MISSION_REVIEW_PARTICIPATION_REQUIRED, 404);
  if (reviewerRole === 'owner' && participation.owner_id !== reviewerId)
    throw new AppError(messages.MISSION_REVIEW_NOT_ALLOWED, 403);
  if (
    !MISSION_PARTICIPATION_STATUS[participation.participation_status].CAN_REVIEW
  )
    throw new AppError(messages.MISSION_REVIEW_COMPLETED_REQUIRED, 409);
  const reviewId =
    reviewerRole === 'owner'
      ? participation.owner_review_id
      : participation.adventurer_review_id;
  if (reviewId) throw new AppError(messages.MISSION_REVIEW_ALREADY_EXISTS, 409);
};

const buildPagination = (pagination, totalItems) => {
  const totalPages = Math.ceil(totalItems / pagination.limit);
  return {
    currentPage: pagination.page,
    totalPages,
    totalItems,
    hasMore: pagination.page < totalPages,
  };
};
