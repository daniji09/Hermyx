import { consts, messages } from '@hermyx/shared';
import { getByUsername } from '../models/user.model.js';
import {
  createAdventurerReview,
  createOwnerReview,
  getAdventurerReviewsByUsername,
} from '../models/review.model.js';

export const getUserReviews = async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();
    const pagination = req.pagination || {
      page: consts.PAGINATION.DEFAULT_PAGE,
      limit: consts.PAGINATION.DEFAULT_LIMIT,
      offset:
        (consts.PAGINATION.DEFAULT_PAGE - 1) * consts.PAGINATION.DEFAULT_LIMIT,
    };

    const user = await getByUsername(username);

    if (!user) {
      return res.status(404).json({
        errors: { general: [messages.USERNAME_NOT_FOUND(username)] },
      });
    }

    const reviewsVisible =
      user.configuration?.show_missions_to_others !== false;

    if (!reviewsVisible) {
      return res.status(200).json({
        averageRating: 0,
        totalReviews: 0,
        reviews: [],
        reviewsVisible,
        pagination: {
          currentPage: pagination.page,
          totalPages: 0,
          totalItems: 0,
          hasMore: false,
        },
      });
    }

    const reviewsResult = await getAdventurerReviewsByUsername(
      username,
      pagination,
    );
    const totalItems = reviewsResult.totalReviews;
    const totalPages = Math.ceil(totalItems / pagination.limit);
    const hasMore = pagination.page < totalPages;

    return res.status(200).json({
      ...reviewsResult,
      reviewsVisible,
      pagination: {
        currentPage: pagination.page,
        totalPages,
        totalItems,
        hasMore,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      errors: { general: [messages.UNEXPECTED_ERROR] },
    });
  }
};

export const reviewAdventurer = async (req, res) => {
  const { mid, adventurerId } = req.params;
  const { rating, comment } = req.body;
  const ownerId = req.user.uid;

  try {
    const result = await createOwnerReview({
      missionId: mid,
      adventurerId,
      ownerId,
      rating,
      comment,
    });

    if (result.error === 'participation_not_found') {
      return res.status(404).json({
        error: messages.MISSION_REVIEW_PARTICIPATION_REQUIRED,
      });
    }

    if (result.error === 'not_owner') {
      return res.status(403).json({
        error: messages.MISSION_REVIEW_NOT_ALLOWED,
      });
    }

    if (result.error === 'mission_not_completed') {
      return res.status(409).json({
        error: messages.MISSION_REVIEW_COMPLETED_REQUIRED,
      });
    }

    if (result.error === 'already_reviewed') {
      return res.status(409).json({
        error: messages.MISSION_REVIEW_ALREADY_EXISTS,
      });
    }

    return res.status(201).json({
      message: messages.MISSION_REVIEW_CREATED_SUCCESSFULLY,
      review: result.review,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

export const reviewOwner = async (req, res) => {
  const { mid } = req.params;
  const { rating, comment } = req.body;
  const adventurerId = req.user.uid;

  try {
    const result = await createAdventurerReview({
      missionId: mid,
      adventurerId,
      rating,
      comment,
    });

    if (result.error === 'participation_not_found') {
      return res.status(404).json({
        error: messages.MISSION_REVIEW_PARTICIPATION_REQUIRED,
      });
    }

    if (result.error === 'mission_not_completed') {
      return res.status(409).json({
        error: messages.MISSION_REVIEW_COMPLETED_REQUIRED,
      });
    }

    if (result.error === 'already_reviewed') {
      return res.status(409).json({
        error: messages.MISSION_REVIEW_ALREADY_EXISTS,
      });
    }

    return res.status(201).json({
      message: messages.MISSION_REVIEW_CREATED_SUCCESSFULLY,
      review: result.review,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};
