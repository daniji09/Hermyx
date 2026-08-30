import {
  consts,
  messages,
  REPORT_DECISION,
  REPORT_STATUS,
  REPORT_TYPE,
  USER_ROLE,
  USER_STATUS,
} from '@hermyx/shared';
import { AppError, checkRequired } from '../utils/error.util.js';
import * as missionService from './service.service.js';
import * as reportService from './report.service.js';
import * as conversationService from './conversation.service.js';
import * as notificationService from './notification.service.js';
import * as userModel from '../models/user.model.js';
import * as authProvider from '../providers/auth.provider.js';
import * as paymentProvider from '../providers/payment.provider.js';
import * as storageProvider from '../providers/storage.provider.js';
import pool from '../config/db.config.js';
import { AZURE_CONN_STRING } from '../config/config.js';

/// Model access functions
// Create user
export const createUser = async (
  email,
  username,
  firebaseUid,
  termsVersion,
) => {
  checkRequired(email, 'User email');
  checkRequired(username, 'Username');
  checkRequired(firebaseUid, 'User Firebase uid');
  checkRequired(termsVersion, 'Terms version');

  // Creates user
  const user = await userModel.create(
    email,
    username,
    firebaseUid,
    termsVersion,
  );
  return user;
};

// Gets user by uid
const getUserByUid = async (uid, client) => {
  checkRequired(uid, 'User id');

  // Gets user by uid
  const user = await userModel.findByUid(uid, client);
  return user;
};

export const getUserByUidOrThrow = async (uid, client) => {
  const user = await getUserByUid(uid, client);
  if (!user) throw new AppError(messages.USER.GENERAL.USER_NOT_FOUND, 404);
  return user;
};

