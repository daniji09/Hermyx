// External modules
import { Router } from 'express';
const router = Router();
import {
  getUsers,
  signUp,
  syncGoogle,
} from '../controllers/users.controller.js';
import {
  validateBodySchema,
  validateQuerySchema,
} from '../middlewares/validations.middleware.js';
import {
  getUsersQuerySchema,
  signUpSchema,
  syncGoogleSchema,
} from '@hermyx/shared';

// Get users
router.get('/', validateQuerySchema(getUsersQuerySchema), getUsers);

// Sign in user with Google, handling whether is a signup or a login
router.post('/sync-google', validateBodySchema(syncGoogleSchema), syncGoogle);

// Sign up a new user
router.post('/', validateBodySchema(signUpSchema), signUp);

export default router;
