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
  closeMission,
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
  closeMissionSchema,
} from '@hermyx/shared';
import { pagination } from '../middlewares/pagination.middleware.js';

//Dynamic middleware to decide which schema to use
const dynamicValidation = (req, res, next) => {
  const isDraft = req.body.isDraft === true || req.body.isDraft === 'true';
  const schemaToUse = isDraft ? draftMissionSchema : publishMissionSchema;
  return validateBodySchema(schemaToUse)(req, res, next);
};

/// GET

//Get mission by id
router.get('/:id', validateParamsSchema(getMissionSchema), getMissionById);

//List all missions
router.get(
  '/',
  validateQuerySchema(getMissionsQuerySchema),
  await pagination(),
  getMissions,
);

//List all draft missions
router.get('/in-draft', getAllMissionsInDraft);

/// POST

//Create mission
router.post('/', dynamicValidation, createMission);

//Starts a mission
router.post('/:missionId/start', start);

// Joins an adventurer into a mission
router.post('/:mid/join', validateParamsSchema(joinMissionSchema), joinMission);

// Closes a mission
router.post(
  '/:mid/close',
  validateParamsSchema(closeMissionSchema),
  closeMission,
);

/// PUT

//Update mission
//Router.put('/:id', dynamicValidation, updateMission);

/// DELETE

//Delete mission
router.delete('/:id', deleteMission);

export default router;
