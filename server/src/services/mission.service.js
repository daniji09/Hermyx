import { messages } from '@hermyx/shared';
import * as missionModel from '../models/mission.model.js';
import { AppError } from '../utils/error.util.js';

// Gets the missions from the user, joined or published
export const getUserMissions = async (uid, type, pagination) => {
  checkUid(uid);
  checkType(type);
  checkPagination(pagination);

  let result;

  if (type === 'published') {
    result = await missionModel.findCreatedByUid(uid, pagination);
  } else if (type === 'joined') {
    result = await missionModel.findJoinedByUid(uid, pagination);
  } else {
    throw new AppError(
      messages.USER.GET_USER_MISSIONS.INVALID_MISSION_TYPE,
      400,
    );
  }
  const missions = result.rows;
  const totalItems = parseInt(result.totalCount);

  if (missions) {
    const totalPages = Math.ceil(totalItems / pagination.limit);
    const hasMore = pagination.page < totalPages;

    // Pagination object is built
    return {
      missions,
      pagination: {
        currentPage: pagination.page,
        totalPages: totalPages,
        totalItems: totalItems,
        hasMore: hasMore,
      },
    };
  }

  throw new AppError(
    messages.MISSION.GENERAL.MISSIONS_NOT_FOUND,
    404,
    'general',
  );
};

/// Data checks
const checkUid = (uid) => {
  if (!uid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Uid'));
};

const checkPagination = (pagination) => {
  if (!pagination)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Pagination'));
};

const checkType = (type) => {
  if (!type) throw new Error(messages.GENERAL.FIELD_REQUIRED('Type'));
};
