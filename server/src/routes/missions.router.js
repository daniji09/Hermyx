// External modules
import { Router } from 'express';
const router = Router();
import {
  createMission,
  getMissions,
  getAllMissionsInDraft,
  getMissionById,
  // UpdateMission,
  start,
  joinMission,
  submitMissionParticipation,
  getMissionsOpened,
  editMission,
  unjoinMission,
  cancelMission,
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
} from '@hermyx/shared';
import { pagination } from '../middlewares/pagination.middleware.js';

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

//Starts a mission
router.post('/:missionId/start', start);

// Joins an adventurer into a mission
router.post(
  '/:mid/join',
  validateParamsSchema(joinMissionParamSchema),
  validateBodySchema(joinMissionBodySchema),
  joinMission,
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
