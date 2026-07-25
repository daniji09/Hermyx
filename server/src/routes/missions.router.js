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
  reviewAdventurer,
  reviewOwner,
  banMission,
} from '../controllers/missions.controller.js';

import {
  validateBodySchema,
  validateQuerySchema,
  validateParamsSchema,
} from '../middlewares/validations.middleware.js';

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
  reviewAdventurerParamSchema,
  reviewAdventurerBodySchema,
  reviewOwnerParamSchema,
  banMissionParamsSchema,
  banMissionBodySchema,
} from '@hermyx/shared';
import { pagination } from '../middlewares/pagination.middleware.js';
import { inviteToMission } from './../controllers/missions.controller.js';
import { verifyAdmin } from '../middlewares/auth.middleware.js';

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
router.post('/', dynamicValidation, createMission);

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

// Reviews an adventurer after a completed mission
router.post(
  '/:mid/adventurers/:adventurerId/review',
  validateParamsSchema(reviewAdventurerParamSchema),
  validateBodySchema(reviewAdventurerBodySchema),
  reviewAdventurer,
);

// Reviews a mission owner after a completed participation
router.post(
  '/:mid/owner/review',
  validateParamsSchema(reviewOwnerParamSchema),
  validateBodySchema(reviewAdventurerBodySchema),
  reviewOwner,
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
  validateParamsSchema(banMissionParamsSchema),
  validateBodySchema(banMissionBodySchema),
  verifyAdmin,
  banMission,
);

//Edit mission
router.post(
  '/:mid',
  validateParamsSchema(editMissionParamSchema),
  validateBodySchema(editMissionBodySchema),
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
