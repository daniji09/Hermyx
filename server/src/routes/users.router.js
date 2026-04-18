// External modules
import { Router } from 'express';
const router = Router();
import {
  getUsers,
  signUp,
  getUserPublicProfile,
  getUserCompletedMissions,
  getMyProfile,
  getMyAccount,
  updateMyAccount,
} from '../controllers/users.controller.js';
import {
  validateBodySchema,
  validateQuerySchema,
} from '../middlewares/validations.middleware.js';
import {
  getUsersQuerySchema,
  signUpSchema,
  updateMyAccountSchema,
} from '@hermyx/shared';

import { verifyToken } from '../middlewares/auth.middleware.js';

// Get public profile of a user by username
router.get('/', validateQuerySchema(getUsersQuerySchema), getUsers);

//Get my profile
router.get('/me/profile', verifyToken, getMyProfile);

//Get user by username
router.get('/:username/profile', getUserPublicProfile);

// Get completed missions history of a user by username
router.get('/:username/completed-missions', getUserCompletedMissions);

// Sign up a new user
router.post('/', validateBodySchema(signUpSchema), signUp);

router.get('/me/account', verifyToken, getMyAccount);

router.patch(
  '/me/account',
  verifyToken,
  validateBodySchema(updateMyAccountSchema),
  updateMyAccount,
);

export default router;
