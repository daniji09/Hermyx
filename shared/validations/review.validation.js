import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { limitBaseSchema, pageBaseSchema } from './pagination.validation.js';
import { midBaseSchema } from './mission.validation.js';
import { uidBaseSchema, usernameBaseSchema } from './user.validation.js';

/// Base validations, raw logic
export const ratingBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Rating'))
  .min(
    consts.MISSION.REVIEW.RATING_MIN,
    messages.GENERAL.FIELD_TOO_SMALL(
      'Rating',
      consts.MISSION.REVIEW.RATING_MIN,
    ),
  )
  .max(
    consts.MISSION.REVIEW.RATING_MAX,
    messages.GENERAL.FIELD_TOO_BIG(
      'Rating',
      consts.MISSION.REVIEW.RATING_MAX,
    ),
  );

export const reviewCommentBaseSchema = z
  .string()
  .trim()
  .max(
    consts.MISSION.REVIEW.COMMENT_MAX_LENGTH,
    messages.GENERAL.FIELD_TOO_LONG(
      'Comment',
      consts.MISSION.REVIEW.COMMENT_MAX_LENGTH,
    ),
  );

export const reviewUserParamSchema = z.object({
  username: usernameBaseSchema,
});

export const getUserReviewsQuerySchema = z.object({
  page: pageBaseSchema,
  limit: limitBaseSchema,
});

export const reviewAdventurerParamSchema = z.object({
  mid: midBaseSchema,
  adventurerId: uidBaseSchema,
});

export const reviewBodySchema = z.object({
  rating: ratingBaseSchema,
  comment: reviewCommentBaseSchema.optional().or(z.literal('')),
});

export const reviewAdventurerBodySchema = reviewBodySchema;

export const reviewOwnerParamSchema = z.object({
  mid: midBaseSchema,
});
