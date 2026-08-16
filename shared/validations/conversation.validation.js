import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { uidBaseSchema } from './user.validation.js';

/// Base validations, raw logic
export const conversationIdBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Conversation id'))
  .int(messages.GENERAL.FIELD_INTEGER('Conversation id'))
  .positive(messages.GENERAL.FIELD_POSITIVE('Conversation id'));

export const messageContentBaseSchema = z
  .string()
  .trim()
  .max(1000, messages.GENERAL.FIELD_TOO_LONG('Content', 1000));

export const privateConversationSchema = z.object({
  otherUserId: uidBaseSchema,
});

/// Endpoint complex validations
// Get conversation by id
export const conversationIdParamsSchema = z.object({
  cid: conversationIdBaseSchema,
});

// Get conversation messages
export const conversationIdMessagesParamsSchema = z.object({
  cid: conversationIdBaseSchema,
});

export const createMessageSchema = z.object({
  content: messageContentBaseSchema.optional().default(''),
});

export const createMessageFileSchema = z.object({
  photo: z
    .object({
      size: z
        .number()
        .max(
          consts.MISSION.PHOTOS.MAX_FILE_SIZE,
          messages.MISSION_PHOTO_TOO_BIG,
        ),
      mimetype: z.refine(
        (type) => consts.MISSION.PHOTOS.ACCEPTED_IMAGE_TYPES.includes(type),
        messages.MISSION_PHOTO_INVALID_TYPE,
      ),
    })
    .passthrough()
    .optional(),
});
