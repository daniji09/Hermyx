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
  draftMissionSchema,
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
  inviteToMissionSchema,
  closeMissionParamSchema,
  finishMissionParamSchema,
  banMissionParamsSchema,
  banMissionBodySchema,
  kickAdventurerOutParamsSchema,
  kickAdventurerOutBodySchema,
  publishMissionFilesSchema,
  editMissionFilesSchema,
  getOpenedMissionsQuerySchema,
} from '@hermyx/shared';
import { pagination } from '../middlewares/pagination.middleware.js';
import { verifyAdmin } from '../middlewares/auth.middleware.js';
import { upload } from '../utils/file.utils.js';
import * as missionController from '../controllers/mission.controller.js';

//Dynamic middleware to decide which schema to use
const dynamicValidation = (req, res, next) => {
  const isDraft = req.body.isDraft === true || req.body.isDraft === 'true';
  const schemaToUse = isDraft ? draftMissionSchema : publishMissionSchema;
  return validateBodySchema(schemaToUse)(req, res, next);
};

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
  validateQuerySchema(getOpenedMissionsQuerySchema),
  pagination(),
  missionController.getMissionsOpened,
);

// Get mission by mid
router.get(
  '/:mid',
  validateParamsSchema(getMissionSchema),
  missionController.getMissionByMid,
);

/// POST
//Create mission
router.post(
  '/',
  upload.array('photos', 5),
  dynamicValidation,
  validateFilesSchema(publishMissionFilesSchema),
  missionController.publishMission,
);

//------------
//List all draft missions
router.get('/in-draft', missionController.getAllMissionsInDraft);

//Closes a mission
router.post(
  '/:mid/close',
  validateParamsSchema(closeMissionParamSchema),
  missionController.close,
);

// Joins an adventurer into a mission
router.post(
  '/:mid/join',
  validateParamsSchema(joinMissionParamSchema),
  validateBodySchema(joinMissionBodySchema),
  missionController.joinMission,
);

// Create a notification
router.post(
  '/invite',
  validateBodySchema(inviteToMissionSchema),
  missionController.inviteToMission,
);

// Submits current adventurer participation for owner review
router.post(
  '/:mid/submit',
  validateParamsSchema(submitMissionParticipationSchema),
  missionController.submitMissionParticipation,
);

// Cancels a mission
router.post(
  '/:mid/cancel',
  validateParamsSchema(cancelMissionParamSchema),
  missionController.cancelMission,
);

// Reopens a mission
router.post(
  '/:mid/reopen',
  validateParamsSchema(reopenMissionParamSchema),
  missionController.reopenMission,
);

// Reopens a mission
router.post(
  '/:mid/finish',
  validateParamsSchema(finishMissionParamSchema),
  missionController.finishMission,
);

// Bans mission
router.post(
  '/:mid/ban',
  verifyAdmin,
  validateParamsSchema(banMissionParamsSchema),
  validateBodySchema(banMissionBodySchema),
  missionController.banMission,
);

// Kicks an adventurer out
router.post(
  '/:mid/kick/:vacancyId',
  verifyAdmin,
  validateParamsSchema(kickAdventurerOutParamsSchema),
  validateBodySchema(kickAdventurerOutBodySchema),
  missionController.kickAdventurerOut,
);

//Edit mission
router.post(
  '/:mid',
  upload.array('photos', 5),
  validateParamsSchema(editMissionParamSchema),
  validateBodySchema(editMissionBodySchema),
  validateFilesSchema(editMissionFilesSchema),
  missionController.editMission,
);

/// PUT

//Update mission
//Router.put('/:id', dynamicValidation, updateMission);

// Joins an adventurer into a mission
router.delete(
  '/:mid/unjoin',
  validateParamsSchema(unjoinMissionParamSchema),
  validateBodySchema(unjoinMissionBodySchema),
  missionController.unjoinMission,
);

export default router;
