import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';

// Server and client sign up shared validation
export const publishMissionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, messages.FIELD_REQUIRED)
    .max(
      consts.MISSION.TITLE_MAX_LENGTH,
      messages.FIELD_TOO_LONG('Title', consts.MISSION.TITLE_MAX_LENGTH),
    ),
  description: z
    .string()
    .trim()
    .min(1, messages.FIELD_REQUIRED)
    .max(
      consts.MISSION.DESCRIPTION_MAX_LENGTH,
      messages.FIELD_TOO_LONG(
        'Description',
        consts.MISSION.DESCRIPTION_MAX_LENGTH,
      ),
    ),
  vacancies: z.coerce
    .number(messages.FIELD_NUMBER('Vacancies'))
    .int(messages.FIELD_INTEGER('Vacancies'))
    .min(
      consts.MISSION.VACANCIES.MIN,
      messages.FIELD_TOO_SMALL('Vacancies', consts.MISSION.VACANCIES.MIN),
    )
    .max(
      consts.MISSION.VACANCIES.MAX,
      messages.FIELD_TOO_BIG('Vacancies', consts.MISSION.VACANCIES.MAX),
    ),
  reward: z.coerce
    .number(messages.FIELD_NUMBER('Reward'))
    .int(messages.FIELD_INTEGER('Reward'))
    .min(
      consts.MISSION.REWARD.MIN,
      messages.FIELD_TOO_SMALL('Reward', consts.MISSION.REWARD.MIN),
    )
    .max(
      consts.MISSION.REWARD.MAX,
      messages.FIELD_TOO_BIG('Reward', consts.MISSION.REWARD.MAX),
    ),
  difficulty: z.coerce
    .number(messages.FIELD_NUMBER('Difficulty'))
    .int(messages.FIELD_INTEGER('Difficulty'))
    .min(
      consts.MISSION.DIFFICULTY.MIN,
      messages.FIELD_TOO_SMALL('Difficulty', consts.MISSION.DIFFICULTY.MIN),
    )
    .max(
      consts.MISSION.DIFFICULTY.MAX,
      messages.FIELD_TOO_BIG('Difficulty', consts.MISSION.DIFFICULTY.MAX),
    ),
  isDraft: z.boolean().optional(),
});

const optionalNumberFromFormSchema = (schema) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    return value;
  }, schema.optional());

// Server and client sign up shared validation
export const draftMissionSchema = z.object({
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  vacancies: optionalNumberFromFormSchema(z.coerce.number().int()),
  reward: optionalNumberFromFormSchema(z.coerce.number()),
  difficulty: optionalNumberFromFormSchema(z.coerce.number()),
  isDraft: z.boolean().optional(),
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

// Backend endpoint getMissions
export const getMissionsQuerySchema = z.object({
  page: z.coerce
    .number(messages.FIELD_NUMBER('Page'))
    .int(messages.FIELD_INTEGER('Page'))
    .min(0, messages.FIELD_POSITIVE('Page'))
    .optional(),
  limit: z.coerce
    .number(messages.FIELD_NUMBER('Limit'))
    .int(messages.FIELD_INTEGER('Limit'))
    .min(0, messages.FIELD_POSITIVE('Limit'))
    .optional(),
  title: z
    .string()
    .trim()
    .max(
      consts.SEARCH_MISSION_TITLE_MAX_LENGTH,
      messages.FIELD_TOO_LONG('Title'),
    )
    .min(1, messages.FIELD_REQUIRED)
    .optional(),
});

export const searchMissionByTitleSchema = z.object({
  searchMissionByTitle_input: z
    .string()
    .trim()
    .min(1, messages.FIELD_REQUIRED)
    .max(
      consts.SEARCH_MISSION_TITLE_MAX_LENGTH,
      messages.FIELD_TOO_LONG('Input'),
    ),
});

export const joinMissionSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Id'))
    .int(messages.FIELD_INTEGER('Id'))
    .min(0, messages.FIELD_POSITIVE('Id')),
});

export const closeMissionSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Id'))
    .int(messages.FIELD_INTEGER('Id'))
    .min(0, messages.FIELD_POSITIVE('Id')),
});
