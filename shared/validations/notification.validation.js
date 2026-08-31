import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { limitBaseSchema, pageBaseSchema } from './pagination.validation.js';

/// Base validations, raw logic
export const nidBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Notification id'))
  .int(messages.GENERAL.FIELD_INTEGER('Notification id'))
  .min(0, messages.GENERAL.FIELD_POSITIVE('Notification id'));

export const notificationResponseBaseSchema = z.enum([
  'accepted',
  'accept',
  'rejected',
  'disputed',
]);

export const notificationMessageBaseSchema = z
  .string()
  .trim()
  .max(
    consts.REPORT.MESSAGE.MAX,
    messages.GENERAL.FIELD_TOO_LONG('Message', consts.REPORT.MESSAGE.MAX),
  );

/// Endpoint complex validations
// Get current user's notifications
export const getNotificationsQuerySchema = z.object({
  page: pageBaseSchema,
  limit: limitBaseSchema,
  status: z.enum(['all', 'accepted', 'rejected']).default('all'),
});

// Respond to notification
export const respondToNotificationParamSchema = z.object({
  nid: nidBaseSchema,
});

export const respondToNotificationBodySchema = z
  .object({
    response: notificationResponseBaseSchema,
    message: notificationMessageBaseSchema.optional(),
  })
  .superRefine(({ response, message }, context) => {
    if (response === 'disputed' && !message) {
      context.addIssue({
        code: 'custom',
        path: ['message'],
        message: messages.GENERAL.FIELD_REQUIRED('Message'),
      });
    }
  });
