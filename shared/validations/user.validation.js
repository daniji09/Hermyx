import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { regex } from '../regex/regex.js';
import { limitBaseSchema, pageBaseSchema } from './pagination.validation.js';
import { requireBothOrNeither } from './helper.validation.js';
import { typeBaseSchema } from './mission.validation.js';

/// Base validations, raw logic
// Uid
export const uidBaseSchema = z.coerce
  .number(messages.FIELD_NUMBER('Uid'))
  .int(messages.FIELD_INTEGER('Uid'))
  .min(0, messages.FIELD_POSITIVE('Uid'));

// Username
export const usernameBaseSchema = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Username'))
  .max(
    consts.USER.USERNAME.MAX_LENGTH,
    messages.FIELD_TOO_LONG('Username', consts.USER.USERNAME.MAX_LENGTH),
  )
  .regex(regex.USER.USERNAME, messages.USER.USERNAME.INVALID_CHARACTERS);

// Email
export const emailBaseSchema = z
  .email(messages.GENERAL.FIELD_NOT_VALID('email'))
  .trim()
  .toLowerCase();

// Password
export const passwordBaseSchema = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Password'));

// FirebaseUid
export const firebaseUidBaseSchema = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Firebase UID'));

// Name
export const nameBaseSchema = z
  .string()
  .trim()
  .max(
    consts.USER.NAME.MAX_LENGTH,
    messages.GENERAL.FIELD_TOO_LONG('Name', consts.USER.NAME.MAX_LENGTH),
  );

// Surnames
export const surnamesBaseSchema = z
  .string()
  .trim()
  .max(
    consts.USER.SURNAMES.MAX_LENGTH,
    messages.GENERAL.FIELD_TOO_LONG(
      'Surnames',
      consts.USER.SURNAMES.MAX_LENGTH,
    ),
  );

// Description
export const descriptionBaseSchema = z
  .string()
  .trim()
  .max(
    consts.USER.DESCRIPTION.MAX_LENGTH,
    messages.GENERAL.FIELD_TOO_LONG(
      'Description',
      consts.USER.DESCRIPTION.MAX_LENGTH,
    ),
  );

// Latitude
export const latitudeBaseSchema = z.coerce.number();

// Longitude
export const longitudeBaseSchema = z.coerce.number();

/// Endpoint complex validation
// Search user by username
export const searchUsersByUsernameQueryBaseSchema = z.object({
  username: usernameBaseSchema,
  page: pageBaseSchema,
  limit: limitBaseSchema,
});

export const searchUsersByUsernameQuerySchema = requireBothOrNeither(
  searchUsersByUsernameQueryBaseSchema,
  'page',
  'limit',
  messages.GENERAL.INCOMPLETE_PAGINATION,
);

// Get missions from user
export const getUserMissionsParamSchema = z.object({
  uid: uidBaseSchema,
});

export const getUserMissionsBaseQuerySchema = z.object({
  type: typeBaseSchema,
  page: pageBaseSchema,
  limit: limitBaseSchema,
});

export const getUserMissionsQuerySchema = requireBothOrNeither(
  getUserMissionsBaseQuerySchema,
  'page',
  'limit',
  messages.GENERAL.INCOMPLETE_PAGINATION,
);

// Get user public profile
export const getUserPublicProfileParamSchema = z.object({
  username: usernameBaseSchema,
});

// Get user public profile missions
export const getUserPublicProfileMissionsBaseQuerySchema = z.object({
  type: typeBaseSchema,
  page: pageBaseSchema,
  limit: limitBaseSchema,
});

export const getUserPublicProfileMissionsQuerySchema = requireBothOrNeither(
  getUserPublicProfileMissionsBaseQuerySchema,
  'page',
  'limit',
  messages.GENERAL.INCOMPLETE_PAGINATION,
);

// Update current users profile
export const updateMyProfileSchema = z.object({
  username: usernameBaseSchema,
  name: nameBaseSchema.optional(),
  surnames: surnamesBaseSchema.optional(),
  description: descriptionBaseSchema.optional(),
  latitude: latitudeBaseSchema.optional(),
  longitude: longitudeBaseSchema.optional(),
});

/// -----------------------
export const getUsersByFirebaseUidParamSchema = z.object({
  firebaseUid: z.string().min(1, messages.FIELD_REQUIRED),
});

