// External modules
import { Router } from 'express';
const router = Router();
import { getUsers, signUp } from '../controllers/users.controller.js';
import {
  validateBodySchema,
  validateQuerySchema,
} from '../middlewares/validations.middleware.js';
import { getUsersQuerySchema, signUpServerSchema } from '@hermyx/shared';

// Get users
router.get('/', validateQuerySchema(getUsersQuerySchema), getUsers);

// Sign up a new user
router.post('/', validateBodySchema(signUpServerSchema), signUp);

export default router;
