import z from 'zod';
import { messages } from '../messages/messages.js';
import { emailBase, passwordBase, usernameBase } from './user.validation.js';

/// Endpoint complex validation
// Login
export const logInSchema = z
  .object({
    username: usernameBase.or(z.literal('')).optional(),
    email: emailBase.or(z.literal('')).optional(),
    password: passwordBase,
  })
  .refine((val) => val.email || val.username, {
    message: messages.AUTH.LOGIN.NO_EMAIL_OR_USERNAME,
    path: ['usernameEmail'],
  });