// Updates user email
export const updateUserEmailSchema = z
  .object({
    email: z.email(messages.GENERAL.FIELD_NOT_VALID('email')).trim(),
    password: z
      .string()
      .trim()
      .min(1, messages.FIELD_REQUIRED)
      .min(
        consts.PASSWORD_MIN_LENGTH,
        messages.FIELD_TOO_SHORT('Password', consts.PASSWORD_MIN_LENGTH),
      )
      .max(
        consts.PASSWORD_MAX_LENGTH,
        messages.FIELD_TOO_LONG('Password', consts.PASSWORD_MAX_LENGTH),
      ) // Firebase requirement
      .regex(regex.PASSWORD_UPPERCASE_REGEX, messages.PASSWORD_UPPERCASE)
      .regex(regex.PASSWORD_LOWERCASE_REGEX, messages.PASSWORD_LOWERCASE)
      .regex(regex.PASSWORD_NUMBER_REGEX, messages.PASSWORD_NUMBER)
      .regex(regex.PASSWORD_SYMBOL_REGEX, messages.PASSWORD_SYMBOL)
      .optional(),
    confirmPassword: z
      .string()
      .trim()
      .min(1, messages.CONFIRM_PASSWORD)
      .optional(),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: messages.PASSWORDS_NOT_MATCH,
    path: ['confirmPassword'],
  });

// Delete user by uid backend validation
export const deleteUserByUid = z.object({
  uid: z.coerce
    .number(messages.FIELD_NUMBER('uid'))
    .int(messages.FIELD_INTEGER('uid'))
    .min(0, messages.FIELD_POSITIVE('uid')),
});

// Update email validation
export const updateEmailValidation = z
  .object({
    email: z.email(messages.GENERAL.FIELD_NOT_VALID('email')).trim(),
    confirmEmail: z.email(messages.GENERAL.FIELD_NOT_VALID('email')).trim(),
  })
  .refine((val) => val.email === val.confirmEmail, {
    message: messages.EMAILS_NOT_MATCH,
    path: ['confirmEmail'],
  });

// Update email validation
export const updatePasswordValidation = z
  .object({
    password: z
      .string()
      .trim()
      .min(1, messages.FIELD_REQUIRED)
      .min(
        consts.PASSWORD_MIN_LENGTH,
        messages.FIELD_TOO_SHORT('Password', consts.PASSWORD_MIN_LENGTH),
      )
      .max(
        consts.PASSWORD_MAX_LENGTH,
        messages.FIELD_TOO_LONG('Password', consts.PASSWORD_MAX_LENGTH),
      ) // Firebase requirement
      .regex(regex.PASSWORD_UPPERCASE_REGEX, messages.PASSWORD_UPPERCASE)
      .regex(regex.PASSWORD_LOWERCASE_REGEX, messages.PASSWORD_LOWERCASE)
      .regex(regex.PASSWORD_NUMBER_REGEX, messages.PASSWORD_NUMBER)
      .regex(regex.PASSWORD_SYMBOL_REGEX, messages.PASSWORD_SYMBOL),
    confirmPassword: z.string().trim().min(1, messages.CONFIRM_PASSWORD),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: messages.PASSWORDS_NOT_MATCH,
    path: ['confirmPassword'],
  });

// Server and client add email authentication shared validation
export const addEmailAuthenticationSchema = z
  .object({
    email: z.email(messages.GENERAL.FIELD_NOT_VALID('email')).trim(),
    password: z
      .string()
      .trim()
      .min(1, messages.FIELD_REQUIRED)
      .min(
        consts.PASSWORD_MIN_LENGTH,
        messages.FIELD_TOO_SHORT('Password', consts.PASSWORD_MIN_LENGTH),
      )
      .max(
        consts.PASSWORD_MAX_LENGTH,
        messages.FIELD_TOO_LONG('Password', consts.PASSWORD_MAX_LENGTH),
      ) // Firebase requirement
      .regex(regex.PASSWORD_UPPERCASE_REGEX, messages.PASSWORD_UPPERCASE)
      .regex(regex.PASSWORD_LOWERCASE_REGEX, messages.PASSWORD_LOWERCASE)
      .regex(regex.PASSWORD_NUMBER_REGEX, messages.PASSWORD_NUMBER)
      .regex(regex.PASSWORD_SYMBOL_REGEX, messages.PASSWORD_SYMBOL),
    confirmPassword: z.string().trim().min(1, messages.CONFIRM_PASSWORD),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: messages.PASSWORDS_NOT_MATCH,
    path: ['confirmPassword'],
  });

export const userConfigurationValidation = z.object({
  show_missions_to_others: z.boolean(),
});

export const userConfigurationBackendValidation = z.object({
  configuration: z.json(),
});

export const banUserParamsSchema = z.object({
  uid: z.coerce
    .number(messages.FIELD_NUMBER('Uid'))
    .int(messages.FIELD_INTEGER('Uid'))
    .min(0, messages.FIELD_POSITIVE('Uid')),
});

export const banUserBodySchema = z.object({
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
