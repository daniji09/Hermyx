import { z } from 'zod';

export const privateConversationSchema = z.object({
  otherUserId: z.coerce.number().int().positive(),
});

export const conversationIdParamsSchema = z.object({
  conversationId: z.coerce.number().int().positive(),
});

export const createMessageSchema = z.object({
  content: z.string().trim().min(1).max(1000),
});
