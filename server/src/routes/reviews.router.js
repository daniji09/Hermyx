import { Router } from 'express';
import {
  getUserReviews,
  reviewAdventurer,
  reviewOwner,
} from '../controllers/reviews.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { pagination } from '../middlewares/pagination.middleware.js';
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from '../middlewares/validations.middleware.js';
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
  verifyToken,
  validateParamsSchema(reviewAdventurerParamSchema),
  validateBodySchema(reviewAdventurerBodySchema),
  reviewAdventurer,
);

// Reviews a mission owner after a completed participation
router.post(
  '/missions/:mid/owner',
  verifyToken,
  validateParamsSchema(reviewOwnerParamSchema),
  validateBodySchema(reviewAdventurerBodySchema),
  reviewOwner,
);

export default router;
