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

// Reviews collaborator
export const reviewAdventurer = async (req, res, next) => {
  try {
    const review = await reviewService.reviewAdventurer({
      mid: req.params.mid,
      adventurerId: req.params.adventurerId,
      ownerId: req.user.uid,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    return res.status(201).json({
      review,
    });
  } catch (error) {
    next(error);
  }
};

// Reviews applicant
export const reviewOwner = async (req, res, next) => {
  try {
    const review = await reviewService.reviewOwner({
      mid: req.params.mid,
      adventurerId: req.user.uid,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    return res.status(201).json({
      review,
    });
  } catch (error) {
    next(error);
  }
};
