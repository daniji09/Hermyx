//External modules
import { messages } from '@hermyx/shared';
import {
  createMission as _createMission,
  getAllMissions as _getAllMissions,
  getAllMissionsInDraft as _getAllMissionsInDraft,
  getMissionById as _getMissionById,
  updateMission as _updateMission,
  deleteMission as _deleteMission,
  getById,
  getParticipantsForRelease,
} from '../models/mission.model.js';

/*Check whether the user wants to save the creation or create a new mission. 
Depending on that, the fields are checked or not, and the status is updated accordingly.*/
export const createMission = async (req, res) => {
  try {
    const { uid } = req.user;

    const { title, description, vacancies, reward, difficulty, isDraft } =
      req.body;

    const missionData = {
      title: title || 'Mission not titled',
      description: description || '',
      vacancies: vacancies || 0,
      reward: reward || 0,
      difficulty: difficulty || 0,
      status: isDraft ? 'draft' : 'pending_payment',
      ownerId: uid,
    };

    const newMission = await _createMission(missionData);

    return res
      .status(201)
      .json({ data: newMission, message: 'Mission created successfully' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error creating mission' });
  }
};

export const getAllMissions = async (req, res) => {
  try {
    // Get all missions paginated
    if (req.query.page && req.query.limit) {
      if (!res.paginationResults || res.paginationResults.length === 0)
        return res.status(404).json({
          errors: { general: [messages.NO_MISSIONS] },
        });

      return res
        .status(200)
        .json({ missions: res.paginationResults, pagination: res.pagination });
    }

    // Just get all missions
    else {
      const missions = await _getAllMissions();

      if (!missions)
        return res.status(404).json({
          errors: { general: [messages.NO_MISSIONS] },
        });

      return res.status(200).json({ missions });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error fetching missions' });
  }
};

export const getAllMissionsInDraft = async (req, res) => {
  try {
    const missions = await _getAllMissionsInDraft();
    res
      .status(200)
      .json({ data: missions, message: 'Missions retrieved successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error fetching missions' });
  }
};

export const getMissionById = async (req, res) => {
  try {
    // Gets the id
    const { id } = req.params;

    // Searches mission by id
    const mission = await _getMissionById(id);

    // Returns success or error
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    return res.status(200).json({ mission: mission });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

export const updateMission = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, vacancies, reward, difficulty, isDraft } =
      req.body;

    const updateData = {
      title: title || 'Mission not titled',
      publication_date: Date.now(),
      description: description || '',
      vacancies: vacancies || 0,
      reward: reward || 0,
      difficulty: difficulty || 0,
      status: isDraft ? 'draft' : 'pending_payment',
    };

    const updatedMission = await _updateMission(id, updateData);

    if (!updatedMission) {
      return res.status(404).json({ error: 'Mission not found' });
    } else {
      return res.status(200).json({
        data: updatedMission,
        message: 'Mission updated successfully',
      });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error updating mission' });
  }
};

export const deleteMission = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMission = await _deleteMission(id);
    if (!deletedMission) {
      return res.status(404).json({ error: 'Mission not found' });
    } else {
      res.status(200).json({
        data: deletedMission,
        message: 'Mission deleted successfully',
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error deleting mission' });
  }
};

/*Verify that the owner of the mission is the one deleting it and that at least one person is assigned to close the mission.*/
export const close = async (req, res) => {
  const { missionId } = req.params;
  const userId = req.user.uid;

  try {
    const mission = await getById(missionId);
    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    if (mission.owner_id !== userId) {
      return res
        .status(403)
        .json({ error: 'You do not hace permission to close this mission.' });
    }

    const currentParticipants = (await getParticipantsForRelease(missionId))
      .length;

    if (currentParticipants === 0) {
      return res
        .status(400)
        .json({ error: 'You cannot close a mission without adventurers' });
    }

    await _updateMission(missionId, 'in_progress');

    return res.status(200).json({
      message: 'Mission closed.',
      status: 'in:progress',
      participants: currentParticipants,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno' });
  }
};
