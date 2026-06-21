import { z } from 'zod';
import { messages } from '../messages/messages.js';

const paymentMethodIdSchema = z.string().trim().min(1, messages.FIELD_REQUIRED);

export const setDefaultCardSchema = z.object({
  paymentMethodId: paymentMethodIdSchema,
});

export const deleteCardParamSchema = z.object({
  paymentMethodId: paymentMethodIdSchema,
});
