import { z } from 'zod';

// Backend endpoint getUsers
export const getUsersQuerySchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(1, 'Please, enter a username.')
      .max(20, 'Username must not be longer than 20 characters.')
      .optional(),
    email: z.email('Please, enter a valid email.').trim().optional(),
  })
  .refine((val) => val.email || val.username, {
    message: 'Username or email must be provided.',
    path: ['email'],
  });

// Server and client sign up shared validation
const baseSignUpSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, 'Please, enter a username.')
    .max(20, 'Username must not be longer than 20 characters.'),
  email: z.email('Please, enter a valid email.').trim(),
});

// Client variant
export const signUpClientSchema = baseSignUpSchema
  .extend({
    password: z
      .string()
      .trim()
      .min(1, 'Please, enter a password.')
      .min(8, 'Password must be longer than 8 characters.')
      .max(4096, 'Password must be longer than 4096 characters.') // Firebase requirement
      .regex(
        /[A-Z](?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
        'Please, enter a valid password.',
      ),
    confirmPassword: z.string().trim().min(1, 'Please, confirm password.'),
  })
  .refine((val) => val.password === val.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

// Server variant
export const signUpServerSchema = baseSignUpSchema.extend({
  firebaseUid: z.string('Firebase UID is required.'),
});
