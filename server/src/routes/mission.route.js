// External modules
import { Router } from 'express';
const router = Router();
import {
  validateBodySchema,
  validateQuerySchema,
  validateParamsSchema,
  validateFilesSchema,
} from '../middlewares/validation.middleware.js';

import {
  publishMissionSchema,
  getMissionSchema,
  getMissionsQuerySchema,
  submitMissionParticipationSchema,
  joinMissionParamSchema,
  joinMissionBodySchema,
  editMissionParamSchema,
  editMissionBodySchema,
  unjoinMissionParamSchema,
  unjoinMissionBodySchema,
  cancelMissionParamSchema,
  reopenMissionParamSchema,
  closeMissionParamSchema,
  finishMissionParamSchema,
  banMissionParamsSchema,
  banMissionBodySchema,
  kickAdventurerOutParamsSchema,
  kickAdventurerOutBodySchema,
  publishMissionFilesSchema,
  editMissionFilesSchema,
  getOpenedMissionsQuerySchema,
  inviteToMissionParamSchema,
  inviteToMissionBodySchema,
  getMissionPaymentInfoSchema,
} from '@hermyx/shared';
import { pagination } from '../middlewares/pagination.middleware.js';
import {
  verifyAdmin,
  verifyRegularUser,
  verifyToken,
} from '../middlewares/auth.middleware.js';
import { upload } from '../utils/file.utils.js';
import * as missionController from '../controllers/mission.controller.js';

/// GET
// Get all missions
router.get(
  '/',
  validateQuerySchema(getMissionsQuerySchema),
  pagination(),
  missionController.getMissions,
);

// Get all opened missions
router.get(
  '/opened',
  verifyToken,
  validateQuerySchema(getOpenedMissionsQuerySchema),
  pagination(),
  missionController.getMissionsOpened,
);

// Get mission by mid
router.get(
  '/:mid',
  verifyToken,
  validateParamsSchema(getMissionSchema),
  missionController.getMissionByMid,
);

// Get mission's payment information
router.get(
  '/:mid/payment-info',
  verifyToken,
  validateParamsSchema(getMissionPaymentInfoSchema),
  missionController.getMissionPaymentInfo,
);

/// POST
// Publishes mission
router.post(
  '/',
  verifyToken,
  verifyRegularUser,
  upload.array('photos', 5),
  validateBodySchema(publishMissionSchema),
  validateFilesSchema(publishMissionFilesSchema),
  missionController.publishMission,
);

// Closes a mission
router.post(
  '/:mid/close',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(closeMissionParamSchema),
  missionController.closeMission,
);

// Joins an adventurer into a mission
router.post(
  '/:mid/join',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(joinMissionParamSchema),
  validateBodySchema(joinMissionBodySchema),
  missionController.joinMission,
);

// Invites user to mission
router.post(
  '/:mid/invite',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(inviteToMissionParamSchema),
  validateBodySchema(inviteToMissionBodySchema),
  missionController.inviteToMission,
);

// Unjoin adventurer from mission
router.post(
  '/:mid/unjoin',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(unjoinMissionParamSchema),
  validateBodySchema(unjoinMissionBodySchema),
  missionController.unjoinMission,
);

// Submits current adventurer participation for owner review
router.post(
  '/:mid/submit',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(submitMissionParticipationSchema),
  missionController.submitMissionParticipation,
);

// Cancels a mission
router.post(
  '/:mid/cancel',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(cancelMissionParamSchema),
  missionController.cancelMission,
);

// Reopens a mission
router.post(
  '/:mid/finish',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(finishMissionParamSchema),
  missionController.finishMission,
);

// Reopens a mission
router.post(
  '/:mid/reopen',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(reopenMissionParamSchema),
  missionController.reopenMission,
);

// Bans mission
router.post(
  '/:mid/ban',
  verifyToken,
  verifyAdmin,
  validateParamsSchema(banMissionParamsSchema),
  validateBodySchema(banMissionBodySchema),
  missionController.banMission,
);

// Kicks an adventurer out
router.post(
  '/:mid/kick/:vacancyId',
  verifyToken,
  verifyAdmin,
  validateParamsSchema(kickAdventurerOutParamsSchema),
  validateBodySchema(kickAdventurerOutBodySchema),
  missionController.kickAdventurerOut,
);

/// PUT
// Edits mission
router.put(
  '/:mid',
  verifyToken,
  verifyRegularUser,
  upload.array('photos', 5),
  validateParamsSchema(editMissionParamSchema),
  validateBodySchema(editMissionBodySchema),
  validateFilesSchema(editMissionFilesSchema),
  missionController.editMission,
);

export default router;
