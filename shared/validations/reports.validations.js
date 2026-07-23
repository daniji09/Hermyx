import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';

export const disputeValidation = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Id'))
    .int(messages.FIELD_INTEGER('Id'))
    .min(0, messages.FIELD_POSITIVE('Id')),
  vacancyId: z.coerce
    .number(messages.FIELD_NUMBER('Vacancy id'))
    .int(messages.FIELD_INTEGER('Vacancy id'))
    .min(0, messages.FIELD_POSITIVE('Vacancy id')),
  message: z
    .string()
    .trim()
    .min(1, messages.FIELD_REQUIRED)
    .max(
      consts.REPORT.MESSAGE.MAX,
      messages.FIELD_TOO_LONG('Message', consts.REPORT.MESSAGE.MAX),
    )
    .default(''),
});
