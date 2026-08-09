import { messages } from '@hermyx/shared';
import { AppError } from '../utils/error.util.js';
import * as missionService from './mission.service.js';
import * as userModel from '../models/user.model.js';
import { retrieveConnectAccount } from '../providers/payment.provider.js';

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

// Gets current user profile
export const getMyProfile = async (user) => {
  // Gets user location
  const location = await userModel.findLocationByUid(user.uid);

  // Gets user bank account to receive payments as an adventurer
  const bankAccount = await getConnectStatus(user);

  // Builds object that will be sent to frontend
  const profile = {
    username: user.username,
    email: user.email,
    name: user.name,
    surnames: user.surnames,
    description: user.description,
    location: location,
    avatar: user.avatar,
    configuration: user.configuration,
    stripe_connected_id: user.stripe_connected_id,
    bank_account: bankAccount,
  };

  return { user: profile };
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

// Updates current user's profile
export const updateMyProfile = async (currentUser, newInformation) => {
  const username = newInformation.username;

  const existingUsername = await userModel.findByUsernameExcludingUid(
    username,
    currentUser.uid,
  );
  if (existingUsername)
    throw new AppError(
      messages.AUTH.SIGNUP.USERNAME_ALREADY_EXISTS(username),
      400,
      'username',
    );

  const updatedUser = await userModel.update(currentUser.uid, {
    username,
    name: newInformation.name,
    surnames: newInformation.surnames,
    description: newInformation.description,
    latitude: newInformation.latitude,
    longitude: newInformation.longitude,
  });

  return {
    username: updatedUser.username,
    name: updatedUser.name,
    surnames: updatedUser.surnames,
    description: updatedUser.description,
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

const checkType = (type) => {
  if (!type) throw new Error(messages.GENERAL.FIELD_REQUIRED('Type'));
};

/// Helper functions
const getConnectStatus = async (user) => {
  try {
    // If there is no ID, is not configured
    if (!user || !user.stripe_connected_id) return { isConfigured: false };

    // Info is retrieved from Stripe
    const accountInfo = await retrieveConnectAccount(user.stripe_connected_id);

    // Checks if details form are ok
    if (!accountInfo.details_submitted) return { isConfigured: false };

    // Bank account info is extracted
    const bankAccounts = accountInfo.external_accounts?.data || [];
    const defaultBank = bankAccounts.length > 0 ? bankAccounts[0] : null;

    // Data is sent to front
    return {
      isConfigured: true,
      payoutsEnabled: accountInfo.payouts_enabled,
      bankName: defaultBank?.bank_name || 'Bank account',
      last4: defaultBank?.last4 || '****',
    };
  } catch (error) {
    console.error('Error fetching connect status:', error);
    return {};
  }
};
