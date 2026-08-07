import { z } from 'zod';
import { messages } from '../messages/messages.js';
import { consts } from '../consts/consts.js';
import { regex } from '../regex/regex.js';

/// Base validations, raw logic
// Username
export const usernameBase = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Username'))
  .max(
    consts.USER.USERNAME.MAX_LENGTH,
    messages.FIELD_TOO_LONG('Username', consts.USER.USERNAME.MAX_LENGTH),
  )
  .regex(regex.USER.USERNAME, messages.USER.USERNAME.INVALID_CHARACTERS);

// Email
export const emailBase = z
  .email(messages.GENERAL.FIELD_NOT_VALID('email'))
  .trim();

// Password
export const passwordBase = z
  .string()
  .trim()
  .min(1, messages.GENERAL.FIELD_REQUIRED('Password'));

/// -----------------------
export const searchUsersByUsernameQuerySchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, messages.FIELD_REQUIRED)
    .max(
      consts.USERNAME_MAX_LENGTH,
      messages.FIELD_TOO_LONG('Username', consts.USERNAME_MAX_LENGTH),
    )
    .regex(regex.USERNAME_REGEX, messages.USERNAME_INVALID_CHARACTERS),
});

// Server and client sign up shared validation
export const signUpSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, messages.FIELD_REQUIRED)
      .max(
        consts.USERNAME_MAX_LENGTH,
        messages.FIELD_TOO_LONG('Username', consts.USERNAME_MAX_LENGTH),
      )
      .regex(regex.USERNAME_REGEX, messages.USERNAME_INVALID_CHARACTERS),
    email: z
      .email(messages.GENERAL.FIELD_NOT_VALID('email'))
      .trim()
      .toLowerCase(),
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

export const getUsersByFirebaseUidParamSchema = z.object({
  firebaseUid: z.string().min(1, messages.FIELD_REQUIRED),
});

export const getUserByUsernameParamSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, messages.FIELD_REQUIRED)
    .max(
      consts.USERNAME_MAX_LENGTH,
      messages.FIELD_TOO_LONG('Username', consts.USERNAME_MAX_LENGTH),
    )
    .regex(regex.USERNAME_REGEX, messages.USERNAME_INVALID_CHARACTERS),
});

export const getMissionsFromUserParamSchema = z.object({
  uid: z.coerce
    .number(messages.FIELD_NUMBER('uid'))
    .int(messages.FIELD_INTEGER('uid'))
    .min(0, messages.FIELD_POSITIVE('uid')),
});

export const getMissionsFromUserQuerySchema = z.object({
  type: z.string().min(1, messages.FIELD_REQUIRED),
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
});

export const getPublicProfileMissionsQuerySchema = z.object({
  type: z.enum(['created', 'joined'], {
    message: messages.INVALID_MISSION_TYPE,
  }),
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
});

// Server and client profile update shared validation
export const updateMyProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, messages.FIELD_REQUIRED)
    .max(
      consts.USERNAME_MAX_LENGTH,
      messages.FIELD_TOO_LONG('Username', consts.USERNAME_MAX_LENGTH),
    )
    .regex(regex.USERNAME_REGEX, messages.USERNAME_INVALID_CHARACTERS),
  name: z
    .string()
    .trim()
    .max(
      consts.NAME_MAX_LENGTH,
      messages.FIELD_TOO_LONG('Name', consts.NAME_MAX_LENGTH),
    )
    .optional(),
  surnames: z
    .string()
    .trim()
    .max(
      consts.SURNAMES_MAX_LENGTH,
      messages.FIELD_TOO_LONG('Surnames', consts.SURNAMES_MAX_LENGTH),
    )
    .optional(),
  description: z
    .string()
    .trim()
    .max(
      consts.DESCRIPTION_MAX_LENGTH,
      messages.FIELD_TOO_LONG('Description', consts.DESCRIPTION_MAX_LENGTH),
    )
    .optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
});

// Sync with Google backend validation
export const syncGoogleSchema = z.object({
  username: z.string().trim().min(1, messages.FIELD_REQUIRED),
  email: z.email(messages.GENERAL.FIELD_NOT_VALID('email')).trim(),
  firebaseUid: z.string().trim().min(1, messages.FIELD_REQUIRED),
  isNewUser: z.boolean(),
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
