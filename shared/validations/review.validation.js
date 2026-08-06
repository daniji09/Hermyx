import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { regex } from '../regex/regex.js';

export const reviewUserParamSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, messages.FIELD_REQUIRED)
    .max(
      consts.USERNAME_MAX_LENGTH,
      messages.FIELD_TOO_LONG('Username', consts.USERNAME_MAX_LENGTH),
    )
    .regex(regex.USERNAME_REGEX, messages.USERNAME_INVALID_CHARACTERS),
});

export const getUserReviewsQuerySchema = z.object({
  page: z.coerce
    .number(messages.FIELD_NUMBER('Page'))
    .int(messages.FIELD_INTEGER('Page'))
    .min(0, messages.FIELD_POSITIVE('Page'))
    .optional(),
  limit: z.coerce
    .number(messages.FIELD_NUMBER('Limit'))
    .int(messages.FIELD_INTEGER('Limit'))
    .min(0, messages.FIELD_POSITIVE('Limit'))
    .optional(),
});

export const reviewAdventurerParamSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Mid'))
    .int(messages.FIELD_INTEGER('Mid'))
    .min(0, messages.FIELD_POSITIVE('Mid')),
  adventurerId: z.coerce
    .number(messages.FIELD_NUMBER('Adventurer id'))
    .int(messages.FIELD_INTEGER('Adventurer id'))
    .min(0, messages.FIELD_POSITIVE('Adventurer id')),
});

export const reviewAdventurerBodySchema = z.object({
  rating: z.coerce
    .number(messages.FIELD_NUMBER('Rating'))
    .min(
      consts.MISSION.REVIEW.RATING_MIN,
      messages.FIELD_TOO_SMALL('Rating', consts.MISSION.REVIEW.RATING_MIN),
    )
    .max(
      consts.MISSION.REVIEW.RATING_MAX,
      messages.FIELD_TOO_BIG('Rating', consts.MISSION.REVIEW.RATING_MAX),
    ),
  comment: z
    .string()
    .trim()
    .max(
      consts.MISSION.REVIEW.COMMENT_MAX_LENGTH,
      messages.FIELD_TOO_LONG(
        'Comment',
        consts.MISSION.REVIEW.COMMENT_MAX_LENGTH,
      ),
    )
    .optional()
    .or(z.literal('')),
});

export const reviewOwnerParamSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Mid'))
    .int(messages.FIELD_INTEGER('Mid'))
    .min(0, messages.FIELD_POSITIVE('Mid')),
});
