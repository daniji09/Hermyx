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
    consts.SERVICE.TITLE.MAX_LENGTH,
    messages.GENERAL.FIELD_TOO_LONG('Title', consts.SERVICE.TITLE.MAX_LENGTH),
  )
  .min(1, messages.GENERAL.FIELD_REQUIRED('Title'));

// Description
const descriptionBaseSchema = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Description'))
  .max(
    consts.SERVICE.DESCRIPTION.MAX_LENGTH,
    messages.GENERAL.FIELD_TOO_LONG(
      'Description',
      consts.SERVICE.DESCRIPTION.MAX_LENGTH,
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
            consts.SERVICE.PHOTOS.MAX_FILE_SIZE,
            messages.SERVICE.PUBLISH.SERVICE_PHOTO_TOO_BIG,
          ),
        mimetype: z.refine(
          (type) => consts.SERVICE.PHOTOS.ACCEPTED_IMAGE_TYPES.includes(type),
          messages.SERVICE.PUBLISH.SERVICE_PHOTO_INVALID_TYPE,
        ),
      })
      .passthrough(), // Passthrough lets the validation check the fields, but leaves the rest on the object, even if those are not validated,
  )
  .max(
    consts.SERVICE.PHOTOS.MAX,
    messages.GENERAL.FIELD_TOO_BIG('Photos', consts.SERVICE.PHOTOS.MAX),
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
      consts.SERVICE.REWARD.MIN,
      messages.GENERAL.FIELD_TOO_SMALL('Reward', consts.SERVICE.REWARD.MIN),
    )
    .max(
      consts.SERVICE.REWARD.MAX,
      messages.GENERAL.FIELD_TOO_BIG('Reward', consts.SERVICE.REWARD.MAX),
    ),
  title: z
    .string()
    .trim()
    .max(
      consts.SERVICE.VACANCIES.TITLE_MAX_LENGTH,
      messages.GENERAL.FIELD_TOO_LONG(
        'Title',
        consts.SERVICE.VACANCIES.TITLE_MAX_LENGTH,
      ),
    )
    .nullable()
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .trim()
    .max(
      consts.SERVICE.VACANCIES.DESCRIPTION_MAX_LENGTH,
      messages.GENERAL.FIELD_TOO_LONG(
        'Description',
        consts.SERVICE.VACANCIES.DESCRIPTION_MAX_LENGTH,
      ),
    )
    .nullable()
    .optional()
    .or(z.literal('')),
  status: z
    .string()
    .trim()
    .max(
      consts.SERVICE.VACANCIES.STATUS_MAX_LENGTH,
      messages.GENERAL.FIELD_TOO_LONG(
        'Status',
        consts.SERVICE.VACANCIES.STATUS_MAX_LENGTH,
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
    consts.SERVICE.VACANCIES.MIN,
    messages.GENERAL.FIELD_TOO_SMALL('Vacancies', consts.SERVICE.VACANCIES.MIN),
  )
  .max(
    consts.SERVICE.VACANCIES.MAX,
    messages.GENERAL.FIELD_TOO_BIG('Vacancies', consts.SERVICE.VACANCIES.MAX),
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
  message: messages.SERVICE.TYPE.INVALID_SERVICE_TYPE,
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

// Report id
export const reportIdBaseSchema = z.coerce
  .number(messages.GENERAL.FIELD_NUMBER('Report id'))
  .int(messages.GENERAL.FIELD_INTEGER('Report id'))
  .min(0, messages.GENERAL.FIELD_POSITIVE('Report id'));

// Report reason
export const reportReasonBaseSchema = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Reason'))
  .max(
    consts.REPORT.REASON_MESSAGE.MAX,
    messages.GENERAL.FIELD_TOO_LONG('Reason', consts.REPORT.REASON_MESSAGE.MAX),
  );

/// Endpoint complex validation
// Get all services
export const getMissionsQuerySchema = z.object({
  page: pageBaseSchema,
  limit: limitBaseSchema,
  title: titleBaseSchema.optional(),
});

// Get all opened services
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
      message: messages.SERVICE.GET_ALL.MIN_PAYMENT_GREATER_MAX_PAYMENT,
      path: ['minPayment'],
    },
  );

// Get service by mid
export const getMissionSchema = z.object({
  mid: midBaseSchema,
});

// Get service payment information
export const getMissionPaymentInfoSchema = z.object({
  mid: midBaseSchema,
});

// Publish service
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

// Close service
export const closeMissionParamSchema = z.object({
  mid: midBaseSchema,
});

// Join service
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

// Unjoin service
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

// Cancel service
export const cancelMissionParamSchema = z.object({
  mid: midBaseSchema,
});

// Reopen service
export const reopenMissionParamSchema = z.object({
  mid: midBaseSchema,
});

