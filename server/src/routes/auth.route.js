// External modules
import { Router } from 'express';
const router = Router();

import { validateBodySchema } from '../middlewares/validation.middleware.js';
import { logInSchema, signUpSchema, syncGoogleSchema } from '@hermyx/shared';
import * as authController from '../controllers/auth.controller.js';

/// POST
// Sign up a new user
router.post('/signup', validateBodySchema(signUpSchema), authController.signup);

// Logins user
router.post('/login', validateBodySchema(logInSchema), authController.login);

// Sign in user with Google, handling whether is a signup or a login
router.post(
  '/sync-google',
  validateBodySchema(syncGoogleSchema),
  authController.syncGoogle,
);

export default router;
