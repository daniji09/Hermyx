import { z } from 'zod';
import { messages } from '../messages/messages.js';

const paymentMethodIdSchema = z.string().trim().min(1, messages.FIELD_REQUIRED);

export const setDefaultCardSchema = z.object({
  paymentMethodId: paymentMethodIdSchema,
});

export const deleteCardParamSchema = z.object({
  paymentMethodId: paymentMethodIdSchema,
});

export const payNewBodySchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Mid'))
    .int(messages.FIELD_INTEGER('Mid'))
    .min(0, messages.FIELD_POSITIVE('Mid')),
  saveCard: z.boolean().optional(),
});
