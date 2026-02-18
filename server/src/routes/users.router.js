// External modules
import { Router } from 'express';
const router = Router();
import { getUsers, signUp } from '../controllers/users.controller.js';
import {
  validateBodySchema,
  validateQuerySchema,
} from '../middlewares/validations.middleware.js';
import { getUsersQuerySchema, signUpSchema } from '@hermyx/shared';

// Get users
router.get('/', validateQuerySchema(getUsersQuerySchema), getUsers);

// Sign up a new user
router.post('/', validateBodySchema(signUpSchema), signUp);

export default router;
