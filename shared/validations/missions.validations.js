import { z } from 'zod';
import { messages } from '../messages/messages.js';

// Server and client sign up shared validation
const basePublishSchema = z.object({
  title: z.string().trim().min(1, messages.FIELD_REQUIRED),
  description: z.string().trim().min(1, messages.FIELD_REQUIRED),
  vacancies: z.coerce
    .number({ invalid_type_error: 'Must be a valid number' })
    .int('Vacancies must be an integer')
    .min(1, 'There must be at least 1 vacancy'),
  reward: z.coerce
    .number({ invalid_type_error: 'Must be a valid number' })
    .min(1, 'Price must be greater than 0'),
  difficulty: z.coerce
    .number({ invalid_type_error: 'Must be a valid number' })
    .min(1, 'Price must be greater than 0'),
});

// Server and client sign up shared validation
const baseDraftSchema = z.object({
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  vacancies: z.coerce.number().int().optional(),
  reward: z.coerce.number().optional(),
  difficulty: z.coerce.number().optional(),
});

// Server get mission validation
export const getMissionSchema = z.object({
  id: z.coerce
    .number({
      invalid_type_error: 'Mission id must be a number.',
    })
    .int('Mission id must be an integer.')
    .min(0, 'Mission id be positive.'),
});

// Client variant
export const publishMissionClientSchema = basePublishSchema;
export const draftMissionClientSchema = baseDraftSchema;

// Server variant
export const publishMissionServerSchema = basePublishSchema.extend({});
export const draftMissionServerSchema = baseDraftSchema.extend({});
