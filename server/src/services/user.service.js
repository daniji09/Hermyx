import { messages } from '@hermyx/shared';
import { findByUsername } from '../models/user.model.js';

export const getUserByUsername = async (username) => {
  if (!username) throw new Error(messages.GENERAL.FIELD_REQUIRED('Username'));

  // Searches user by username
  const user = await findByUsername(username);

  return user;
};
