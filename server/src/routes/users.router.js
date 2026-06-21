// External modules
import { Router } from 'express';
const router = Router();
import {
  getUsers,
  signUp,
  getUsersByFirebaseUid,
  getUserMissions,
  getUserPublicProfile,
  getUserPublicProfileMissions,
  getMyProfile,
  getMyAccount,
  updateMyAccount,
  syncGoogle,
} from '../controllers/users.controller.js';
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from '../middlewares/validations.middleware.js';
import {
  getUsersQuerySchema,
  signUpSchema,
  updateMyAccountSchema,
  getUsersByFirebaseUidParamSchema,
  getUserByUsernameParamSchema,
  getMissionsFromUserParamSchema,
  getMissionsFromUserQuerySchema,
  syncGoogleSchema,
  getPublicProfileMissionsQuerySchema,
} from '@hermyx/shared';

import { verifyToken } from '../middlewares/auth.middleware.js';
import { pagination } from '../middlewares/pagination.middleware.js';

/// GET
// Get users
router.get('/', validateQuerySchema(getUsersQuerySchema), getUsers);

//Get my profile
router.get('/me/profile', verifyToken, getMyProfile);

//Get user by username
router.get(
  '/:username/profile',
  validateParamsSchema(getUserByUsernameParamSchema),
  getUserPublicProfile,
);

// Get public profile missions by username
router.get(
  '/:username/profile/missions',
  validateParamsSchema(getUserByUsernameParamSchema),
  validateQuerySchema(getPublicProfileMissionsQuerySchema),
  pagination(),
  getUserPublicProfileMissions,
);

// Get users by firebaseUid
router.get(
  '/firebase/:firebaseUid',
  verifyToken,
  validateParamsSchema(getUsersByFirebaseUidParamSchema),
  getUsersByFirebaseUid,
);

// Get missions from user
router.get(
  '/:uid/missions',
  verifyToken,
  validateParamsSchema(getMissionsFromUserParamSchema),
  validateQuerySchema(getMissionsFromUserQuerySchema),
  pagination(),
  getUserMissions,
);

/// POST
// Sign up a new user
router.post('/', validateBodySchema(signUpSchema), signUp);

// Sign in user with Google, handling whether is a signup or a login
router.post('/sync-google', validateBodySchema(syncGoogleSchema), syncGoogle);

router.get('/me/account', verifyToken, getMyAccount);

router.patch(
  '/me/account',
  verifyToken,
  validateBodySchema(updateMyAccountSchema),
  updateMyAccount,
);

export default router;
