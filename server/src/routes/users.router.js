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
  updateMyProfile,
  syncGoogle,
  deleteByUid,
  updateUserEmail,
  deleteUser,
} from '../controllers/users.controller.js';
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from '../middlewares/validations.middleware.js';
import {
  getUsersQuerySchema,
  signUpSchema,
  updateMyProfileSchema,
  getUsersByFirebaseUidParamSchema,
  getUserByUsernameParamSchema,
  getMissionsFromUserParamSchema,
  getMissionsFromUserQuerySchema,
  syncGoogleSchema,
  getPublicProfileMissionsQuerySchema,
  deleteUserByUid,
  updateUserEmailSchema,
} from '@hermyx/shared';

import { verifyToken } from '../middlewares/auth.middleware.js';
import { pagination } from '../middlewares/pagination.middleware.js';

/// GET
// Get users
router.get('/', validateQuerySchema(getUsersQuerySchema), getUsers);

//Get my profile
router.get('/me/profile', verifyToken, getMyProfile);

router.patch(
  '/me/profile',
  verifyToken,
  validateBodySchema(updateMyProfileSchema),
  updateMyProfile,
);

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

/// PUT
router.put(
  '/me/email',
  verifyToken,
  validateBodySchema(updateUserEmailSchema),
  updateUserEmail,
);

/// DELETE
router.delete('/me', verifyToken, deleteUser);

router.delete(
  '/:uid',
  verifyToken,
  validateParamsSchema(deleteUserByUid),
  deleteByUid,
);

export default router;
