//External modules
const missionModel = require("../models/mission.model");

//check that these fields are not empty
const validateMission = (title, description, vacancies, reward) => {
  if (
    !title ||
    title.trim().length === 0 ||
    !description ||
    description.trim().length === 0 ||
    vacancies == "" ||
    vacancies === null ||
    vacancies === undefined ||
    reward == "" ||
    reward === null ||
    reward === undefined
  ) {
    return "Missing required fields";
  }

  if (vacancies < 0 || reward < 0) {
    return "Vacancies and reward must be non-negative";
  }
};

/*Check whether the user wants to save the creation or create a new mission. 
Depending on that, the fields are checked or not, and the status is updated accordingly.*/
const createMission = async (req, res) => {
  try {
    const { uid } = req.user;

    const { title, description, vacancies, reward, isDraft } = req.body;

    if (!isDraft) {
      const error = validateMission(title, description, vacancies, reward);

      if (error) {
        return res.status(400).json({ error });
      }
    }

    const missionData = {
      title: title || "Mission not titled",
      description: description || "",
      vacancies: vacancies || 0,
      reward: reward || 0,
      status: isDraft ? "draft" : "pending_payment",
      ownerId: uid,
    };

    const newMission = await missionModel.createMission(missionData);

    res
      .status(201)
      .json({ data: newMission, message: "Mission created successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error creating mission" });
  }
};

const getAllMissions = async (req, res) => {
  try {
    const missions = await missionModel.getAllMissions();
    res
      .status(200)
      .json({ data: missions, message: "Missions retrieved successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error fetching missions" });
  }
};

const getAllMissionsInDraft = async (req, res) => {
  try {
    const missions = await missionModel.getAllMissionsInDraft();
    res
      .status(200)
      .json({ data: missions, message: "Missions retrieved successfully" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error fetching missions" });
  }
};

const getMissionById = async (req, res) => {
  try {
    const { missionId } = req.params;
    const mission = await missionModel.getMissionById(missionId);
    if (!mission) {
      return res.status(404).json({ error: "Mission not found" });
    } else {
      return res
        .status(200)
        .json({ data: mission, message: "Mission retrieved successfully" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error fetching mission" });
  }
};

const updateMission = async (req, res) => {
  try {
    const { missionId } = req.params;
    const { title, description, vacancies, reward, isDraft } = req.body;

    if (!isDraft) {
      const error = validateMission(title, description, vacancies, reward);
      if (error) {
        return res.status(400).json({ error });
      }
    }

    const updateData = {
      title: title || "Mission not titled",
      description: description || "",
      vacancies: vacancies || 0,
      reward: reward || 0,
    };

    const updatedMission = await missionModel.updateMission(
      missionId,
      updateData,
    );

    if (!updatedMission) {
      return res.status(404).json({ error: "Mission not found" });
    } else {
      res.status(200).json({
        data: updatedMission,
        message: "Mission updated successfully",
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error updating mission" });
  }
};

const deleteMission = async (req, res) => {
  try {
    const { missionId } = req.params;
    const deletedMission = await missionModel.deleteMission(missionId);
    if (!deletedMission) {
      return res.status(404).json({ error: "Mission not found" });
    } else {
      res.status(200).json({
        data: deletedMission,
        message: "Mission deleted successfully",
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error deleting mission" });
  }
};

/*Verify that the owner of the mission is the one deleting it and that at least one person is assigned to close the mission.*/
const close = async (req, res) => {
  const { missionId } = req.params;
  const userId = req.user.uid;

  try {
    const mission = await missionModel.getById(missionId);
    if (!mission) {
      return res.status(404).json({ error: "Mission not found" });
    }

    if (mission.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: "You do not hace permission to close this mission." });
    }

    const currentParticipants = (
      await missionModel.getParticipantsForRelease(missionId)
    ).length;

    if (currentParticipants === 0) {
      return res
        .status(400)
        .json({ error: "You cannot close a mission without adventurers" });
    }

    await missionModel.updateMission(missionId, "in_progress");

    return res.status(200).json({
      message: "Mision closed.",
      status: "in:progress",
      participants: currentParticipants,
    });
  } catch (error) {
    return res.status(500).json({ error: "Error interno" });
  }
};

module.exports = {
  createMission,
  getAllMissions,
  getAllMissionsInDraft,
  getMissionById,
  updateMission,
  deleteMission,
  close,
};
