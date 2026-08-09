import { messages } from '@hermyx/shared';
import { AppError } from '../utils/error.util.js';
import * as missionService from './mission.service.js';
import * as userModel from '../models/user.model.js';

/// Model access functions
// Create user
export const createUser = async (email, username, firebaseUid) => {
  checkEmail(email);
  checkUsername(username);
  checkFirebaseUid(firebaseUid);

  // Creates user
  const user = await userModel.create(email, username, firebaseUid);
  return user;
};

// Gets user by username
export const getUserByUsername = async (username) => {
  checkUsername(username);

  // Gets user by username
  const user = await userModel.findByUsername(username);
  return user;
};

export const getUserByUsernameOrThrow = async (username) => {
  const user = await getUserByUsername(username);
  if (!user)
    throw new AppError(
      messages.USER.USERNAME.USERNAME_NOT_FOUND(username),
      404,
    );
  return user;
};

// Gets user by email
export const getUserByEmail = async (email) => {
  checkEmail(email);

  // Gets user by email
  const user = await userModel.findByEmail(email);
  return user;
};

// Gets user by firebaseUid
export const getUserByFirebaseUid = async (firebaseUid) => {
  checkFirebaseUid(firebaseUid);

  // Gets user by firebaseUid
  const user = await userModel.findByFirebaseUid(firebaseUid);
  return user;
};

/// Endpoint complex functions
// Search user by username with partial matches
export const searchUserByUsername = async (
  username,
  currentUser,
  pagination,
) => {
  checkUsername(username);
  checkCurrentUser(currentUser);

  // Searches user by username
  const { rows: users, totalCount } = await userModel.searchByUsername({
    username,
    excludedUid: currentUser,
    pagination,
  });
  const totalItems = parseInt(totalCount);

  if (users && pagination) {
    const totalPages = Math.ceil(totalItems / pagination.limit);
    const hasMore = pagination.page < totalPages;

    // Pagination object is built
    return {
      users,
      pagination: {
        currentPage: pagination.page,
        totalPages: totalPages,
        totalItems: totalItems,
        hasMore: hasMore,
      },
    };
  } else if (users && !pagination) {
    return { users };
  }

  throw new AppError(messages.USER.GENERAL.USERS_NOT_FOUND, 404, 'general');
};

// Gets the missions from the user, joined or published
export const getUserMissions = async (uid, type, pagination) => {
  checkUid(uid);
  checkType(type);

  let result;

  if (type === 'published') {
    result = await missionService.getMissionsPublishedByUid(uid, pagination);
  } else if (type === 'joined') {
    result = await missionService.getMissionsJoinedByUid(uid, pagination);
  } else {
    throw new AppError(messages.MISSION.TYPE.INVALID_MISSION_TYPE, 400);
  }
  const missions = result.rows;

  if (missions && pagination) {
    const totalItems = parseInt(result.totalCount);
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
  } else if (missions && !pagination) {
    return { missions };
  }

  throw new AppError(
    messages.MISSION.GENERAL.MISSIONS_NOT_FOUND,
    404,
    'general',
  );
};

// Get user public profile
export const getUserPublicProfile = async (username) => {
  checkUsername(username);
  // Gets user
  const user = await getUserByUsernameOrThrow(username);

  const publicProfile = {
    uid: user.uid,
    username: user.username,
    name: user.name,
    surnames: user.surnames,
    description: user.description,
    location: user.location,
    avatar: user.avatar,
  };

  return {
    user: publicProfile,
    missionsVisible: user.configuration?.show_missions_to_others !== false,
  };
};

// Gets the missions from the user public profile, joined or published
export const getUserPublicMissions = async (username, type, pagination) => {
  checkUsername(username);
  checkType(type);

  // Gets user
  const user = await getUserByUsernameOrThrow(username);

  // If user doesn't want missions visible, empty object is returned
  const missionsVisible = user.configuration?.show_missions_to_others !== false;
  if (!missionsVisible) {
    return {
      missions: [],
      pagination: {
        currentPage: pagination.page,
        totalPages: 0,
        totalItems: 0,
        hasMore: false,
      },
    };
  }

  let result;

  if (type === 'published') {
    result = await missionService.getMissionsPublicPublishedByUid(
      user.uid,
      pagination,
    );
  } else if (type === 'joined') {
    result = await missionService.getMissionsPublicJoinedByUid(
      user.uid,
      pagination,
    );
  } else {
    throw new AppError(messages.MISSION.TYPE.INVALID_MISSION_TYPE, 400);
  }

  const missions = result.rows;

  if (missions && pagination) {
    const totalItems = parseInt(result.totalCount);
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
  } else if (missions && !pagination) {
    return { missions };
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

const checkEmail = (email) => {
  if (!email) throw new Error(messages.GENERAL.FIELD_REQUIRED('Email'));
};

const checkUsername = (username) => {
  if (!username) throw new Error(messages.GENERAL.FIELD_REQUIRED('Username'));
};

const checkFirebaseUid = (firebaseUid) => {
  if (!firebaseUid)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Firebase UID'));
};

const checkCurrentUser = (currentUser) => {
  if (!currentUser)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Current user'));
};

const checkType = (type) => {
  if (!type) throw new Error(messages.GENERAL.FIELD_REQUIRED('Type'));
};
