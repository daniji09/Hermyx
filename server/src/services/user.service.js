import { consts, messages } from '@hermyx/shared';
import { AppError, checkRequired } from '../utils/error.util.js';
import * as missionService from './mission.service.js';
import * as userModel from '../models/user.model.js';
import * as authProvider from '../providers/auth.provider.js';
import * as paymentProvider from '../providers/payment.provider.js';
import * as storageProvider from '../providers/storage.provider.js';

/// Model access functions
// Create user
export const createUser = async (email, username, firebaseUid) => {
  checkRequired(email, 'User email');
  checkRequired(username, 'Username');
  checkRequired(firebaseUid, 'User Firebase uid');

  // Creates user
  const user = await userModel.create(email, username, firebaseUid);
  return user;
};

// Gets user by uid
export const getUserByUid = async (uid) => {
  checkRequired(uid, 'User id');

  // Gets user by uid
  const user = await userModel.findByUid(uid);
  return user;
};

export const getUserByUidOrThrow = async (uid) => {
  const user = await getUserByUid(uid);
  if (!user) throw new AppError(messages.USER.GENERAL.USER_NOT_FOUND, 404);
  return user;
};

// Gets user by username
export const getUserByUsername = async (username) => {
  checkRequired(username, 'Username');

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
  checkRequired(email, 'User email');

  // Gets user by email
  const user = await userModel.findByEmail(email);
  return user;
};

export const getUserByEmailOrThrow = async (email) => {
  const user = await getUserByEmail(email);
  if (!user)
    throw new AppError(messages.USER.EMAIL.EMAIL_NOT_FOUND(email), 404);
  return user;
};

// Gets user by firebaseUid
export const getUserByFirebaseUid = async (firebaseUid) => {
  checkRequired(firebaseUid, 'User Firebase uid');

  // Gets user by firebaseUid
  const user = await userModel.findByFirebaseUid(firebaseUid);
  return user;
};

// Updates user's Stripe customer id
export const updateUserStripeCustomerIdByUid = async (
  uid,
  stripeCustomerId,
) => {
  checkRequired(uid, 'User id');
  checkRequired(stripeCustomerId, 'Stripe customer id');

  // Updates user's Stripe customer id
  await userModel.updateStripeCustomerIdByUid(uid, stripeCustomerId);
};

export const getActiveAdmin = async (client) =>
  userModel.getActiveAdmin(client);

// Updates user's Stripe customer id
export const updateUserStripeConnectedIdByUid = async (
  uid,
  stripeConnectedId,
) => {
  checkRequired(uid, 'User id');
  checkRequired(stripeConnectedId, 'Stripe connected id');

  // Updates user's Stripe customer id
  await userModel.updateStripeConnectedByUid(uid, stripeConnectedId);
};

/// Endpoint complex functions
// Search user by username with partial matches
export const searchUserByUsername = async (
  username,
  currentUser,
  pagination,
) => {
  checkRequired(username, 'Username');
  checkRequired(currentUser, 'Current users');

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
  checkRequired(uid, 'User id');
  checkRequired(type, 'Mission type');

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
  checkRequired(username, 'Username');
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
  checkRequired(username, 'Username');
  checkRequired(type, 'Mission type');

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

// Updates current user's profile
export const updateMyAvatar = async (uid, file) => {
  // If there is no file, error is returned
  if (!file) throw new AppError(messages.GENERAL.NO_IMAGE_PROVIDED, 400);

  // Gets user
  const currentUser = await getUserByUidOrThrow(uid);
  const oldAvatarUrl = currentUser.avatar;
  const isProduction = process.env.NODE_ENV === 'production';

  // New avatar is updated in storage
  let newAvatarUrl;
  if (isProduction)
    newAvatarUrl = await storageProvider.uploadToAzureBlob(file, 'avatars');
  else
    newAvatarUrl = await storageProvider.saveToLocalStorage(
      file,
      'uploads/avatars',
    );

  // Updates photo from db
  await userModel.updateAvatarByUid(uid, newAvatarUrl);

  // Deletes old photo physically if everything went correctly
  if (oldAvatarUrl) {
    try {
      if (isProduction)
        await storageProvider.deleteFromAzureBlob(oldAvatarUrl, 'avatars');
      else await storageProvider.deleteFromLocalStorage(oldAvatarUrl);
    } catch (error) {
      // No exception is thrown, photo will be still in Azure as trash, but user UX won't be negatively affected
      console.error(error);
    }
  }

  return newAvatarUrl;
};

// Updates current user's email
export const updateMyEmail = async (user, email) => {
  // User's current email
  const currentEmail = user.email;

  // Checks if new email already exists
  await checkEmailExists(email, user);

  let firebaseChange;
  try {
    // Prepares user email update
    const firebaseUpdates = { email };
    // So, email is changed on Firebase
    firebaseChange = await authProvider.updateFirebaseAccount(
      user.firebase_uid,
      firebaseUpdates,
    );

    if (!firebaseChange)
      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);

    // Then is changed on Hermyx database
    const hermyxChange = await userModel.updateEmailByUid(user.uid, email);

    if (hermyxChange)
      return {
        email: hermyxChange.email,
      };
    else {
      // If email was changed on Firebase but not in Hermyx, it should rollback
      await authProvider.updateFirebaseAccount(user.firebase_uid, {
        email: currentEmail,
      });
      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
    }
  } catch (error) {
    console.error(error);
    // If email was changed on Firebase but not in Hermyx, it should rollback
    if (firebaseChange)
      await authProvider.updateFirebaseAccount(user.firebase_uid, {
        email: currentEmail,
      });
    throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
  }
};

