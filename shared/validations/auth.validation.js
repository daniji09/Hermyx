import z from 'zod';
import { messages } from '../messages/messages.js';
import {
  emailBaseSchema,
  firebaseUidBaseSchema,
  passwordBaseSchema,
  usernameBaseSchema,
} from './user.validation.js';
import { consts } from '../consts/consts.js';
import { regex } from '../regex/regex.js';

/// Endpoint complex validation
// Signup: server and client
export const signUpSchema = z
  .object({
    username: usernameBaseSchema,
    email: emailBaseSchema,
    password: passwordBaseSchema
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
      .regex(regex.USER.PASSWORD.SYMBOL, messages.USER.PASSWORD.SYMBOL),
    confirmPassword: z
      .string()
      .trim()
      .min(1, messages.AUTH.SIGNUP.CONFIRM_PASSWORD),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: messages.AUTH.SIGNUP.PASSWORDS_NOT_MATCH,
    path: ['confirmPassword'],
  });

// Login: server and client
export const logInSchema = z
  .object({
    username: usernameBaseSchema.or(z.literal('')).optional(),
    email: emailBaseSchema.or(z.literal('')).optional(),
    password: passwordBaseSchema,
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
  email: emailBaseSchema,
  firebaseUid: firebaseUidBaseSchema,
});
