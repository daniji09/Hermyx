//External modules
import * as missionService from '../services/mission.service.js';

/// Controller functions
// Get all missions
export const getMissions = async (req, res, next) => {
  try {
    const { title } = req.query;
    const pagination = req.pagination;
    const { missions, paginationData } = await missionService.getMissions(
      title,
      pagination,
    );
    return res.status(200).json({ missions, pagination: paginationData });
  } catch (error) {
    next(error);
  }
};

// Get all opened missions
export const getMissionsOpened = async (req, res, next) => {
  try {
    const { title, minPayment, maxPayment, maxDistanceKm } = req.query;
    const pagination = req.pagination;
    const excludeOwnerId = title ? req.user?.uid : undefined;
    const user = req.user;
    const { missions, paginationData } = await missionService.getOpenedMissions(
      title,
      minPayment,
      maxPayment,
      maxDistanceKm,
      pagination,
      excludeOwnerId,
      user,
    );
    return res.status(200).json({ missions, pagination: paginationData });
  } catch (error) {
    next(error);
  }
};

// Get mission by mid
export const getMissionByMid = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const uid = req.user.uid;
    const mission = await missionService.getMissionByMid(mid, uid);
    return res.status(200).json(mission);
  } catch (error) {
    next(error);
  }
};

// Publishes mission
export const publishMission = async (req, res, next) => {
  try {
    const { uid } = req.user;
    const {
      title,
      description,
      vacancies,
      vacanciesData,
      latitude,
      longitude,
    } = req.body;
    const photos = req.files.photos || [];
    const mission = await missionService.publishMission(
      uid,
      title,
      description,
      vacancies,
      vacanciesData || [],
      latitude,
      longitude,
      photos,
    );
    return res.status(201).json({ mission });
  } catch (error) {
    next(error);
  }
};

// Closes a mission
export const closeMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { status, participants } = await missionService.closeMission(
      mid,
      req.user,
    );
    return res.status(200).json({ status, participants });
  } catch (error) {
    next(error);
  }
};

// Receives missionId, senderId and receiverId, prepares the data, and creates a notification.
export const inviteToMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { receiverId, vacancyId, message } = req.body;
    const nid = await missionService.inviteToMission(
      mid,
      vacancyId,
      req.user.uid,
      receiverId,
      message,
      req.user,
    );
    return res.status(200).json(nid);
  } catch (error) {
    next(error);
  }
};

// Sends a join request to the mission owner instead of joining immediately
export const joinMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { message, vacancyId } = req.body;
    await missionService.joinMission(mid, req.user, message, vacancyId);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Unjoin mission by adventurer before mission has started
export const unjoinMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { vacancyId } = req.body;
    await missionService.unjoinMission(mid, vacancyId, req.user);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Submit participation
export const submitMissionParticipation = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const updatedParticipation =
      await missionService.submitMissionParticipation(mid, req.user);
    return res.status(200).json({
      participation: updatedParticipation,
    });
  } catch (error) {
    next(error);
  }
};

// Cancels or deletes mission
export const cancelMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    await missionService.cancelMission(mid, req.user);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Reopens mission
export const reopenMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    await missionService.reopenMission(mid, req.user);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Finishes mission
export const finishMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    await missionService.finishMission(mid, req.user);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Bans mission
export const banMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { rid, reason } = req.body;
    await missionService.banMission(req.user, mid, rid, reason);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Kick adventurer out
export const kickAdventurerOut = async (req, res, next) => {
  try {
    const { mid, vacancyId } = req.params;
    const { rid, reason } = req.body;
    await missionService.kickAdventurerOut(
      req.user,
      mid,
      vacancyId,
      rid,
      reason,
    );
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Edits a mission
export const editMission = async (req, res, next) => {
  try {
    const user = req.user;
    const mission = req.body;

    // New and old photos are extracted
    const newPhotos = req.files?.photos
      ? Array.isArray(req.files.photos)
        ? req.files.photos
        : [req.files.photos]
      : [];
    const existingPhotos = req.body.existingPhotos
      ? Array.isArray(req.body.existingPhotos)
        ? req.body.existingPhotos
        : [req.body.existingPhotos]
      : [];
    const newMission = await missionService.editMission(
      user,
      mission,
      newPhotos,
      existingPhotos,
    );
    return res.status(200).json({ mission: newMission });
  } catch (error) {
    next(error);
  }
};
