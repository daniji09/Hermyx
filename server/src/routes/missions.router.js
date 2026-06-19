// External modules
import { Router } from 'express';
const router = Router();
import {
  createMission,
  getMissions,
  getAllMissionsInDraft,
  getMissionById,
  // UpdateMission,
  deleteMission,
  start,
  joinMission,
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
  joinMissionSchema,
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

//Get mission by id
router.get('/:id', validateParamsSchema(getMissionSchema), getMissionById);

/// POST

//Create mission
router.post('/', dynamicValidation, createMission);

//Starts a mission
router.post('/:missionId/start', start);

// Joins an adventurer into a mission
router.post('/:mid/join', validateParamsSchema(joinMissionSchema), joinMission);

/// PUT

//Update mission
//Router.put('/:id', dynamicValidation, updateMission);

/// DELETE

//Delete mission
router.delete('/:id', deleteMission);

export default router;
