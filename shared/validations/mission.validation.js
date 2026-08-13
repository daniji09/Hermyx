import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { limitBaseSchema, pageBaseSchema } from './pagination.validation.js';

/// Base validations, raw logic
// Decimal query
const decimalQueryNumberSchema = (fieldName) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'string') {
        const trimmedValue = value.trim();
        if (trimmedValue === '') return undefined;
        return trimmedValue.replace(',', '.');
      }
      return value;
    },
    z.coerce
      .number(messages.GENERAL.FIELD_NUMBER(fieldName))
      .min(0, messages.GENERAL.FIELD_POSITIVE(fieldName))
      .optional(),
  );

// Mid
export const midBaseSchema = z.coerce
  .number({
    invalid_type_error: 'Mission id must be a number.',
  })
  .int('Mission id must be an integer.')
  .min(0, 'Mission id be positive.');

// Title
const titleBaseSchema = z
  .string()
  .trim()
  .max(
    consts.MISSION.TITLE.MAX_LENGTH,
    messages.GENERAL.FIELD_TOO_LONG('Title', consts.MISSION.TITLE.MAX_LENGTH),
  )
  .min(1, messages.GENERAL.FIELD_REQUIRED('Title'));

// Description
const descriptionBaseSchema = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Description'))
  .max(
    consts.MISSION.DESCRIPTION.MAX_LENGTH,
    messages.GENERAL.FIELD_TOO_LONG(
      'Description',
      consts.MISSION.DESCRIPTION.MAX_LENGTH,
    ),
  );

// Photos
const photosBaseSchema = z
  .array(
    z
      .object({
        size: z
          .number()
          .max(
            consts.MISSION.PHOTOS.MAX_FILE_SIZE,
            messages.MISSION.PUBLISH.MISSION_PHOTO_TOO_BIG,
          ),
        mimetype: z.refine(
          (type) => consts.MISSION.PHOTOS.ACCEPTED_IMAGE_TYPES.includes(type),
          messages.MISSION.PUBLISH.MISSION_PHOTO_INVALID_TYPE,
        ),
      })
      .passthrough(), // Passthrough lets the validation check the fields, but leaves the rest on the object, even if those are not validated,
  )
  .max(
    consts.MISSION.PHOTOS.MAX,
    messages.FIELD_TOO_BIG('Photos', consts.MISSION.PHOTOS.MAX),
  )
  .optional()
  .default([]);

// Vacancy
const vacancySchema = z.object({
  id: z.union([
    z.string().min(1, messages.GENERAL.FIELD_REQUIRED('Vacancy id')),
    z.number().min(1, messages.GENERAL.FIELD_REQUIRED('Vacancy id')),
  ]),
  reward: z.coerce
    .number(messages.GENERAL.FIELD_NUMBER('Reward'))
    .min(
      consts.MISSION.REWARD.MIN,
      messages.GENERAL.FIELD_TOO_SMALL('Reward', consts.MISSION.REWARD.MIN),
    )
    .max(
      consts.MISSION.REWARD.MAX,
      messages.GENERAL.FIELD_TOO_BIG('Reward', consts.MISSION.REWARD.MAX),
    ),
  title: z
    .string()
    .trim()
    .max(
      consts.MISSION.VACANCIES.TITLE_MAX_LENGTH,
      messages.GENERAL.FIELD_TOO_LONG(
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
      messages.GENERAL.FIELD_TOO_LONG(
        'Description',
        consts.MISSION.VACANCIES.DESCRIPTION_MAX_LENGTH,
      ),
    )
    .nullable()
    .optional()
    .or(z.literal('')),
  status: z
    .string()
    .trim()
    .max(
      consts.MISSION.VACANCIES.STATUS_MAX_LENGTH,
      messages.GENERAL.FIELD_TOO_LONG(
        'Status',
        consts.MISSION.VACANCIES.STATUS_MAX_LENGTH,
      ),
    )
    .nullable()
    .optional()
    .or(z.literal('')),
});

const vacanciesDataSchema = z
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
    z
      .array(vacancySchema)
      .max(100, messages.GENERAL.FIELD_TOO_BIG('Vacancies', 100)),
  );

// Vacancy id
const vacancyIdBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Vacancy id'))
  .int(messages.GENERAL.FIELD_INTEGER('Vacancy id'))
  .min(0, messages.GENERAL.FIELD_POSITIVE('Vacancy id'));

// Vacancies (num of vacancies)
const vacancyNumBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Vacancies'))
  .int(messages.GENERAL.FIELD_INTEGER('Vacancies'))
  .min(
    consts.MISSION.VACANCIES.MIN,
    messages.GENERAL.FIELD_TOO_SMALL('Vacancies', consts.MISSION.VACANCIES.MIN),
  )
  .max(
    consts.MISSION.VACANCIES.MAX,
    messages.GENERAL.FIELD_TOO_BIG('Vacancies', consts.MISSION.VACANCIES.MAX),
  );

// Latitude
const latitudeBaseSchema = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.coerce.number().optional(),
);

// Longitude
const longitudeBaseSchema = z.preprocess(
  (val) => (val === '' || val === null ? undefined : val),
  z.coerce.number().optional(),
);

// Type (published or joined)
export const typeBaseSchema = z.enum(['published', 'joined'], {
  message: messages.MISSION.TYPE.INVALID_MISSION_TYPE,
});

