// External modules
import { Router } from 'express';
const router = Router();

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
import * as userController from '../controllers/user.controller.js';

import { verifyAdmin, verifyToken } from '../middlewares/auth.middleware.js';
import { pagination } from '../middlewares/pagination.middleware.js';
import multer from 'multer';

// Multer config
const upload = multer({ storage: multer.memoryStorage() });

/// GET
// Search users by partial username
router.get(
  '/search',
  validateQuerySchema(searchUsersByUsernameQuerySchema),
  pagination(),
  userController.searchUsersByUsername,
);

// ----------

//Get my profile
router.get('/me/profile', verifyToken, userController.getMyProfile);

// Updates profile
router.patch(
  '/me/profile',
  verifyToken,
  validateBodySchema(updateMyProfileSchema),
  userController.updateMyProfile,
);

// Updates avatar
router.patch(
  '/me/avatar',
  verifyToken,
  upload.single('avatar'), // Multer processes the file
  userController.updateMyAvatar,
);

//Get user by username
router.get(
  '/:username/profile',
  validateParamsSchema(getUserByUsernameParamSchema),
  userController.getUserPublicProfile,
);

// Get public profile missions by username
router.get(
  '/:username/profile/missions',
  validateParamsSchema(getUserByUsernameParamSchema),
  validateQuerySchema(getPublicProfileMissionsQuerySchema),
  pagination(),
  userController.getUserPublicProfileMissions,
);

// Get users by firebaseUid
router.get(
  '/firebase/:firebaseUid',
  verifyToken,
  validateParamsSchema(getUsersByFirebaseUidParamSchema),
  userController.getUsersByFirebaseUid,
);

// Get missions from user
router.get(
  '/:uid/missions',
  verifyToken,
  validateParamsSchema(getMissionsFromUserParamSchema),
  validateQuerySchema(getMissionsFromUserQuerySchema),
  pagination(),
  userController.getUserMissions,
);

/// POST

// Bans user
router.post(
  '/:uid/ban',
  verifyToken,
  verifyAdmin,
  validateParamsSchema(banUserParamsSchema),
  validateBodySchema(banUserBodySchema),
  userController.banUser,
);

/// PUT
router.put(
  '/me/email',
  verifyToken,
  validateBodySchema(updateUserEmailSchema),
  userController.updateUserEmail,
);

router.put(
  '/me/configuration',
  verifyToken,
  validateBodySchema(userConfigurationBackendValidation),
  userController.updateUserConfiguration,
);

/// DELETE
router.delete('/me', verifyToken, userController.deleteUser);

router.delete(
  '/:uid',
  verifyToken,
  validateParamsSchema(deleteUserByUid),
  userController.deleteByUid,
);

export default router;
