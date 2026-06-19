//External modules
import { messages } from '@hermyx/shared';
import {
  createMission as _createMission,
  getAllMissionsInDraft as _getAllMissionsInDraft,
  getMissionById as _getMissionById,
  deleteMission as _deleteMission,
  getMissions as _getMissions,
  getById,
  getParticipantsForRelease,
  adventurerJoined,
  updateMissionStatus,
  getByUidAndTitle,
  closeMission as _closeMission,
} from '../models/mission.model.js';

import {
  addParticipant,
  deleteParticipant,
  getById as getMissionParticipationById,
} from '../models/mission_participation.model.js';

export const getMissionById = async (req, res) => {
  try {
    // Gets the id
    const { id } = req.params;
    const uid = req.user.uid;

    // Searches mission by id
    const mission = await _getMissionById(id, uid);

    // Returns success or error
    if (!mission) {
      return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
    }

    return res.status(200).json({ mission: mission });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

export const getMissions = async (req, res) => {
  const { title } = req.query;
  const pagination = req.pagination;

  try {
    // Gets all missions filtering what is needed
    const { rows: missions, totalCount } = await _getMissions({
      title,
      pagination,
    });

    const totalItems = parseInt(totalCount);

    if (missions) {
      const totalPages = Math.ceil(totalItems / pagination.limit);
      const hasMore = pagination.page < totalPages;

      // Pagination object is built
      return res.status(200).json({
        missions,
        pagination: {
          currentPage: pagination.page,
          totalPages: totalPages,
          totalItems: totalItems,
          hasMore: hasMore,
        },
      });
    } else
      return res.status(404).json({
        errors: { general: [messages.MISSIONS_NOT_FOUND] },
      });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

export const getAllMissionsInDraft = async (req, res) => {
  try {
    const missions = await _getAllMissionsInDraft();
    res.status(200).json({ data: missions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

/*Check whether the user wants to save the creation or create a new mission. 
Depending on that, the fields are checked or not, and the status is updated accordingly.*/
export const createMission = async (req, res) => {
  try {
    const { uid } = req.user;

    const { title, description, vacancies, reward, difficulty, isDraft } =
      req.body;

    const missionData = {
      title: title || 'Mission not titled',
      description: description || 'No description',
      vacancies: vacancies || 0,
      reward: reward || 0,
      difficulty: difficulty || 0,
      status: isDraft ? 'draft' : 'pending_payment',
      ownerId: uid,
    };

    // Checks if user has a mission already with the same title
    const { hasDuplicate } = await getByUidAndTitle(uid, title);

    if (hasDuplicate)
      return res.status(400).json({
        errors: { general: [messages.MISSION_SAME_TITLE] },
      });

    const newMission = await _createMission(missionData);

    return res.status(201).json({ mission: newMission });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

/*Verify that the owner of the mission is the one deleting it and that at least one person is assigned to close the mission.*/
export const start = async (req, res) => {
  const { missionId } = req.params;
  const userId = req.user.uid;

  try {
    const mission = await getById(missionId);
    if (!mission) {
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });
    }

    if (mission.owner_id !== userId) {
      return res.status(403).json({ error: messages.UNAUTHORIZED_ERROR });
    }

    const currentParticipants = (await getParticipantsForRelease(missionId))
      .length;

    if (currentParticipants === 0) {
      return res
        .status(400)
        .json({ error: messages.START_WITHOUT_ADVENTURERS });
    }

    await updateMissionStatus(missionId, 'in_progress');

    return res.status(200).json({
      status: 'in:progress',
      participants: currentParticipants,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Joins an adventurer into a mission, verifying its not their own and there are vacancies available
export const joinMission = async (req, res) => {
  const { mid } = req.params;
  const uid = req.user.uid;

  try {
    // Mission is searched
    const mission = await getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission was created by the current user
    if (mission.owner_id === uid)
      return res.status(403).json({ error: messages.JOIN_OWN_MISSION });

    // Checks if mission is already full
    if (mission.occupied_vacancies === mission.total_vacancies)
      return res.status(409).json({
        error: messages.MISSION_FILLED,
      });

    // Checks if user has already joined that mission
    const already_joined = await getMissionParticipationById(mid, uid);
    if (already_joined >= 1) {
      return res.status(409).json({ error: messages.MISSION_ALREADY_JOINED });
    }

    // If everything is correct, the user joins the mission, updating it
    const mission_join = await addParticipant(mid, uid);

    if (!mission_join)
      return res.status(500).json({
        error: messages.UNEXPECTED_ERROR,
      });

    // So the mission's occupied vacancies are updated
    const mission_update = await adventurerJoined(mid);

    if (!mission_update) {
      const deleted_participant = await deleteParticipant(mid, uid);

      if (deleted_participant) {
        return res.status(500).json({
          error: messages.UNEXPECTED_ERROR,
        });
      }
    } else {
      return res.status(200).json({ mission });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Closes a mission
export const closeMission = async (req, res) => {
  const { mid } = req.params;
  const userId = req.user.uid;

  try {
    const mission = await getById(mid);
    if (!mission) {
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });
    }

    if (mission.owner_id !== userId) {
      return res.status(403).json({ error: messages.UNAUTHORIZED_ERROR });
    }

    await _closeMission(mid);

    return res.status(200).json({
      mission,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

/*
Export const updateMission = async (req, res) => {
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
};*/

export const deleteMission = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMission = await _deleteMission(id);
    if (!deletedMission) {
      return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
    } else {
      res.status(200).json({
        data: deletedMission,
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};
