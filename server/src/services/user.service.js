import { messages } from '@hermyx/shared';
import * as userModel from '../models/user.model.js';

/// Model access functions
// Create user
export const createUser = async (email, username, firebaseUid) => {
  if (!email) throw new Error(messages.GENERAL.FIELD_REQUIRED('Email'));
  if (!firebaseUid)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Firebase UID'));
  if (!username) throw new Error(messages.GENERAL.FIELD_REQUIRED('Username'));

  // Creates user
  const user = await userModel.create(email, username, firebaseUid);
  return user;
};

// Gets user by username
export const getUserByUsername = async (username) => {
  if (!username) throw new Error(messages.GENERAL.FIELD_REQUIRED('Username'));

  // Searches user by username
  const user = await userModel.findByUsername(username);
  return user;
};

// Gets user by email
export const getUserByEmail = async (email) => {
  if (!email) throw new Error(messages.GENERAL.FIELD_REQUIRED('Email'));

  // Searches user by username
  const user = await userModel.findByEmail(email);
  return user;
};
