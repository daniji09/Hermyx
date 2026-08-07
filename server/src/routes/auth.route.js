// External modules
import { Router } from 'express';
const router = Router();

import { validateBodySchema } from '../middlewares/validation.middleware.js';
import { logInSchema, signUpSchema, syncGoogleSchema } from '@hermyx/shared';
import { signUp, syncGoogle } from '../controllers/user.controller.js';
import { login } from '../controllers/auth.controller.js';

/// POST
// Logins user
router.post('/login', validateBodySchema(logInSchema), login);

// Sign up a new user
router.post('/signup', validateBodySchema(signUpSchema), signUp);

// Sign in user with Google, handling whether is a signup or a login
router.post('/sync-google', validateBodySchema(syncGoogleSchema), syncGoogle);

export default router;
