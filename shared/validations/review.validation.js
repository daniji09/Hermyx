import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { limitBaseSchema, pageBaseSchema } from './pagination.validation.js';
import { midBaseSchema } from './mission.validation.js';
import { uidBaseSchema } from './user.validation.js';

/// Base validations, raw logic
// Rating
export const ratingBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Rating'))
  .min(
    consts.REVIEW.RATING_MIN,
    messages.GENERAL.FIELD_TOO_SMALL('Rating', consts.REVIEW.RATING_MIN),
  )
  .max(
    consts.REVIEW.RATING_MAX,
    messages.GENERAL.FIELD_TOO_BIG('Rating', consts.REVIEW.RATING_MAX),
  );

// Comment
export const reviewCommentBaseSchema = z
  .string()
  .trim()
  .max(
    consts.REVIEW.COMMENT_MAX_LENGTH,
    messages.GENERAL.FIELD_TOO_LONG(
      'Comment',
      consts.REVIEW.COMMENT_MAX_LENGTH,
    ),
  );

/// Endpoint complex validations
// Get user reviews
export const getUserReviewsParamSchema = z.object({
  uid: uidBaseSchema,
});

export const getUserReviewsQuerySchema = z.object({
  page: pageBaseSchema,
  limit: limitBaseSchema,
});

// Review adventurer
export const reviewAdventurerParamSchema = z.object({
  mid: midBaseSchema,
  adventurerId: uidBaseSchema,
});

export const reviewAdventurerBodySchema = z.object({
  rating: ratingBaseSchema,
  comment: reviewCommentBaseSchema.optional().or(z.literal('')),
});

// Review owner
export const reviewOwnerParamSchema = z.object({
  mid: midBaseSchema,
});

export const reviewOwnerBodySchema = z.object({
  rating: ratingBaseSchema,
  comment: reviewCommentBaseSchema.optional().or(z.literal('')),
});
