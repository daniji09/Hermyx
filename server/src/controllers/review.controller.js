import { messages } from '@hermyx/shared';
import * as reviewService from '../services/review.service.js';

// Gets users reviews
export const getUserReviews = async (req, res, next) => {
  try {
    const result = await reviewService.getUserReviews(
      req.params.uid,
      req.pagination,
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const reviewAdventurer = async (req, res, next) => {
  try {
    const review = await reviewService.reviewAdventurer({
      missionId: req.params.mid,
      adventurerId: req.params.adventurerId,
      ownerId: req.user.uid,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    return res.status(201).json({
      message: messages.MISSION_REVIEW_CREATED_SUCCESSFULLY,
      review,
    });
  } catch (error) {
    next(error);
  }
};

export const reviewOwner = async (req, res, next) => {
  try {
    const review = await reviewService.reviewOwner({
      missionId: req.params.mid,
      adventurerId: req.user.uid,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    return res.status(201).json({
      message: messages.MISSION_REVIEW_CREATED_SUCCESSFULLY,
      review,
    });
  } catch (error) {
    next(error);
  }
};
