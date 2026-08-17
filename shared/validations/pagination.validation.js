import z from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { requireBothOrNeither } from './helper.validation.js';

export const pageBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Page'))
  .int(messages.GENERAL.FIELD_INTEGER('Page'))
  .min(1, messages.GENERAL.FIELD_POSITIVE('Page'))
  .optional();

export const limitBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Limit'))
  .int(messages.GENERAL.FIELD_INTEGER('Limit'))
  .min(1, messages.GENERAL.FIELD_POSITIVE('Limit'))
  .max(
    consts.PAGINATION.MAX_LIMIT,
    messages.GENERAL.FIELD_TOO_BIG('Limit', consts.PAGINATION.MAX_LIMIT),
  )
  .optional();

export const paginationQueryBaseSchema = z.object({
  page: pageBaseSchema,
  limit: limitBaseSchema,
});

export const paginationQuerySchema = requireBothOrNeither(
  paginationQueryBaseSchema,
  'page',
  'limit',
  messages.GENERAL.INCOMPLETE_PAGINATION,
);
