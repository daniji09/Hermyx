import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';

export const privateConversationSchema = z.object({
  otherUserId: z.coerce.number().int().positive(),
});

export const conversationIdParamsSchema = z.object({
  conversationId: z.coerce.number().int().positive(),
});

export const createMessageSchema = z.object({
  content: z.string().trim().max(1000).optional().default(''),
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
