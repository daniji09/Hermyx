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

/// Data checks
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