// Updates user's configuration
export const updateMyConfiguration = async (uid, configuration) => {
  const success = await userModel.updateConfigurationByUid(uid, configuration);
  if (!success) throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
  return success.configuration;
};

export const updateAdventurerRating = async (uid, client) => {
  checkRequired(uid, 'User id');
  return userModel.updateAdventurerRating(uid, client);
};

export const updateOwnerRating = async (uid, client) => {
  checkRequired(uid, 'User id');
  return userModel.updateOwnerRating(uid, client);
};

// Adds email authentication to current user
export const addEmailAuthentication = async (user, email, password) => {
  // Checks if new email already exists
  await checkEmailExists(email, user);
  let firebaseChange;
  try {
    // Prepares user email authentication add
    const firebaseUpdates = { email, password };
    // So, email authentication is added in Firebase
    firebaseChange = await authProvider.updateFirebaseAccount(
      user.firebase_uid,
      firebaseUpdates,
    );

    if (!firebaseChange)
      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);

    // Then is changed on Hermyx database
    const hermyxChange = await userModel.updateEmailByUid(user.uid, email);

    if (hermyxChange)
      return {
        email: hermyxChange.email,
      };
    else {
      // If email was changed on Firebase but not in Hermyx, it should rollback
      await authProvider.unlinkFirebaseProvider(user.firebase_uid);
      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
    }
  } catch (error) {
    console.error(error);
    // If email was changed on Firebase but not in Hermyx, it should rollback
    if (firebaseChange)
      await authProvider.unlinkFirebaseProvider(user.firebase_uid);
    throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
  }
};

/// Error builders
const buildEmailAlreadyExistsError = (email) => {
  return new AppError(
    messages.AUTH.SIGNUP.EMAIL_ALREADY_EXISTS(email),
    400,
    'email',
  );
};

const buildUnexpectedError = (message) => {
  return new AppError(message, 500, 'general');
};

/// Helper functions
const getConnectStatus = async (user) => {
  try {
    // If there is no ID, is not configured
    if (!user || !user.stripe_connected_id) return { isConfigured: false };

    // Info is retrieved from Stripe
    const accountInfo = await paymentProvider.retrieveConnectAccount(
      user.stripe_connected_id,
    );

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

const checkEmailExists = async (email, user) => {
  // First of all, email is checked to be unique
  const userByEmail = await getUserByEmail(email);

  // If it exists, then its a bad request error (unless is the same as current one)
  if (userByEmail) throw buildEmailAlreadyExistsError(email);

  // Lastly, it makes a deep check on Firebase searching for the e-mail
  try {
    const fbUser = await authProvider.getUserByEmail(email);
    if (fbUser.uid !== user.firebase_uid) {
      throw buildEmailAlreadyExistsError(email);
    }
  } catch (error) {
    if (error.status) throw error;
    // User not found is expected if the email is not in use, so any other error is returned
    if (error.code !== 'auth/user-not-found') {
      const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
      if (errorBuilder) {
        const mappedError = errorBuilder({ email });
        throw new AppError(
          mappedError.message,
          mappedError.status,
          mappedError.field,
        );
      }

      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
    }
  }
};
