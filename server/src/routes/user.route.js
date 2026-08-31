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
import {
  verifyAdmin,
  verifyRegularUser,
} from '../middlewares/auth.middleware.js';
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

// Get services from user
router.get(
  '/:uid/services',
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

// Get user public profile services by username
router.get(
  '/:username/profile/services',
  validateParamsSchema(getUserPublicProfileParamSchema),
  validateQuerySchema(getUserPublicProfileMissionsQuerySchema),
  pagination(),
  userController.getUserPublicProfileMissions,
);

/// PATCH
// Updates profile
router.patch(
  '/me/profile',
  verifyRegularUser,
  validateBodySchema(updateMyProfileSchema),
  userController.updateMyProfile,
);

// Updates avatar
router.patch(
  '/me/avatar',
  verifyRegularUser,
  upload.single('avatar'), // Multer processes the file
  userController.updateMyAvatar,
);

// Updates email
router.patch(
  '/me/email',
  verifyRegularUser,
  validateBodySchema(updateMyEmailSchema),
  userController.updateMyEmail,
);

// Updates configuration
router.patch(
  '/me/configuration',
  verifyRegularUser,
  validateBodySchema(updateMyConfigurationSchema),
  userController.updateMyConfiguration,
);

/// POST
// Adds email authentication
router.post(
  '/me/credentials',
  verifyRegularUser,
  validateBodySchema(addEmailAuthenticationSchema),
  userController.addEmailAuthentication,
);

// Bans user
router.post(
  '/:uid/ban',
  verifyAdmin,
  validateParamsSchema(banUserParamsSchema),
  validateBodySchema(banUserBodySchema),
  userController.banUser,
);

/// DELETE
router.delete('/me', verifyRegularUser, userController.deleteMe);

export default router;
