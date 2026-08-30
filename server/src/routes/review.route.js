import { Router } from 'express';
import * as reviewController from '../controllers/review.controller.js';
import { pagination } from '../middlewares/pagination.middleware.js';
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from '../middlewares/validation.middleware.js';
import {
  getUserReviewsParamSchema,
  getUserReviewsQuerySchema,
  reviewAdventurerBodySchema,
  reviewAdventurerParamSchema,
  reviewOwnerBodySchema,
  reviewOwnerParamSchema,
} from '@hermyx/shared';
import { verifyRegularUser } from '../middlewares/auth.middleware.js';

const router = Router();

/// GET
// Get reviews by username
router.get(
  '/users/:uid',
  validateParamsSchema(getUserReviewsParamSchema),
  validateQuerySchema(getUserReviewsQuerySchema),
  pagination(),
  reviewController.getUserReviews,
);

/// POST
// Reviews an collaborator after a completed service
router.post(
  '/services/:mid/adventurers/:adventurerId',
  verifyRegularUser,
  validateParamsSchema(reviewAdventurerParamSchema),
  validateBodySchema(reviewAdventurerBodySchema),
  reviewController.reviewAdventurer,
);

// Reviews an applicant after a completed participation
router.post(
  '/services/:mid/owner',
  verifyRegularUser,
  validateParamsSchema(reviewOwnerParamSchema),
  validateBodySchema(reviewOwnerBodySchema),
  reviewController.reviewOwner,
);

export default router;
