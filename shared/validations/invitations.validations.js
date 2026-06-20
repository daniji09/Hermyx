import { z } from 'zod';
import { messages } from '../messages/messages.js';

export const createInvitationSchema = z.object({
  missionId: z.coerce
    .number(messages.FIELD_NUMBER('Mission id'))
    .int(messages.FIELD_INTEGER('Mission id'))
    .min(0, messages.FIELD_POSITIVE('Mission id')),
  receiverId: z.coerce
    .number(messages.FIELD_NUMBER('Receiver id'))
    .int(messages.FIELD_INTEGER('Receiver id'))
    .min(0, messages.FIELD_POSITIVE('Receiver id')),
});

export const respondToInvitationParamSchema = z.object({
  invitationId: z.coerce
    .number(messages.FIELD_NUMBER('Invitation id'))
    .int(messages.FIELD_INTEGER('Invitation id'))
    .min(0, messages.FIELD_POSITIVE('Invitation id')),
});

export const respondToInvitationBodySchema = z.object({
  response: z.enum(['accepted', 'accept', 'rejected']),
});
