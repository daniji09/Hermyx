// External modules
import { Router } from 'express';
const router = Router();
import {
  createMission,
  getAllMissions,
  getAllMissionsInDraft,
  getMissionById,
  updateMission,
  deleteMission,
  close,
} from '../controllers/missions.controller.js';

import {
  validateBodySchema,
  validateParamsSchema,
} from '../middlewares/validations.middleware.js';

import {
  publishMissionServerSchema,
  draftMissionServerSchema,
  getMissionSchema,
} from '@hermyx/shared';

//Dynamic middleware to decide which schema to use
const dynamicValidation = (req, res, next) => {
  const isDraft = req.body.isDraft === true || req.body.isDraft === 'true';
  const schemaToUse = isDraft
    ? draftMissionServerSchema
    : publishMissionServerSchema;
  return validateBodySchema(schemaToUse)(req, res, next);
};

//Create mission
router.post('/', dynamicValidation, createMission);

//List all missions
router.get('/', getAllMissions);

//List all draft missions
router.get('/in-draft', getAllMissionsInDraft);

//Get mission by id
router.get('/:id', validateParamsSchema(getMissionSchema), getMissionById);

//Update mission
router.put('/:missionId', dynamicValidation, updateMission);

//Delete mission
router.delete('/:missionId', deleteMission);

//Close a mission
router.post('/:missionId/close', close);

export default router;
