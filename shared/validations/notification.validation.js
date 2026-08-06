import { z } from 'zod';
import { messages } from '../messages/messages.js';

export const respondToNotificationParamSchema = z.object({
  notificationId: z.coerce
    .number(messages.FIELD_NUMBER('Notification id'))
    .int(messages.FIELD_INTEGER('Notification id'))
    .min(0, messages.FIELD_POSITIVE('Notification id')),
});

export const respondToNotificationBodySchema = z.object({
  response: z.enum(['accepted', 'accept', 'rejected', 'disputed']),
});
