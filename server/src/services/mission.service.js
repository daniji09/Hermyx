import {
  consts,
  messages,
  MISSION_PARTICIPATION_STATUS,
  MISSION_STATUS,
} from '@hermyx/shared';
import { AppError } from '../utils/error.util.js';
import * as conversationService from '../services/conversation.service.js';
import * as storageProvider from '../providers/storage.provider.js';
import * as missionModel from '../models/mission.model.js';
import * as missionParticipationModel from '../models/mission-participation.model.js';
import * as missionPhotoModel from '../models/mission-photo.model.js';
import pool from '../config/db.config.js';

/// Model access functions
// Missions published by uid
export const getMissionsPublishedByUid = async (uid, pagination) => {
  checkUid(uid);

  // Finds missions created by uid
  const result = await missionModel.findPublishedByUid(uid, pagination);
  return result;
};

// Missions joined by uid
export const getMissionsJoinedByUid = async (uid, pagination) => {
  checkUid(uid);

  // Finds missions joined by uid
  const result = await missionModel.findJoinedByUid(uid, pagination);
  return result;
};

// Public missions published by uid
export const getMissionsPublicPublishedByUid = async (uid, pagination) => {
  checkUid(uid);

  // Finds public missions created by uid
  const result = await missionModel.findPublicPublishedByUid(uid, pagination);
  return result;
};

// Public missions joined by uid
export const getMissionsPublicJoinedByUid = async (uid, pagination) => {
  checkUid(uid);

  // Finds public missions joined by uid
  const result = await missionModel.findPublicJoinedByUid(uid, pagination);
  return result;
};

/// Endpoint complex functions
// Get all missions
export const getMissions = async (title, pagination) => {
  // Gets all missions filtering what is needed
  const { rows: missions, totalCount } = await missionModel.findAll({
    title,
    pagination,
  });

  const totalItems = parseInt(totalCount);

  if (missions && pagination) {
    const totalPages = Math.ceil(totalItems / pagination.limit);
    const hasMore = pagination.page < totalPages;

    // Pagination object is built
    return {
      missions,
      paginationData: {
        currentPage: pagination.page,
        totalPages: totalPages,
        totalItems: totalItems,
        hasMore: hasMore,
      },
    };
  } else if (missions && !pagination) {
    return { missions };
  } else
    throw new AppError(
      messages.MISSION.GENERAL.MISSIONS_NOT_FOUND,
      404,
      'general',
    );
};

// Get all opened missions
export const getOpenedMissions = async (
  title,
  minPayment,
  maxPayment,
  maxDistanceKm,
  pagination,
  excludeOwnerId,
  user,
) => {
  // Gets all missions filtering what is needed
  const { rows: missions, totalCount } = await missionModel.findAllOpened({
    title,
    minPayment,
    maxPayment,
    maxDistanceKm,
    originUserId: maxDistanceKm !== undefined ? user.uid : undefined,
    pagination,
    excludeOwnerId,
  });

  const totalItems = parseInt(totalCount);

  if (missions && pagination) {
    const totalPages = Math.ceil(totalItems / pagination.limit);
    const hasMore = pagination.page < totalPages;

    // Pagination object is built
    return {
      missions,
      paginationData: {
        currentPage: pagination.page,
        totalPages: totalPages,
        totalItems: totalItems,
        hasMore: hasMore,
      },
    };
  } else if (missions && !pagination) {
    return { missions };
  } else
    throw new AppError(
      messages.MISSION.GENERAL.MISSIONS_NOT_FOUND,
      404,
      'general',
    );
};

// Get mission by mid
export const getMissionByMid = async (mid, uid) => {
  checkUid(uid);
  checkMid(mid);

  // Searches mission by id
  const [mission, participants, waitingForPaymentVacancies, photos] =
    await Promise.all([
      missionModel.findByMid(mid, uid),
      missionParticipationModel.findAllByMid(mid),
      missionParticipationModel.findAllWaitingForPaymentByMid(mid),
      missionPhotoModel.findAllByMid(mid),
    ]);

  // Returns success or error
  if (!mission) throw buildMissionNotFoundError();

  // Mission can be finished if all vacancies are empty or finished
  const canFinish =
    participants.every(
      (participant) =>
        participant.status === MISSION_PARTICIPATION_STATUS.EMPTY.ID ||
        participant.status === MISSION_PARTICIPATION_STATUS.RELEASED.ID,
    ) &&
    MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
      MISSION_STATUS.FINISHED.ID,
    );

  return {
    mission: {
      ...mission,
      participants,
      waitingForPaymentVacancies,
      canFinish,
      photos,
    },
  };
};

