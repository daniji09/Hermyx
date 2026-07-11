import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';

const vacancySchema = z.object({
  id: z.union([
    z.string().min(1, messages.FIELD_REQUIRED),
    z.number().min(1, messages.FIELD_REQUIRED),
  ]),
  reward: z.coerce
    .number(messages.FIELD_NUMBER('Reward'))
    .min(
      consts.MISSION.REWARD.MIN,
      messages.FIELD_TOO_SMALL('Reward', consts.MISSION.REWARD.MIN),
    )
    .max(
      consts.MISSION.REWARD.MAX,
      messages.FIELD_TOO_BIG('Reward', consts.MISSION.REWARD.MAX),
    ),
  title: z
    .string()
    .trim()

    .max(
      consts.MISSION.VACANCIES.TITLE_MAX_LENGTH,
      messages.FIELD_TOO_LONG(
        'Title',
        consts.MISSION.VACANCIES.TITLE_MAX_LENGTH,
      ),
    )
    .nullable()
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .max(
      consts.MISSION.VACANCIES.DESCRIPTION_MAX_LENGTH,
      messages.FIELD_TOO_LONG(
        'Description',
        consts.MISSION.VACANCIES.DESCRIPTION_MAX_LENGTH,
      ),
    )
    .nullable()
    .optional()
    .or(z.literal('')),
});

// Server and client publish mission shared validation
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
  vacanciesData: z
    .string()
    .transform((str, ctx) => {
      try {
        return JSON.parse(str);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vacancy format is corrupt: ' + error,
        });
        return z.NEVER;
      }
    })
    .pipe(
      z.array(vacancySchema).max(100, messages.FIELD_TOO_BIG('Vacancies', 100)),
    ),
  isDraft: z.boolean().optional(),
  latitude: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional(),
  ),
  longitude: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional(),
  ),
});

// Server and client edit mission shared validation
export const editMissionBodySchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Id'))
    .int(messages.FIELD_INTEGER('Id'))
    .min(0, messages.FIELD_POSITIVE('Id')),
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
  vacanciesData: z
    .string()
    .transform((str, ctx) => {
      try {
        return JSON.parse(str);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vacancy format is corrupt: ' + error,
        });
        return z.NEVER;
      }
    })
    .pipe(
      z.array(vacancySchema).max(100, messages.FIELD_TOO_BIG('Vacancies', 100)),
    ),
  latitude: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional(),
  ),
  longitude: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number().optional(),
  ),
});

export const editMissionParamSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Mid'))
    .int(messages.FIELD_INTEGER('Mid'))
    .min(0, messages.FIELD_POSITIVE('Mid')),
});

const optionalNumberFromFormSchema = (schema) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    return value;
  }, schema.optional());

export const cancelMissionParamSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Mid'))
    .int(messages.FIELD_INTEGER('Mid'))
    .min(0, messages.FIELD_POSITIVE('Mid')),
});

export const reopenMissionParamSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Mid'))
    .int(messages.FIELD_INTEGER('Mid'))
    .min(0, messages.FIELD_POSITIVE('Mid')),
});

// Server and client sign up shared validation
export const draftMissionSchema = z.object({
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  vacancies: optionalNumberFromFormSchema(z.coerce.number().int()),
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

export const joinMissionParamSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Mid'))
    .int(messages.FIELD_INTEGER('Mid'))
    .min(0, messages.FIELD_POSITIVE('Mid')),
});

export const joinMissionBodySchema = z.object({
  vacancyId: z.coerce
    .number(messages.FIELD_NUMBER('Vacancy id'))
    .int(messages.FIELD_INTEGER('Vacancy id'))
    .min(0, messages.FIELD_POSITIVE('Vacancy id')),
});

export const unjoinMissionParamSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Mid'))
    .int(messages.FIELD_INTEGER('Mid'))
    .min(0, messages.FIELD_POSITIVE('Mid')),
});

export const unjoinMissionBodySchema = z.object({
  vacancyId: z.coerce
    .number(messages.FIELD_NUMBER('Vacancy id'))
    .int(messages.FIELD_INTEGER('Vacancy id'))
    .min(0, messages.FIELD_POSITIVE('Vacancy id')),
});

export const submitMissionParticipationSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Id'))
    .int(messages.FIELD_INTEGER('Id'))
    .min(0, messages.FIELD_POSITIVE('Id')),
});

export const addVacanciesSchema = z
  .object({
    vacanciesQuantity: z.coerce
      .number(messages.FIELD_NUMBER('Quantity'))
      .int(messages.FIELD_INTEGER('Quantity'))
      .min(
        consts.MISSION.VACANCIES.MIN,
        messages.FIELD_TOO_SMALL('Quantity', consts.MISSION.VACANCIES.MIN),
      )
      .max(
        consts.MISSION.VACANCIES.MAX,
        messages.FIELD_TOO_BIG('Quantity', consts.MISSION.VACANCIES.MAX),
      ),
    vacanciesTotalQuantity: z.coerce
      .number(messages.FIELD_NUMBER('Total quantity'))
      .int(messages.FIELD_INTEGER('Total quantity')),
    vacanciesReward: z.coerce
      .number(messages.FIELD_NUMBER('Reward'))
      .min(
        consts.MISSION.REWARD.MIN,
        messages.FIELD_TOO_SMALL('Reward', consts.MISSION.REWARD.MIN),
      )
      .max(
        consts.MISSION.REWARD.MAX,
        messages.FIELD_TOO_BIG('Reward', consts.MISSION.REWARD.MAX),
      ),
    vacanciesTitle: z
      .string()
      .trim()
      .max(
        consts.MISSION.VACANCIES.TITLE_MAX_LENGTH,
        messages.FIELD_TOO_LONG(
          'Title',
          consts.MISSION.VACANCIES.TITLE_MAX_LENGTH,
        ),
      )
      .optional(),
    vacanciesDescription: z
      .string()
      .trim()
      .max(
        consts.MISSION.VACANCIES.DESCRIPTION_MAX_LENGTH,
        messages.FIELD_TOO_LONG(
          'Description',
          consts.MISSION.VACANCIES.DESCRIPTION_MAX_LENGTH,
        ),
      )
      .optional(),
  })
  .refine((val) => val.vacanciesQuantity + val.vacanciesTotalQuantity <= 100, {
    message: messages.MISSION_VACANCIES_SURPASSED,
    path: ['vacanciesQuantity'],
  });

export const editVacancySchema = z.object({
  vacanciesReward: z.coerce
    .number(messages.FIELD_NUMBER('Reward'))
    .min(
      consts.MISSION.REWARD.MIN,
      messages.FIELD_TOO_SMALL('Reward', consts.MISSION.REWARD.MIN),
    )
    .max(
      consts.MISSION.REWARD.MAX,
      messages.FIELD_TOO_BIG('Reward', consts.MISSION.REWARD.MAX),
    ),
  vacanciesTitle: z
    .string()
    .trim()
    .max(
      consts.MISSION.VACANCIES.TITLE_MAX_LENGTH,
      messages.FIELD_TOO_LONG(
        'Title',
        consts.MISSION.VACANCIES.TITLE_MAX_LENGTH,
      ),
    )
    .optional()
    .or(z.literal('')),
  vacanciesDescription: z
    .string()
    .trim()
    .max(
      consts.MISSION.VACANCIES.DESCRIPTION_MAX_LENGTH,
      messages.FIELD_TOO_LONG(
        'Description',
        consts.MISSION.VACANCIES.DESCRIPTION_MAX_LENGTH,
      ),
    )
    .optional()
    .or(z.literal('')),
});
