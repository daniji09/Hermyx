//External modules
const missionModel = require("../models/mission.model");

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

module.exports = {
  createMission,
  getAllMissions,
  getAllMissionsInDraft,
  getMissionById,
  updateMission,
  deleteMission,
};
