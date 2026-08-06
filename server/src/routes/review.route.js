import { Router } from 'express';
import {
  getUserReviews,
  reviewAdventurer,
  reviewOwner,
} from '../controllers/review.controller.js';
import { pagination } from '../middlewares/pagination.middleware.js';
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from '../middlewares/validation.middleware.js';
import {
  getUserReviewsQuerySchema,
  reviewAdventurerBodySchema,
  reviewAdventurerParamSchema,
  reviewOwnerParamSchema,
  reviewUserParamSchema,
} from '@hermyx/shared';

const router = Router();

// Get user reviews by username
router.get(
  '/users/:username',
  validateParamsSchema(reviewUserParamSchema),
  validateQuerySchema(getUserReviewsQuerySchema),
  pagination(),
  getUserReviews,
);

// Reviews an adventurer after a completed mission
router.post(
  '/missions/:mid/adventurers/:adventurerId',
  validateParamsSchema(reviewAdventurerParamSchema),
  validateBodySchema(reviewAdventurerBodySchema),
  reviewAdventurer,
);

// Reviews a mission owner after a completed participation
router.post(
  '/missions/:mid/owner',
  validateParamsSchema(reviewOwnerParamSchema),
  validateBodySchema(reviewAdventurerBodySchema),
  reviewOwner,
);

export default router;
