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
import * as missionController from '../controllers/service.controller.js';

/// GET
// Get all services
router.get(
  '/',
  validateQuerySchema(getMissionsQuerySchema),
  pagination(),
  missionController.getMissions,
);

// Get all opened services
router.get(
  '/opened',
  verifyToken,
  validateQuerySchema(getOpenedMissionsQuerySchema),
  pagination(),
  missionController.getMissionsOpened,
);

// Get service by mid
router.get(
  '/:mid',
  verifyToken,
  validateParamsSchema(getMissionSchema),
  missionController.getMissionByMid,
);

// Get service's payment information
router.get(
  '/:mid/payment-info',
  verifyToken,
  validateParamsSchema(getMissionPaymentInfoSchema),
  missionController.getMissionPaymentInfo,
);

/// POST
// Publishes service
router.post(
  '/',
  verifyToken,
  verifyRegularUser,
  upload.array('photos', 5),
  validateBodySchema(publishMissionSchema),
  validateFilesSchema(publishMissionFilesSchema),
  missionController.publishMission,
);

// Closes a service
router.post(
  '/:mid/close',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(closeMissionParamSchema),
  missionController.closeMission,
);

// Joins an collaborator into a service
router.post(
  '/:mid/join',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(joinMissionParamSchema),
  validateBodySchema(joinMissionBodySchema),
  missionController.joinMission,
);

// Invites user to service
router.post(
  '/:mid/invite',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(inviteToMissionParamSchema),
  validateBodySchema(inviteToMissionBodySchema),
  missionController.inviteToMission,
);

// Unjoin collaborator from service
router.post(
  '/:mid/unjoin',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(unjoinMissionParamSchema),
  validateBodySchema(unjoinMissionBodySchema),
  missionController.unjoinMission,
);

// Submits current collaborator participation for applicant review
router.post(
  '/:mid/submit',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(submitMissionParticipationSchema),
  missionController.submitMissionParticipation,
);

// Cancels a service
router.post(
  '/:mid/cancel',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(cancelMissionParamSchema),
  missionController.cancelMission,
);

// Reopens a service
router.post(
  '/:mid/finish',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(finishMissionParamSchema),
  missionController.finishMission,
);

// Reopens a service
router.post(
  '/:mid/reopen',
  verifyToken,
  verifyRegularUser,
  validateParamsSchema(reopenMissionParamSchema),
  missionController.reopenMission,
);

// Bans service
router.post(
  '/:mid/ban',
  verifyToken,
  verifyAdmin,
  validateParamsSchema(banMissionParamsSchema),
  validateBodySchema(banMissionBodySchema),
  missionController.banMission,
);

// Kicks an collaborator out
router.post(
  '/:mid/kick/:vacancyId',
  verifyToken,
  verifyAdmin,
  validateParamsSchema(kickAdventurerOutParamsSchema),
  validateBodySchema(kickAdventurerOutBodySchema),
  missionController.kickAdventurerOut,
);

/// PUT
// Edits service
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