// Publish mission
export const publishMission = async (
  uid,
  title,
  description,
  vacancies,
  vacanciesData,
  latitude,
  longitude,
  photos,
) => {
  checkUid(uid);
  checkTitle(title);
  checkDescription(description);
  checkVacancies(vacancies);
  checkVacanciesData(vacanciesData);
  // Checks if photo number is correct
  if (photos.length > consts.MISSION.PHOTOS.MAX) {
    throw new AppError(messages.GENERAL.TOO_MANY_FILES, 400, 'photos');
  }

  // Checks if user has a mission already with the same title
  const { hasDuplicate } = await missionModel.findByUidAndTitle(uid, title);
  if (hasDuplicate)
    throw new AppError(messages.MISSION.PUBLISH.MISSION_WITH_SAME_TITLE, 400);

  // Saves photos
  let uploadedPhotoUrls = [];
  if (photos.length > 0) {
    // Environment variable determines whether photos are uploaded locally or to Azure
    const isProduction = process.env.NODE_ENV === 'production';
    uploadedPhotoUrls = await Promise.all(
      photos.map(async (file) => {
        if (isProduction) {
          return await storageProvider.uploadToAzureBlob(
            file,
            'mission-photos',
          );
        } else {
          return await storageProvider.saveToLocalStorage(
            file,
            'uploads/mission-photos',
          );
        }
      }),
    );
  }

  // Mission data
  const missionData = {
    title: title || 'Mission not titled',
    description: description || 'No description',
    vacancies: vacancies || 0,
    vacanciesData: vacanciesData || '',
    totalPayment: 0,
    latitude: latitude || null,
    longitude: longitude || null,
    status: MISSION_STATUS.OPENED.ID,
    ownerId: uid,
  };

  // Database transaction is needed to insert all information successfully
  const client = await pool.connect();
  try {
    // Transaction starts
    await client.query('BEGIN');

    // Creates the new mission
    const newMission = await missionModel.create(missionData, client);

    // Creates vacancies for mission
    for (const vacancy of vacanciesData) {
      await missionParticipationModel.create(newMission.mid, vacancy, client);
    }

    // Creates conversation
    const conversation = await conversationService.createConversation(
      newMission.mid,
      client,
    );

    // Creates conversation participant
    await conversationService.createConversationParticipant(
      conversation.cid,
      uid,
      client,
    );

    // Creates photos
    for (const photoURL of uploadedPhotoUrls)
      await missionPhotoModel.create(newMission.mid, photoURL, client);

    // Commits
    await client.query('COMMIT');
    return newMission;
  } catch (error) {
    // Transaction rollbacks
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Either way, connection is always released
    client.release();
  }
};

/// Data checks
const checkMid = (mid) => {
  if (!mid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Mid'));
};

const checkTitle = (title) => {
  if (!title) throw new Error(messages.GENERAL.FIELD_REQUIRED('Title'));
};

const checkDescription = (description) => {
  if (!description)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Description'));
};

const checkVacancies = (vacancies) => {
  if (!vacancies) throw new Error(messages.GENERAL.FIELD_REQUIRED('Vacancies'));
};

const checkVacanciesData = (vacanciesData) => {
  if (!vacanciesData)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Vacancies data'));
};

const checkLatitude = (latitude) => {
  if (!latitude) throw new Error(messages.GENERAL.FIELD_REQUIRED('Latitude'));
};

const checkLongitude = (longitude) => {
  if (!longitude) throw new Error(messages.GENERAL.FIELD_REQUIRED('Longitude'));
};

const checkPhotos = (photos) => {
  if (!photos) throw new Error(messages.GENERAL.FIELD_REQUIRED('Photos'));
};

const checkUid = (uid) => {
  if (!uid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Uid'));
};

/// Error builders
const buildMissionNotFoundError = () => {
  return new AppError(messages.MISSION.GENERAL.MISSION_NOT_FOUND, 404);
};