// Finish service
export const finishMissionParamSchema = z.object({
  mid: midBaseSchema,
});

// Ban service
export const banMissionParamsSchema = z.object({
  mid: midBaseSchema,
});

export const banMissionBodySchema = z.object({
  rid: reportIdBaseSchema,
  reason: reportReasonBaseSchema,
});

// Kick collaborator out
export const kickAdventurerOutParamsSchema = z.object({
  mid: midBaseSchema,
  vacancyId: vacancyIdBaseSchema,
});

export const kickAdventurerOutBodySchema = z.object({
  rid: reportIdBaseSchema,
  reason: reportReasonBaseSchema,
});

// Edit service
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

/// Frontend exclusive schemas
// Search service by title
export const searchMissionByTitleSchema = z.object({
  searchMissionByTitle_input: z
    .string()
    .trim()
    .min(1, messages.GENERAL.FIELD_REQUIRED('Title'))
    .max(
      consts.SERVICE.TITLE.MAX_LENGTH,
      messages.GENERAL.FIELD_TOO_LONG('Input'),
    ),
});

// Add vacancies schema
export const addVacanciesSchema = z
  .object({
    vacanciesQuantity: z.coerce
      .number(messages.GENERAL.FIELD_NUMBER('Quantity'))
      .int(messages.GENERAL.FIELD_INTEGER('Quantity'))
      .min(
        consts.SERVICE.VACANCIES.MIN,
        messages.GENERAL.FIELD_TOO_SMALL(
          'Quantity',
          consts.SERVICE.VACANCIES.MIN,
        ),
      )
      .max(
        consts.SERVICE.VACANCIES.MAX,
        messages.GENERAL.FIELD_TOO_BIG(
          'Quantity',
          consts.SERVICE.VACANCIES.MAX,
        ),
      ),
    vacanciesTotalQuantity: z.coerce
      .number(messages.GENERAL.FIELD_NUMBER('Total quantity'))
      .int(messages.GENERAL.FIELD_INTEGER('Total quantity')),
    vacanciesReward: z.coerce
      .number(messages.GENERAL.FIELD_NUMBER('Reward'))
      .min(
        consts.SERVICE.REWARD.MIN,
        messages.GENERAL.FIELD_TOO_SMALL('Reward', consts.SERVICE.REWARD.MIN),
      )
      .max(
        consts.SERVICE.REWARD.MAX,
        messages.GENERAL.FIELD_TOO_BIG('Reward', consts.SERVICE.REWARD.MAX),
      ),
    vacanciesTitle: z
      .string()
      .trim()
      .max(
        consts.SERVICE.VACANCIES.TITLE_MAX_LENGTH,
        messages.GENERAL.FIELD_TOO_LONG(
          'Title',
          consts.SERVICE.VACANCIES.TITLE_MAX_LENGTH,
        ),
      )
      .optional(),
    vacanciesDescription: z
      .string()
      .trim()
      .max(
        consts.SERVICE.VACANCIES.DESCRIPTION_MAX_LENGTH,
        messages.GENERAL.FIELD_TOO_LONG(
          'Description',
          consts.SERVICE.VACANCIES.DESCRIPTION_MAX_LENGTH,
        ),
      )
      .optional(),
  })
  .refine((val) => val.vacanciesQuantity + val.vacanciesTotalQuantity <= 100, {
    message: messages.SERVICE.PUBLISH.SERVICE_VACANCIES_SURPASSED,
    path: ['vacanciesQuantity'],
  });

// Edit vacancy
export const editVacancySchema = z.object({
  vacanciesReward: z.coerce
    .number(messages.GENERAL.FIELD_NUMBER('Reward'))
    .min(
      consts.SERVICE.REWARD.MIN,
      messages.GENERAL.FIELD_TOO_SMALL('Reward', consts.SERVICE.REWARD.MIN),
    )
    .max(
      consts.SERVICE.REWARD.MAX,
      messages.GENERAL.FIELD_TOO_BIG('Reward', consts.SERVICE.REWARD.MAX),
    ),
  vacanciesTitle: z
    .string()
    .trim()
    .max(
      consts.SERVICE.VACANCIES.TITLE_MAX_LENGTH,
      messages.GENERAL.FIELD_TOO_LONG(
        'Title',
        consts.SERVICE.VACANCIES.TITLE_MAX_LENGTH,
      ),
    )
    .optional()
    .or(z.literal('')),
  vacanciesDescription: z
    .string()
    .trim()
    .max(
      consts.SERVICE.VACANCIES.DESCRIPTION_MAX_LENGTH,
      messages.GENERAL.FIELD_TOO_LONG(
        'Description',
        consts.SERVICE.VACANCIES.DESCRIPTION_MAX_LENGTH,
      ),
    )
    .optional()
    .or(z.literal('')),
});
