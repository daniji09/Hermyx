import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { limitBaseSchema, pageBaseSchema } from './pagination.validation.js';
import { midBaseSchema } from './mission.validation.js';
import { uidBaseSchema } from './user.validation.js';

/// Base validations, raw logic
export const reportIdBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Report id'))
  .int(messages.GENERAL.FIELD_INTEGER('Report id'))
  .min(0, messages.GENERAL.FIELD_POSITIVE('Report id'));

export const reportMessageBaseSchema = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Message'))
  .max(
    consts.REPORT.MESSAGE.MAX,
    messages.GENERAL.FIELD_TOO_LONG('Message', consts.REPORT.MESSAGE.MAX),
  );

export const reportReasonBaseSchema = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Reason'))
  .max(
    consts.REPORT.REASON_MESSAGE.MAX,
    messages.GENERAL.FIELD_TOO_LONG('Reason', consts.REPORT.REASON_MESSAGE.MAX),
  );

export const vacancyIdBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Vacancy id'))
  .int(messages.GENERAL.FIELD_INTEGER('Vacancy id'))
  .min(0, messages.GENERAL.FIELD_POSITIVE('Vacancy id'));

/// Endpoint complex validations
// Get reports
export const getReportsValidation = z.object({
  sortByDate: z.coerce.string().trim().optional(),
  type: z.coerce.string().trim().optional(),
  status: z.coerce.string().trim().optional(),
  page: pageBaseSchema,
  limit: limitBaseSchema,
});

// Get report by id
export const getReportByIdValidation = z.object({
  rid: reportIdBaseSchema,
});

export const reportAdventurerValidation = z.object({
  mid: midBaseSchema,
  vacancyId: vacancyIdBaseSchema,
  message: reportMessageBaseSchema,
});

// Backwards-compatible alias while older clients are migrated.
export const disputeValidation = reportAdventurerValidation;

export const reportUserValidation = z.object({
  uid: uidBaseSchema,
  message: reportMessageBaseSchema,
});

export const reportMissionValidation = z.object({
  mid: midBaseSchema,
  message: reportMessageBaseSchema,
});

export const acceptAdventurersWorkParamsValidation = z.object({
  rid: reportIdBaseSchema,
});

export const acceptAdventurersWorkBodyValidation = z.object({
  reason: reportReasonBaseSchema,
});

export const rejectAdventurersWorkParamValidation =
  acceptAdventurersWorkParamsValidation;

export const rejectAdventurersWorkBodyValidation =
  acceptAdventurersWorkBodyValidation;

export const dismissParamValidation = acceptAdventurersWorkParamsValidation;

export const dismissBodyValidation = acceptAdventurersWorkBodyValidation;

export const answerReportValidation = acceptAdventurersWorkBodyValidation;
