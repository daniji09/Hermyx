import { consts, messages, MISSION_PARTICIPATION_STATUS } from '@hermyx/shared';
import pool from '../config/db.config.js';
import { AppError, checkRequired } from '../utils/error.util.js';
import * as reviewModel from '../models/review.model.js';
import * as missionService from './mission.service.js';
import * as userService from './user.service.js';

/// Endpoint complex functions
// Get user reviews
export const getUserReviews = async (uid, pagination) => {
  // Parameter checks
  checkRequired(uid, 'User id');

  // Treats pagination
  const pageData = pagination || {
    page: consts.PAGINATION.DEFAULT_PAGE,
    limit: consts.PAGINATION.DEFAULT_LIMIT,
    offset:
      (consts.PAGINATION.DEFAULT_PAGE - 1) * consts.PAGINATION.DEFAULT_LIMIT,
  };

  // Then returns all reviews
  const result = await reviewModel.findByUserUid(uid, pageData);
  return {
    ...result,
    pagination: buildPagination(pageData, result.totalReviews),
  };
};

// Reviews adventurer
export const reviewAdventurer = async ({
  mid,
  adventurerId,
  ownerId,
  rating,
  comment,
}) => {
  // Parameter checks
  checkRequired(mid, 'Mission id');
  checkRequired(adventurerId, 'Adventurer user id');
  checkRequired(ownerId, 'Owner user id');
  checkRequired(rating, 'Review rating');

  // Creates review
  return await createReview({
    mid,
    adventurerId,
    reviewerId: ownerId,
    rating,
    comment,
    reviewerRole: 'owner',
  });
};
export const reviewOwner = async ({ mid, adventurerId, rating, comment }) => {
  // Parameter checks
  checkRequired(mid, 'Mission id');
  checkRequired(adventurerId, 'Adventurer user id');
  checkRequired(rating, 'Review rating');

  // Creates review
  return await createReview({
    mid,
    adventurerId,
    reviewerId: adventurerId,
    rating,
    comment,
    reviewerRole: 'adventurer',
  });
};

// Creates a review
const createReview = async ({
  mid,
  adventurerId,
  reviewerId,
  rating,
  comment,
  reviewerRole,
}) => {
  // A transaction is needed for creating the review
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Gets participation blocking row for update because two adventurers could review the same applicant at the same time or viceversa
    const participation =
      await missionService.getMissionParticipationReviewContext(
        mid,
        adventurerId,
        client,
      );
    // Validates review
    validateReview(participation, reviewerId, reviewerRole);

    // Gets user using pessimistic concurrency approach, so rating column is not updated wrongly
    const targetUserId =
      reviewerRole === 'owner' ? adventurerId : participation.owner_id;
    await userService.getUsersByUidForUpdate(targetUserId, client);

    // Creates review
    const review = await reviewModel.create({ rating, comment }, client);
    if (reviewerRole === 'owner') {
      // Updates mission participation with owner review
      await missionService.updateMissionParticipationOwnerReview(
        participation.id,
        review.id,
        client,
      );
      // Updates adventurer rating
      await userService.updateRating(adventurerId, client);
    } else {
      // Updates mission participation with adventurer review
      await missionService.updateMissionParticipationAdventurerReview(
        participation.id,
        review.id,
        client,
      );
      // Updates owner rating
      await userService.updateRating(participation.owner_id, client);
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

// Review validations checks
const validateReview = (participation, reviewerId, reviewerRole) => {
  // Checks if participation exists
  if (!participation)
    throw new AppError(messages.MISSION.VACANCY.NOT_FOUND, 404);

  // Checks if mission owner is the correct one which review is been applied to
  if (reviewerRole === 'owner' && participation.owner_id !== reviewerId)
    throw new AppError(messages.REVIEW.GENERAL.MISSION_REVIEW_NOT_ALLOWED, 403);

  // Checks if participation is in a status that can be reviewed or can review
  if (
    !MISSION_PARTICIPATION_STATUS[participation.participation_status].CAN_REVIEW
  )
    throw new AppError(messages.REVIEW.GENERAL.MISSION_COMPLETED, 409);

  // Gets rid and checks if already exists
  const reviewId =
    reviewerRole === 'owner'
      ? participation.owner_review_id
      : participation.adventurer_review_id;
  if (reviewId)
    throw new AppError(
      messages.REVIEW.GENERAL.MISSION_REVIEW_ALREADY_EXISTS,
      409,
    );
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
