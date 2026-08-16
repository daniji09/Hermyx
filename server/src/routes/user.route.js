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
  getUserPublicProfileMissionsQuerySchema,
  updateMyEmailSchema,
  updateMyConfigurationSchema,
  banUserParamsSchema,
  banUserBodySchema,
  addEmailAuthenticationSchema,
} from '@hermyx/shared';
import * as userController from '../controllers/user.controller.js';
import { verifyAdmin } from '../middlewares/auth.middleware.js';
import { pagination } from '../middlewares/pagination.middleware.js';
import { upload } from '../utils/file.utils.js';

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

// Get my profile
router.get('/me/profile', userController.getMyProfile);

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
  validateQuerySchema(getUserPublicProfileMissionsQuerySchema),
  pagination(),
  userController.getUserPublicProfileMissions,
);

/// PATCH
// Updates profile
router.patch(
  '/me/profile',
  validateBodySchema(updateMyProfileSchema),
  userController.updateMyProfile,
);

// Updates avatar
router.patch(
  '/me/avatar',
  upload.single('avatar'), // Multer processes the file
  userController.updateMyAvatar,
);

// Updates email
router.patch(
  '/me/email',
  validateBodySchema(updateMyEmailSchema),
  userController.updateMyEmail,
);

// Updates configuration
router.patch(
  '/me/configuration',
  validateBodySchema(updateMyConfigurationSchema),
  userController.updateMyConfiguration,
);

/// POST
// Adds email authentication
router.post(
  '/me/credentials',
  validateBodySchema(addEmailAuthenticationSchema),
  userController.addEmailAuthentication,
);

/// DELETE
router.delete('/me', userController.deleteMe);

// ----------

// Bans user
router.post(
  '/:uid/ban',
  verifyAdmin,
  validateParamsSchema(banUserParamsSchema),
  validateBodySchema(banUserBodySchema),
  userController.banUser,
);

export default router;
