// External modules
import { Router } from 'express';
const router = Router();
import {
  getUsers,
  signUp,
  getUsersByFirebaseUid,
  getUserMissions,
  getUserPublicProfile,
  getUserCompletedMissions,
  getMyProfile,
} from '../controllers/users.controller.js';
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from '../middlewares/validations.middleware.js';
import {
  getUsersQuerySchema,
  signUpSchema,
  getUsersByFirebaseUidParamSchema,
  getMissionsFromUserParamSchema,
  getMissionsFromUserQuerySchema,
} from '@hermyx/shared';
import { pagination } from '../middlewares/pagination.middleware.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

/// GET
// Get users
router.get('/', validateQuerySchema(getUsersQuerySchema), getUsers);

//Get my profile
router.get('/me/profile', verifyToken, getMyProfile);

//Get user by username
router.get('/:username/profile', getUserPublicProfile);

// Get completed missions history of a user by username
router.get('/:username/completed-missions', getUserCompletedMissions);

//Get my profile
router.get('/me/profile', verifyToken, getMyProfile);

//Get user by username
router.get('/:username/profile', getUserPublicProfile);

// Get completed missions history of a user by username
router.get('/:username/completed-missions', getUserCompletedMissions);

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

export default router;