export const getUsersByUidForUpdate = async (uids, client) => {
  checkRequired(uids, 'User ids');
  return await userModel.findAllByUidForUpdate(uids, client);
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

  // Gets user bank account to receive payments as an collaborator
  const bankAccount = await getConnectStatus(user);

  // Builds object that will be sent to frontend
  const profile = {
    uid: user.uid,
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

// Gets the services from the user, joined or published
export const getUserMissions = async (uid, type, pagination) => {
  checkRequired(uid, 'User id');
  checkRequired(type, 'Mission type');

  let result;

  if (type === 'published') {
    result = await missionService.getMissionsPublishedByUid(uid, pagination);
  } else if (type === 'joined') {
    result = await missionService.getMissionsJoinedByUid(uid, pagination);
  } else {
    throw new AppError(messages.SERVICE.TYPE.INVALID_SERVICE_TYPE, 400);
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
    messages.SERVICE.GENERAL.SERVICES_NOT_FOUND,
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
    avatar: user.avatar,
    role: user.role,
  };

  return {
    user: publicProfile,
    missionsVisible: user.configuration?.show_missions_to_others !== false,
  };
};

// Gets the services from the user public profile, joined or published
export const getUserPublicMissions = async (username, type, pagination) => {
  checkRequired(username, 'Username');
  checkRequired(type, 'Mission type');

  // Gets user
  const user = await getUserByUsernameOrThrow(username);

  // If user doesn't want services visible, empty object is returned
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
    throw new AppError(messages.SERVICE.TYPE.INVALID_SERVICE_TYPE, 400);
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
    messages.SERVICE.GENERAL.SERVICES_NOT_FOUND,
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
  const isProduction = !!AZURE_CONN_STRING;

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
    const firebaseUpdates = { email, emailVerified: false };
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

// Updates user's rating
export const updateRating = async (uid, client) => {
  checkRequired(uid, 'User id');
  return userModel.updateRating(uid, client);
};

// Adds email authentication to current user
export const addEmailAuthentication = async (user, email, password) => {
  // Checks if new email already exists
  await checkEmailExists(email, user);
  let firebaseChange;
  try {
    // Prepares user email authentication add
    const firebaseUpdates = { email, password, emailVerified: false };
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

// Ban user
export const banUser = async (uid, rid, reason, admin) => {
  // Parameter checks
  checkRequired(uid, 'User id');
  checkRequired(rid, 'Report id');
  checkRequired(reason, 'Report decision reason');
  checkRequired(admin, 'Admin');

  // Only admins can do this action
  if (admin.role !== USER_ROLE.ADMIN.ID)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);

  // Finds user and checks if it has already been banned
  const user = await userModel.findByUid(uid);
  if (user.status === USER_STATUS.BANNED.ID)
    throw new AppError(messages.REPORT.BAN_USER.USER_ALREADY_BANNED, 409);

  // Finds report and checks if it has already been answered
  const report = await reportService.getReport(rid);
  reportService.assertReportMatchesTarget(
    report,
    REPORT_TYPE.REPORT_PROFILE.ID,
    { associated_user_id: uid },
  );
  if (report.status === REPORT_STATUS.ANSWERED.ID)
    throw new AppError(messages.REPORT.GENERAL.ALREADY_ANSWERED, 409);

  // External deletions are made first
  // First, rejects account on Stripe and their collaborator account is rejected so they cannot receive payments
  // Not needed for applicant account, because being banned avoids any type of transaction
  try {
    if (user.stripe_connected_id) {
      await paymentProvider.rejectAccount(user.stripe_connected_id);
    }
  } catch (e) {
    console.error(`Error deleting Stripe account for ${user.uid}:`, e);
    throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
  }

  // Then, Firebase
  try {
    await authProvider.disableUser(user.firebase_uid);
    await authProvider.revokeTokens(user.firebase_uid);
  } catch (e) {
    console.error(`Error deleting Firebase account for ${user.uid}:`, e);
    await authProvider.enableUser(user.firebase_uid).catch(console.error);
    throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
  }

  // Deletes avatar
  if (user.avatar) {
    const isProduction = !!AZURE_CONN_STRING;
    try {
      if (isProduction) {
        await storageProvider.deleteFromAzureBlob(user.avatar, 'avatars');
      } else {
        await storageProvider.deleteFromLocalStorage(user.avatar);
      }
    } catch (e) {
      console.error(`Error deleting avatar for ${user.uid}:`, e);
      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
    }
  }

  // Report is updated if it is possible, so is like a block
  const reportLocked = await reportService.updateStatusIfCurrent(
    rid,
    REPORT_STATUS.ANSWERED.ID,
  );
  if (!reportLocked)
    throw new AppError(messages.REPORT.GENERAL.BEING_ANSWERED, 409);

  // Then, service info is cleared
  try {
    // Clears all active services using a map of promises
    const activeMissions = await missionService.getUserActiveMissions(uid);
    const cleanupPromises = activeMissions.map((mission) => {
      if (mission.owner_id === uid) {
        // If user is applicant, it just cancel them
        return missionService.cancelMission(mission.mid, user, true);
      } else {
        // Otherwise, it expels them from the service
        return missionService.expelBannedAdventurerFromMission(
          mission,
          user,
          admin,
          rid,
        );
      }
    });

    // Then all promises are resolved
    const results = await Promise.allSettled(cleanupPromises);
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(
          `Error in mission ${activeMissions[index].mid}:`,
          result.reason,
        );
      }
    });
    // Clears all active disputes
  } catch (missionCleanupError) {
    console.error(
      `Error cleaning up missions for banned user ${uid}:`,
      missionCleanupError,
    );
  }

  // After user is unable to log in, they are banned in database and report is closed
  const client = await pool.connect();
  let reportClosed;
  try {
    await client.query('BEGIN');

    // Banned from database
    const banHermyx = await userModel.ban(uid, client);

    if (banHermyx < 1) throw new Error('User not found during ban');

    // Report is closed
    reportClosed = await reportService.closeReportAndConversation(
      rid,
      REPORT_DECISION.BAN_USER.ID,
      reason,
      admin.uid,
      client,
    );
    if (!reportClosed)
      throw new AppError(messages.REPORT.GENERAL.REPORT_NOT_FOUND, 404);

    // All conversations are closed
    await conversationService.removeUserFromAllConversations(uid, client);

    await client.query('COMMIT');
  } catch (e) {
    console.error(e);
    await client.query('ROLLBACK');
    // Rollbacks auth ban
    await authProvider.enableUser(user.firebase_uid).catch(console.error);
    throw new AppError(messages.GENERAL.UNEXPECTED_ERROR, 500);
  } finally {
    client.release();
  }

  // And conversation closure
  reportService.emitConversationClosed(
    reportClosed.participantIds,
    reportClosed.report,
  );

  return;
};

// Deletes current user
export const deleteMe = async (user) => {
  // Parameter checks
  checkRequired(user, 'User');

  // First of all, checks if user has active services, published or joined
  const activeMissions = await missionService.getUserActiveMissions(user.uid);
  if (activeMissions.length > 0)
    throw new AppError(messages.USER.DELETE_ME.ACTIVE_SERVICES, 409);

  // Then, checks if it has active disputes
  const activeDisputes = await reportService.getActiveDisputesByUid(user.uid);
  if (activeDisputes.length > 0)
    throw new AppError(messages.USER.DELETE_ME.ACTIVE_DISPUTES, 409);

  // External deletions are made first
  // Deletes user from Stripe
  if (user.stripe_connected_id) {
    try {
      await paymentProvider.deleteConnectAccount(user.stripe_connected_id);
    } catch (e) {
      console.error(`Error deleting Stripe account for ${user.uid}:`, e);
      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
    }
  }

  // Deletes user from Firebase
  try {
    await authProvider.deleteFirebaseUser(user.firebase_uid);
  } catch (e) {
    console.error(`Error deleting Firebase account for ${user.uid}:`, e);
    throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
  }

  // Deletes avatar
  if (user.avatar) {
    const isProduction = !!AZURE_CONN_STRING;
    try {
      if (isProduction) {
        await storageProvider.deleteFromAzureBlob(user.avatar, 'avatars');
      } else {
        await storageProvider.deleteFromLocalStorage(user.avatar);
      }
    } catch (e) {
      console.error(`Error deleting avatar for ${user.uid}:`, e);
      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
    }
  }

  // Then, deletions are made inside a transaction
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    // First, removes user from all chats, setting its left_at attribute
    // Also disallows writing for other person in private chats and closes chat
    await conversationService.removeUserFromAllConversations(user.uid, client);

    // Then deletes every notification that this user has ever received
    await notificationService.deleteAllUserNotifications(user.uid, client);

    // Finally, Anonymize user in db
    const anonymize = await userModel.anonymize(user.uid, client);
    if (anonymize < 1)
      throw new AppError(messages.GENERAL.UNEXPECTED_ERROR, 500);

    await client.query('COMMIT');
    return;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
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
