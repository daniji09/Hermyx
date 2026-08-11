import z from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';

export const pageBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Page'))
  .int(messages.GENERAL.FIELD_INTEGER('Page'))
  .min(0, messages.GENERAL.FIELD_POSITIVE('Page'))
  .optional();

export const limitBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Limit'))
  .int(messages.GENERAL.FIELD_INTEGER('Limit'))
  .min(0, messages.GENERAL.FIELD_POSITIVE('Limit'))
  .max(
    consts.PAGINATION.MAX_LIMIT,
    messages.GENERAL.FIELD_TOO_BIG('Limit', consts.PAGINATION.MAX_LIMIT),
  )
  .optional();
