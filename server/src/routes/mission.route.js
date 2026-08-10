// External modules
import { Router } from 'express';
const router = Router();
import {
  createMission,
  getMissions,
  getAllMissionsInDraft,
  getMissionById,
  // UpdateMission,
  joinMission,
  submitMissionParticipation,
  getMissionsOpened,
  editMission,
  unjoinMission,
  cancelMission,
  reopenMission,
  close,
  finishMission,
  banMission,
  kickAdventurerOut,
} from '../controllers/mission.controller.js';

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
} from '@hermyx/shared';
import { pagination } from '../middlewares/pagination.middleware.js';
import { inviteToMission } from '../controllers/mission.controller.js';
import { verifyAdmin } from '../middlewares/auth.middleware.js';
import { upload } from '../utils/file.utils.js';

//Dynamic middleware to decide which schema to use
const dynamicValidation = (req, res, next) => {
  const isDraft = req.body.isDraft === true || req.body.isDraft === 'true';
  const schemaToUse = isDraft ? draftMissionSchema : publishMissionSchema;
  return validateBodySchema(schemaToUse)(req, res, next);
};

/// GET

//List all missions
router.get(
  '/',
  validateQuerySchema(getMissionsQuerySchema),
  await pagination(),
  getMissions,
);

//List all draft missions
router.get('/in-draft', getAllMissionsInDraft);

// List all opened missions
router.get(
  '/opened',
  validateQuerySchema(getMissionsQuerySchema),
  await pagination(),
  getMissionsOpened,
);

//Get mission by id
router.get('/:id', validateParamsSchema(getMissionSchema), getMissionById);

/// POST

//Create mission
router.post(
  '/',
  upload.array('photos', 5),
  dynamicValidation,
  validateFilesSchema(publishMissionFilesSchema),
  createMission,
);

//Closes a mission
router.post(
  '/:mid/close',
  validateParamsSchema(closeMissionParamSchema),
  close,
);

// Joins an adventurer into a mission
router.post(
  '/:mid/join',
  validateParamsSchema(joinMissionParamSchema),
  validateBodySchema(joinMissionBodySchema),
  joinMission,
);

// Create a notification
router.post(
  '/invite',
  validateBodySchema(inviteToMissionSchema),
  inviteToMission,
);

// Submits current adventurer participation for owner review
router.post(
  '/:mid/submit',
  validateParamsSchema(submitMissionParticipationSchema),
  submitMissionParticipation,
);

// Cancels a mission
router.post(
  '/:mid/cancel',
  validateParamsSchema(cancelMissionParamSchema),
  cancelMission,
);

// Reopens a mission
router.post(
  '/:mid/reopen',
  validateParamsSchema(reopenMissionParamSchema),
  reopenMission,
);

// Reopens a mission
router.post(
  '/:mid/finish',
  validateParamsSchema(finishMissionParamSchema),
  finishMission,
);

// Bans mission
router.post(
  '/:mid/ban',
  verifyAdmin,
  validateParamsSchema(banMissionParamsSchema),
  validateBodySchema(banMissionBodySchema),
  banMission,
);

// Kicks an adventurer out
router.post(
  '/:mid/kick/:vacancyId',
  verifyAdmin,
  validateParamsSchema(kickAdventurerOutParamsSchema),
  validateBodySchema(kickAdventurerOutBodySchema),
  kickAdventurerOut,
);

//Edit mission
router.post(
  '/:mid',
  upload.array('photos', 5),
  validateParamsSchema(editMissionParamSchema),
  validateBodySchema(editMissionBodySchema),
  validateFilesSchema(editMissionFilesSchema),
  editMission,
);

/// PUT

//Update mission
//Router.put('/:id', dynamicValidation, updateMission);

// Joins an adventurer into a mission
router.delete(
  '/:mid/unjoin',
  validateParamsSchema(unjoinMissionParamSchema),
  validateBodySchema(unjoinMissionBodySchema),
  unjoinMission,
);

export default router;
