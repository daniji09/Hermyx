import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { midBaseSchema } from './service.validation.js';

/// Base validations, raw logic
const paymentMethodIdBaseSchema = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Payment method id'));

const paymentIntentIdBaseSchema = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Payment method id'));

/// Endpoint complex validation
// Set a default card
export const setDefaultCardSchema = z.object({
  paymentMethodId: paymentMethodIdBaseSchema,
});

// Delete a card
export const deleteCardParamSchema = z.object({
  paymentMethodId: paymentMethodIdBaseSchema,
});

// Pay with the default card
export const payDefaultParamSchema = z.object({
  mid: midBaseSchema,
});

// Pay with new card
export const payNewParamSchema = z.object({
  mid: midBaseSchema,
});

export const payNewBodySchema = z.object({
  saveCard: z.boolean().optional(),
});

// Confirm payment
export const confirmPaymentParamSchema = z.object({
  mid: midBaseSchema,
});

export const confirmPaymentBodySchema = z.object({
  paymentIntentId: paymentIntentIdBaseSchema,
});
