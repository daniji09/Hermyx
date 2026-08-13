import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { midBaseSchema } from './mission.validation.js';

/// Base validations, raw logic
const paymentMethodIdSchema = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Payment method id'));

/// Endpoint complex validation
// Set a default card
export const setDefaultCardSchema = z.object({
  paymentMethodId: paymentMethodIdSchema,
});

// Delete a card
export const deleteCardParamSchema = z.object({
  paymentMethodId: paymentMethodIdSchema,
});

// Pay with the default card
export const payDefaultBodySchema = z.object({
  mid: midBaseSchema,
});

// Pay with new card
export const payNewBodySchema = z.object({
  mid: midBaseSchema,
  saveCard: z.boolean().optional(),
});
