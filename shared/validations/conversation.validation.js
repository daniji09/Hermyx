import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { uidBaseSchema } from './user.validation.js';
import { limitBaseSchema } from './pagination.validation.js';

/// Base validations, raw logic
export const conversationIdBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Conversation id'))
  .int(messages.GENERAL.FIELD_INTEGER('Conversation id'))
  .positive(messages.GENERAL.FIELD_POSITIVE('Conversation id'));

export const messageContentBaseSchema = z
  .string()
  .trim()
  .max(1000, messages.GENERAL.FIELD_TOO_LONG('Content', 1000));

/// Endpoint complex validations
// Get conversation by id
export const conversationIdParamsSchema = z.object({
  cid: conversationIdBaseSchema,
});

// Get conversation messages
export const conversationIdMessagesParamsSchema = z.object({
  cid: conversationIdBaseSchema,
});

export const conversationMessagesQuerySchema = z.object({
  cursor: z.coerce
    .number(messages.GENERAL.FIELD_NUMBER('Message cursor'))
    .int(messages.GENERAL.FIELD_INTEGER('Message cursor'))
    .positive(messages.GENERAL.FIELD_POSITIVE('Message cursor'))
    .optional(),
  limit: limitBaseSchema,
});

// Create private conversation
export const privateConversationSchema = z.object({
  otherUserId: uidBaseSchema,
});

// Create message
export const createMessageParamsSchema = z.object({
  cid: conversationIdBaseSchema,
});

export const createMessageBodySchema = z.object({
  content: messageContentBaseSchema.optional().default(''),
});

export const createMessageFileSchema = z.object({
  photo: z
    .object({
      size: z
        .number()
        .max(
          consts.CONVERSATION.PHOTOS.MAX_FILE_SIZE,
          messages.CONVERSATION.CREATE_MESSAGE.PHOTO_TOO_BIG,
        ),
      mimetype: z.refine(
        (type) =>
          consts.CONVERSATION.PHOTOS.ACCEPTED_IMAGE_TYPES.includes(type),
        messages.CONVERSATION.CREATE_MESSAGE.PHOTO_INVALID_TYPE,
      ),
    })
    .passthrough()
    .optional(),
});
