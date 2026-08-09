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

/// Data checks
const checkUid = (uid) => {
  if (!uid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Uid'));
};

const checkUsername = (username) => {
  if (!username) throw new Error(messages.GENERAL.FIELD_REQUIRED('Username'));
};

const checkType = (type) => {
  if (!type) throw new Error(messages.GENERAL.FIELD_REQUIRED('Type'));
};
