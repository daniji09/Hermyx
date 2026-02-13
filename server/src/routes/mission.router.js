// External modules
const express = require("express");
const router = express.Router();
const missionController = require("../controllers/mission.controller");


//create mission
router.post("/", missionController.createMission);

//list all missions
router.get("/", missionController.getAllMissions);

//list all draft missions
router.get("/in-draft", missionController.getAllMissionsInDraft);

//get mission by id
router.get("/:missionId", missionController.getMissionById);

//update mission
router.put("/:missionId", missionController.updateMission);

//delete mission
router.delete("/:missionId", missionController.deleteMission);

//close a mission
router.post("/:missionId/close", missionController.close);
