// External modules
import { Router } from 'express';
const router = Router();
import {
  searchUsersByUsername,
  getUsersByFirebaseUid,
  getUserMissions,
  getUserPublicProfile,
  getUserPublicProfileMissions,
  getMyProfile,
  updateMyProfile,
  deleteByUid,
  updateUserEmail,
  deleteUser,
  updateUserConfiguration,
  banUser,
  updateMyAvatar,
} from '../controllers/user.controller.js';
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from '../middlewares/validation.middleware.js';
import {
  searchUsersByUsernameQuerySchema,
  updateMyProfileSchema,
  getUsersByFirebaseUidParamSchema,
  getUserByUsernameParamSchema,
  getMissionsFromUserParamSchema,
  getMissionsFromUserQuerySchema,
  getPublicProfileMissionsQuerySchema,
  deleteUserByUid,
  updateUserEmailSchema,
  userConfigurationBackendValidation,
  banUserParamsSchema,
  banUserBodySchema,
} from '@hermyx/shared';

import { verifyAdmin, verifyToken } from '../middlewares/auth.middleware.js';
import { pagination } from '../middlewares/pagination.middleware.js';
import multer from 'multer';

// Multer config
const upload = multer({ storage: multer.memoryStorage() });

/// GET

// Search users by partial username
router.get(
  '/search',
  verifyToken,
  validateQuerySchema(searchUsersByUsernameQuerySchema),
  searchUsersByUsername,
);

//Get my profile
router.get('/me/profile', verifyToken, getMyProfile);

// Updates profile
router.patch(
  '/me/profile',
  verifyToken,
  validateBodySchema(updateMyProfileSchema),
  updateMyProfile,
);

// Updates avatar
router.patch(
  '/me/avatar',
  verifyToken,
  upload.single('avatar'), // Multer processes the file
  updateMyAvatar,
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

// Bans user
router.post(
  '/:uid/ban',
  verifyToken,
  verifyAdmin,
  validateParamsSchema(banUserParamsSchema),
  validateBodySchema(banUserBodySchema),
  banUser,
);

/// PUT
router.put(
  '/me/email',
  verifyToken,
  validateBodySchema(updateUserEmailSchema),
  updateUserEmail,
);

router.put(
  '/me/configuration',
  verifyToken,
  validateBodySchema(userConfigurationBackendValidation),
  updateUserConfiguration,
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
