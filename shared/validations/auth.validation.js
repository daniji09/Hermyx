import z from 'zod';
import { messages } from '../messages/messages.js';
import * as userValidation from './user.validation.js';

/// Endpoint complex validation
// Signup: server and client
export const signUpSchema = z
  .object({
    username: userValidation.usernameBaseSchema,
    email: userValidation.emailBaseSchema,
    password: userValidation.newPasswordBaseSchema,
    confirmPassword: userValidation.confirmPasswordBaseSchema,
    termsAccepted: z.preprocess(
      (value) => value === true || value === 'true',
      z.boolean().refine((value) => value, {
        message: messages.AUTH.SIGNUP.TERMS_REQUIRED,
      }),
    ),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: messages.AUTH.SIGNUP.PASSWORDS_NOT_MATCH,
    path: ['confirmPassword'],
  });

// Login: server and client
export const logInSchema = z
  .object({
    username: userValidation.usernameBaseSchema.or(z.literal('')).optional(),
    email: userValidation.emailBaseSchema.or(z.literal('')).optional(),
    password: userValidation.passwordBaseSchema,
  })
  .refine((val) => val.email || val.username, {
    message: messages.AUTH.LOGIN.NO_EMAIL_OR_USERNAME,
    path: ['usernameEmail'],
  });

// Sync with Google: server
export const syncGoogleSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, messages.GENERAL.FIELD_REQUIRED('Username')),
  email: userValidation.emailBaseSchema,
  firebaseUid: userValidation.firebaseUidBaseSchema,
  termsAccepted: z.preprocess((value) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  }, z.boolean().optional()),
});
