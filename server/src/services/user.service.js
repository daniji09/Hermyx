import { messages } from '@hermyx/shared';
import * as userModel from '../models/user.model.js';
import { AppError } from '../utils/error.util.js';

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
  checkPagination(pagination);

  // Searches user by username
  const { rows: users, totalCount } = await userModel.searchByUsername({
    username,
    excludedUid: currentUser,
    pagination,
  });
  const totalItems = parseInt(totalCount);

  if (users) {
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
  }

  throw new AppError(messages.USER.GENERAL.USERS_NOT_FOUND, 404, 'general');
};

// Get user public profile
export const getUserPublicProfile = async (username) => {
  checkUsername(username);
  const user = await getUserByUsername(username);

  if (!user)
    throw new AppError(
      messages.USER.USERNAME.USERNAME_NOT_FOUND(username),
      404,
    );

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

const checkPagination = (pagination) => {
  if (!pagination)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Pagination'));
};
