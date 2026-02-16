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
} from '../controllers/mission.controller.js';

//Create mission
router.post('/', createMission);

//List all missions
router.get('/', getAllMissions);

//List all draft missions
router.get('/in-draft', getAllMissionsInDraft);

//Get mission by id
router.get('/:missionId', getMissionById);

//Update mission
router.put('/:missionId', updateMission);

//Delete mission
router.delete('/:missionId', deleteMission);

//Close a mission
router.post('/:missionId/close', close);

export default router;