// Notification message
export const messageBaseSchema = z
  .string()
  .trim()
  .max(
    consts.NOTIFICATION.MESSAGE.MAX_LENGTH,
    messages.GENERAL.FIELD_TOO_LONG(
      'Notification message',
      consts.NOTIFICATION.MESSAGE.MAX_LENGTH,
    ),
  )
  .optional()
  .default('');

/// Endpoint complex validation
// Get all missions
export const getMissionsQuerySchema = z.object({
  page: pageBaseSchema,
  limit: limitBaseSchema,
  title: titleBaseSchema.optional(),
});

// Get all opened missions
export const getOpenedMissionsQuerySchema = z
  .object({
    page: pageBaseSchema,
    limit: limitBaseSchema,
    title: titleBaseSchema.optional(),
    minPayment: decimalQueryNumberSchema('Min payment'),
    maxPayment: decimalQueryNumberSchema('Max payment'),
    maxDistanceKm: decimalQueryNumberSchema('Max distance'),
  })
  .refine(
    (data) =>
      data.minPayment === undefined ||
      data.maxPayment === undefined ||
      data.minPayment <= data.maxPayment,
    {
      message: messages.MISSION.GET_ALL.MIN_PAYMENT_GREATER_MAX_PAYMENT,
      path: ['minPayment'],
    },
  );

// Get mission by mid
export const getMissionSchema = z.object({
  mid: midBaseSchema,
});

// Publish mission
export const publishMissionSchema = z.object({
  title: titleBaseSchema,
  description: descriptionBaseSchema,
  photos: photosBaseSchema,
  vacancies: vacancyNumBaseSchema,
  vacanciesData: vacanciesDataSchema,
  latitude: latitudeBaseSchema,
  longitude: longitudeBaseSchema,
});

export const publishMissionFilesSchema = z.object({
  photos: photosBaseSchema,
});

// Edit mission
export const editMissionBodySchema = z.object({
  mid: midBaseSchema,
  title: titleBaseSchema,
  description: descriptionBaseSchema,
  vacancies: vacancyNumBaseSchema,
  vacanciesData: vacanciesDataSchema,
  latitude: latitudeBaseSchema,
  longitude: longitudeBaseSchema,
  photos: photosBaseSchema,
  existingPhotos: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return [];
      return Array.isArray(val) ? val : [val];
    }),
});

export const editMissionParamSchema = z.object({
  mid: midBaseSchema,
});

export const editMissionFilesSchema = z.object({
  photos: photosBaseSchema,
  existingPhotos: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return [];
      return Array.isArray(val) ? val : [val];
    }),
});

// Close mission
export const closeMissionParamSchema = z.object({
  mid: midBaseSchema,
});

// Join mission
export const joinMissionParamSchema = z.object({
  mid: midBaseSchema,
});

export const joinMissionBodySchema = z.object({
  vacancyId: vacancyIdBaseSchema,
  message: messageBaseSchema,
});

// Invite
export const inviteToMissionParamSchema = z.object({
  mid: midBaseSchema,
});

export const inviteToMissionBodySchema = z.object({
  receiverId: z.coerce
    .number(messages.GENERAL.FIELD_NUMBER('Receiver id'))
    .int(messages.GENERAL.FIELD_INTEGER('Receiver id'))
    .min(0, messages.GENERAL.FIELD_POSITIVE('Receiver id')),
  vacancyId: vacancyIdBaseSchema,
  message: messageBaseSchema,
});

// Unjoin mission
export const unjoinMissionParamSchema = z.object({
  mid: midBaseSchema,
});

export const unjoinMissionBodySchema = z.object({
  vacancyId: vacancyIdBaseSchema,
});

// Submit participation
export const submitMissionParticipationSchema = z.object({
  mid: midBaseSchema,
});

// ------

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

export const finishMissionParamSchema = z.object({
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

export const banMissionParamsSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Mid'))
    .int(messages.FIELD_INTEGER('Mid'))
    .min(0, messages.FIELD_POSITIVE('Mid')),
});

export const banMissionBodySchema = z.object({
  rid: z.coerce
    .number(messages.FIELD_NUMBER('Rid'))
    .int(messages.FIELD_INTEGER('Rid'))
    .min(0, messages.FIELD_POSITIVE('Rid')),
  reason: z
    .string()
    .trim()
    .min(1, messages.FIELD_REQUIRED)
    .max(
      consts.REPORT.REASON_MESSAGE.MAX,
      messages.FIELD_TOO_LONG('Reason', consts.REPORT.REASON_MESSAGE.MAX),
    )
    .default(''),
});

export const kickAdventurerOutParamsSchema = z.object({
  mid: z.coerce
    .number(messages.FIELD_NUMBER('Mid'))
    .int(messages.FIELD_INTEGER('Mid'))
    .min(0, messages.FIELD_POSITIVE('Mid')),
  vacancyId: z.coerce
    .number(messages.FIELD_NUMBER('Vacancy id'))
    .int(messages.FIELD_INTEGER('Vacancy id'))
    .min(0, messages.FIELD_POSITIVE('Vacancy id')),
});

export const kickAdventurerOutBodySchema = z.object({
  rid: z.coerce
    .number(messages.FIELD_NUMBER('Rid'))
    .int(messages.FIELD_INTEGER('Rid'))
    .min(0, messages.FIELD_POSITIVE('Rid')),
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
