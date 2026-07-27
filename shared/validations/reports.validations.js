import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';

export const getReportsValidation = z.object({
  sortByDate: z.coerce.string().trim().optional(),
  type: z.coerce.string().trim().optional(),
  status: z.coerce.string().trim().optional(),
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

export const getReportByIdValidation = z.object({
  id: z.coerce
    .number(messages.FIELD_NUMBER('Id'))
    .int(messages.FIELD_INTEGER('Id'))
    .min(0, messages.FIELD_POSITIVE('Id')),
});

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

export const reportUserValidation = z.object({
  uid: z.coerce
    .number(messages.FIELD_NUMBER('Uid'))
    .int(messages.FIELD_INTEGER('Uid'))
    .min(0, messages.FIELD_POSITIVE('Uid')),
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

export const reportMissionValidation = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Id'))
    .int(messages.FIELD_INTEGER('Id'))
    .min(0, messages.FIELD_POSITIVE('Id')),
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

export const acceptAdventurersWorkValidation = z.object({
  rid: z.coerce
    .number(messages.FIELD_NUMBER('Rid'))
    .int(messages.FIELD_INTEGER('Rid'))
    .min(0, messages.FIELD_POSITIVE('Rid')),
});

export const rejectAdventurersWorkValidation = z.object({
  rid: z.coerce
    .number(messages.FIELD_NUMBER('Rid'))
    .int(messages.FIELD_INTEGER('Rid'))
    .min(0, messages.FIELD_POSITIVE('Rid')),
});
