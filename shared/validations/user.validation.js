import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { regex } from '../regex/regex.js';
import * as paginationValidation from './pagination.validation.js';
import * as helperValidation from './helper.validation.js';
import * as missionValidation from './mission.validation.js';

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

export const newPasswordBaseSchema = passwordBaseSchema
  .min(
    consts.USER.PASSWORD.MIN_LENGTH,
    messages.FIELD_TOO_SHORT('Password', consts.USER.PASSWORD.MIN_LENGTH),
  )
  .max(
    consts.USER.PASSWORD.MAX_LENGTH,
    messages.FIELD_TOO_LONG('Password', consts.USER.PASSWORD.MAX_LENGTH),
  ) // Firebase requirement
  .regex(regex.USER.PASSWORD.UPPERCASE, messages.USER.PASSWORD.UPPERCASE)
  .regex(regex.USER.PASSWORD.LOWERCASE, messages.USER.PASSWORD.LOWERCASE)
  .regex(regex.USER.PASSWORD.NUMBER, messages.USER.PASSWORD.NUMBER)
  .regex(regex.USER.PASSWORD.SYMBOL, messages.USER.PASSWORD.SYMBOL);

// Confirm password
export const confirmPasswordBaseSchema = z
  .string()
  .trim()
  .min(1, messages.AUTH.SIGNUP.CONFIRM_PASSWORD);

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

// Configuration
export const configurationBaseSchema = z.json();

/// Endpoint complex validation
// Search user by username
export const searchUsersByUsernameQueryBaseSchema = z.object({
  username: usernameBaseSchema,
  page: paginationValidation.pageBaseSchema,
  limit: paginationValidation.limitBaseSchema,
});

export const searchUsersByUsernameQuerySchema =
  helperValidation.requireBothOrNeither(
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
  type: missionValidation.typeBaseSchema,
  page: paginationValidation.pageBaseSchema,
  limit: paginationValidation.limitBaseSchema,
});

export const getUserMissionsQuerySchema = helperValidation.requireBothOrNeither(
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
  type: missionValidation.typeBaseSchema,
  page: paginationValidation.pageBaseSchema,
  limit: paginationValidation.limitBaseSchema,
});

export const getUserPublicProfileMissionsQuerySchema =
  helperValidation.requireBothOrNeither(
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

// Updates user email
export const updateMyEmailSchema = z.object({
  email: emailBaseSchema,
});

// Updates user's configuration
export const updateMyConfigurationSchema = z.object({
  configuration: configurationBaseSchema,
});

// Add email authentication
export const addEmailAuthenticationSchema = z
  .object({
    email: emailBaseSchema,
    password: newPasswordBaseSchema,
    confirmPassword: confirmPasswordBaseSchema,
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: messages.AUTH.SIGNUP.PASSWORDS_NOT_MATCH,
    path: ['confirmPassword'],
  });

/// -----------------------
export const getUsersByFirebaseUidParamSchema = z.object({
  firebaseUid: z.string().min(1, messages.FIELD_REQUIRED),
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

export const userConfigurationValidation = z.object({
  show_missions_to_others: z.boolean(),
});

// Ban user
export const banUserParamsSchema = z.object({
  uid: uidBaseSchema,
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
