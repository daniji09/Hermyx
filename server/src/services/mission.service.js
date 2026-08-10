import { messages } from '@hermyx/shared';
import { AppError } from '../utils/error.util.js';
import * as missionModel from '../models/mission.model.js';

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

/// Data checks
const checkTitle = (title) => {
  if (!title) throw new Error(messages.GENERAL.FIELD_REQUIRED('Title'));
};

const checkUid = (uid) => {
  if (!uid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Uid'));
};
