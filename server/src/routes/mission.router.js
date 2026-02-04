// External modules
const express = require("express");
const router = express.Router();
const missionController = require("../controllers/mission.controller");

router.post("/", missionController.createMission);
router.get("/", missionController.getAllMissions);
router.get("/in-draft", missionController.getAllMissionsInProgress);
router.get("/:missionId", missionController.getMissionById);
router.put("/:missionId", missionController.updateMission);
router.delete("/:missionId", missionController.deleteMission);