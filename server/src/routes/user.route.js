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
  getUserPublicProfileParamSchema,
  getUserMissionsParamSchema,
  getUserMissionsQuerySchema,
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

// Get current user information
router.get('/me', userController.getMe);

// Get missions from user
router.get(
  '/:uid/missions',
  validateParamsSchema(getUserMissionsParamSchema),
  validateQuerySchema(getUserMissionsQuerySchema),
  pagination(),
  userController.getUserMissions,
);

// Get user public profile by username
router.get(
  '/:username/profile',
  validateParamsSchema(getUserPublicProfileParamSchema),
  userController.getUserPublicProfile,
);

// Get user public profile missions by username
router.get(
  '/:username/profile/missions',
  validateParamsSchema(getUserPublicProfileParamSchema),
  validateQuerySchema(getPublicProfileMissionsQuerySchema),
  pagination(),
  userController.getUserPublicProfileMissions,
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
