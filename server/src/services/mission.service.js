import {
  consts,
  HERMYX_FEE,
  HERMYX_SYSTEM_ID,
  messages,
  MISSION_PARTICIPATION_PAYMENT_STATUS,
  MISSION_PARTICIPATION_STATUS,
  MISSION_STATUS,
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  REPORT_DECISION,
  REPORT_STATUS,
  TRANSACTION_TYPE,
  USER_ROLE,
} from '@hermyx/shared';
import pool from '../config/db.config.js';
import { AppError, checkRequired } from '../utils/error.util.js';
import * as conversationService from '../services/conversation.service.js';
import * as notificationService from '../services/notification.service.js';
import * as userService from '../services/user.service.js';
import * as reportService from '../services/report.service.js';
import * as storageProvider from '../providers/storage.provider.js';
import * as socketProvider from '../providers/socket.provider.js';
import * as paymentProvider from '../providers/payment.provider.js';
import * as missionModel from '../models/mission.model.js';
import * as missionParticipationModel from '../models/mission-participation.model.js';
import * as missionPhotoModel from '../models/mission-photo.model.js';
import * as missionPaymentModel from '../models/mission-payment.model.js';

/// Model access functions
// Get mission by id
export const getMissionById = async (mid) => {
  checkRequired(mid, 'Mission id');

  // Find mission by id
  const mission = await missionModel.findByMid(mid);
  return mission;
};

export const getMissionByIdOrThrow = async (mid) => {
  const mission = await getMissionById(mid);
  if (!mission) throw buildMissionNotFoundError();
  return mission;
};

// Get mission participation by id
export const getMissionParticipationById = async (id, client) => {
  checkRequired(id, 'Mission participation id');

  // Find mission participation by id
  const missionParticipation = await missionParticipationModel.findById(
    id,
    client,
  );
  return missionParticipation;
};

export const getMissionParticipationByIdOrThrow = async (id) => {
  const missionParticipation = await getMissionParticipationById(id);
  if (!missionParticipation)
    throw new AppError(messages.MISSION.VACANCY.NOT_FOUND, 404);
  return missionParticipation;
};

// Get mission participation by mid and adventurer id
export const getMissionParticipationByMidAndAdventurerId = async (
  mid,
  adventurerId,
) => {
  checkRequired(mid, 'Mission id');
  checkRequired(adventurerId, 'Adventurer user id');

  // Find mission participation by id
  const missionParticipation =
    await missionParticipationModel.findByMidAndAdventurerId(mid, adventurerId);
  return missionParticipation;
};

export const getMissionParticipationByMidAndAdventurerIdOrThrow = async (
  mid,
  adventurerId,
) => {
  const missionParticipation =
    await getMissionParticipationByMidAndAdventurerId(mid, adventurerId);
  if (!missionParticipation)
    throw new AppError(messages.MISSION.VACANCY.NOT_FOUND, 404);
  return missionParticipation;
};

// Gets mission current payment
export const getMissionPaymentByMid = async (mid) => {
  checkRequired(mid, 'Mission id');
  return await missionParticipationModel.findMissionPaymentByMid(mid);
};

// Gets all waiting for payment participants by mission
export const getAllWaitingForPaymentByMid = async (mid) => {
  checkRequired(mid, 'Mission id');
  return await missionParticipationModel.findAllWaitingForPaymentByMid(mid);
};

// Create mission payment
export const createMissionPayment = async (missionPaymentData, client) => {
  checkRequired(missionPaymentData, 'Mission payment data');
  return await missionPaymentModel.create(missionPaymentData, client);
};

// Get mission payments by vacancy id
export const getMissionPaymentsByVacancyId = async (vacancyId, client) => {
  checkRequired(vacancyId, 'Mission participation id');
  return await missionPaymentModel.findByVacancyId(vacancyId, client);
};

// Gets mission participation
export const getMissionParticipationReviewContext = async (
  mid,
  adventurerId,
  client,
) => {
  checkRequired(mid, 'Mission id');
  checkRequired(adventurerId, 'Adventurer user id');
  return missionParticipationModel.findReviewContext(mid, adventurerId, client);
};

// Pays a vacancy
export const payParticipant = async (id, payment, client) => {
  checkRequired(id, 'Mission id');
  checkRequired(payment, 'Mission payment');
  return await missionParticipationModel.payParticipant(id, payment, client);
};

// Get all occupied vacancies of a mission
export const getAllOccupiedByMid = async (mid, client) => {
  checkRequired(mid, 'Mission id');
  return await missionParticipationModel.findAllOccupiedByMid(mid, client);
};

// Gets user's active missions
export const getUserActiveMissions = async (uid) => {
  checkRequired(uid, 'User id');
  return await missionModel.getUserActiveMissions(uid);
};

// Updates mission payment
export const updateMissionPayment = async (mid, payment, client) => {
  checkRequired(mid, 'Mission id');
  checkRequired(payment, 'Mission payment');
  return await missionModel.updateMissionPayment(mid, payment, client);
};

// Updates status
export const updateStatusByMid = async (mid, status, client) => {
  checkRequired(mid, 'Mission id');
  checkRequired(status, 'Mission status');
  return await missionModel.updateStatusByMid(mid, status, client);
};

// Updates mission participation status by mid an adventurer
export const updateParticipationStatusByMidAndAdventurer = async (
  mid,
  adventurerId,
  status,
  client,
) => {
  checkRequired(mid, 'Mission id');
  checkRequired(adventurerId, 'Adventurer user id');
  checkRequired(status, 'Mission status');
  return await missionParticipationModel.updateStatusByMidAndAdventurer(
    mid,
    adventurerId,
    status,
    client,
  );
};

// Updates mission participation status by id an adventurer
export const updateParticipationAdventurerAndStatus = async (
  id,
  adventurerId,
  status,
  client,
) => {
  checkRequired(id, 'Mission participation id');
  checkRequired(adventurerId, 'Adventurer user id');
  checkRequired(status, 'Mission participation status id');
  return await missionParticipationModel.updateAdventurerAndStatus(
    id,
    adventurerId,
    status,
    client,
  );
};

// Updates occupied vacancies
export const updateOccupiedVacancies = async (mid, amount, client) => {
  checkRequired(mid, 'Mission id');
  checkRequired(amount, 'Monetary amount');
  return await missionModel.updateOccupiedVacancies(mid, amount, client);
};

// Starts participants of a mission
export const startParticipants = async (mid, client) => {
  checkRequired(mid, 'Mission id');
  return await missionParticipationModel.startParticipants(mid, client);
};

// Finds a payment by Stripe transaction id
export const findPaymentByStripeTransactionId = async (stripeTransactionId) => {
  checkRequired(
    stripeTransactionId,
    'Mission transaction Stripe transaction id',
  );
  return await missionPaymentModel.findByStripeTransactionId(
    stripeTransactionId,
  );
};

// Gets mission status summary
export const getMissionStatusSummary = async (mid, client) => {
  checkRequired(mid, 'Mission id');
  return await missionModel.getMissionStatusSummary(mid, client);
};

// Updates payment status by id
export const updateParticipationPaymentStatusById = async (
  vacancyId,
  status,
  client,
) => {
  checkRequired(vacancyId, 'Mission participation id');
  checkRequired(status, 'Mission status');
  return await missionParticipationModel.updatePaymentStatusById(
    vacancyId,
    status,
    client,
  );
};

// Updates participant payment status
export const updateMissionParticipationPaymentStatus = async (
  participationId,
  status,
  client,
) => {
  checkRequired(participationId, 'Mission participation id');
  checkRequired(status, 'Mission status');
  return await missionParticipationModel.updatePaymentStatus(
    participationId,
    status,
    client,
  );
};

// Updates participation reward
export const updateMissionParticipationReward = async (
  participationId,
  monetaryReward,
  client,
) => {
  checkRequired(participationId, 'Mission participation id');
  checkRequired(monetaryReward, 'Monetary amount');
  return await missionParticipationModel.updateMonetaryReward(
    participationId,
    monetaryReward,
    client,
  );
};

// Refund mission payment
export const refundMissionPayment = async (amount, paymentId, client) => {
  checkRequired(amount, 'Monetary amount');
  checkRequired(paymentId, 'Mission payment id');
  return await missionPaymentModel.refund(amount, paymentId, client);
};

// Refunds partial payment of mission participation
export const refundMissionParticipation = async (
  participationId,
  amount,
  client,
) => {
  checkRequired(participationId, 'Mission participation id');
  checkRequired(amount, 'Monetary amount');
  return await missionParticipationModel.refundVacancyPartially(
    participationId,
    amount,
    client,
  );
};

// Refunds total payment of a banned mission participation
export const refundBannedVacancy = async (id, amount, client) => {
  checkRequired(id, 'Mission participation id');
  checkRequired(amount, 'Amount to refund');
  return await missionParticipationModel.refundBannedVacancy(
    id,
    amount,
    client,
  );
};

// Updates mission participation with owner review to an adventurer
export const updateMissionParticipationOwnerReview = async (
  participationId,
  rid,
  client,
) => {
  checkRequired(participationId, 'Mission participation id');
  checkRequired(rid, 'Review id');
  return await missionParticipationModel.updateOwnerReview(
    participationId,
    rid,
    client,
  );
};

// Updates mission participation with adventurer review to a owner
export const updateMissionParticipationAdventurerReview = async (
  participationId,
  rid,
  client,
) => {
  checkRequired(participationId, 'Mission participation id');
  checkRequired(rid, 'Review id');
  return await missionParticipationModel.updateAdventurerReview(
    participationId,
    rid,
    client,
  );
};

// Unjoin participant
export const unjoinParticipant = async (mid, uid, client) => {
  checkRequired(mid, 'Mission id');
  checkRequired(uid, 'User id');
  return await missionParticipationModel.unjoinParticipant(mid, uid, client);
};

//---

export const getOccupiedMissionParticipations = async (mid, client) =>
  missionParticipationModel.findAllOccupiedByMid(mid, client);

export const updateMissionParticipationStatus = async (
  participationId,
  status,
  client,
) => missionParticipationModel.updateStatus(participationId, status, client);

// Missions published by uid
export const getMissionsPublishedByUid = async (uid, pagination) => {
  checkRequired(uid, 'User id');

  // Finds missions created by uid
  const result = await missionModel.findPublishedByUid(uid, pagination);
  return result;
};

// Missions joined by uid
export const getMissionsJoinedByUid = async (uid, pagination) => {
  checkRequired(uid, 'User id');

  // Finds missions joined by uid
  const result = await missionModel.findJoinedByUid(uid, pagination);
  return result;
};

// Public missions published by uid
export const getMissionsPublicPublishedByUid = async (uid, pagination) => {
  checkRequired(uid, 'User id');

  // Finds public missions created by uid
  const result = await missionModel.findPublicPublishedByUid(uid, pagination);
  return result;
};

// Public missions joined by uid
export const getMissionsPublicJoinedByUid = async (uid, pagination) => {
  checkRequired(uid, 'User id');

  // Finds public missions joined by uid
  const result = await missionModel.findPublicJoinedByUid(uid, pagination);
  return result;
};

/// Endpoint complex function
// Get all missions
export const getMissions = async (title, pagination) => {
  // Gets all missions filtering what is needed
  const { rows: missions, totalCount } = await missionModel.findAll({
    title,
    pagination,
  });

  const totalItems = parseInt(totalCount);

  if (missions && pagination) {
    const totalPages = Math.ceil(totalItems / pagination.limit);
    const hasMore = pagination.page < totalPages;

    // Pagination object is built
    return {
      missions,
      paginationData: {
        currentPage: pagination.page,
        totalPages: totalPages,
        totalItems: totalItems,
        hasMore: hasMore,
      },
    };
  } else if (missions && !pagination) {
    return { missions };
  } else
    throw new AppError(
      messages.MISSION.GENERAL.MISSIONS_NOT_FOUND,
      404,
      'general',
    );
};

// Get all opened missions
export const getOpenedMissions = async (
  title,
  minPayment,
  maxPayment,
  maxDistanceKm,
  pagination,
  excludeOwnerId,
  user,
) => {
  // Gets all missions filtering what is needed
  const { rows: missions, totalCount } = await missionModel.findAllOpened({
    title,
    minPayment,
    maxPayment,
    maxDistanceKm,
    originUserId: maxDistanceKm !== undefined ? user.uid : undefined,
    pagination,
    excludeOwnerId,
  });

  const totalItems = parseInt(totalCount);

  if (missions && pagination) {
    const totalPages = Math.ceil(totalItems / pagination.limit);
    const hasMore = pagination.page < totalPages;

    // Pagination object is built
    return {
      missions,
      paginationData: {
        currentPage: pagination.page,
        totalPages: totalPages,
        totalItems: totalItems,
        hasMore: hasMore,
      },
    };
  } else if (missions && !pagination) {
    return { missions };
  } else
    throw new AppError(
      messages.MISSION.GENERAL.MISSIONS_NOT_FOUND,
      404,
      'general',
    );
};

// Get mission by mid
export const getMissionByMid = async (mid, uid) => {
  // Parameter checks
  checkRequired(uid, 'Current user id');
  checkRequired(mid, 'Mission id');

  // Searches mission by id
  const [mission, participants, waitingForPaymentVacancies, photos] =
    await Promise.all([
      missionModel.findByMidExcludingUid(mid, uid),
      missionParticipationModel.findAllByMid(mid),
      missionParticipationModel.findAllWaitingForPaymentByMid(mid),
      missionPhotoModel.findAllByMid(mid),
    ]);

  // Returns success or error
  if (!mission) throw buildMissionNotFoundError();

  // Mission can be finished if all vacancies are empty or finished
  const canFinish =
    participants.every(
      (participant) =>
        participant.status === MISSION_PARTICIPATION_STATUS.EMPTY.ID ||
        participant.status === MISSION_PARTICIPATION_STATUS.RELEASED.ID,
    ) &&
    MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
      MISSION_STATUS.FINISHED.ID,
    );

  return {
    mission: {
      ...mission,
      participants,
      waitingForPaymentVacancies,
      canFinish,
      photos,
    },
  };
};

// Publish mission
export const publishMission = async (
  uid,
  title,
  description,
  vacancies,
  vacanciesData,
  latitude,
  longitude,
  photos,
) => {
  // Parameter checks
  checkRequired(uid, 'Current user id');
  checkRequired(title, 'Mission title');
  checkRequired(description, 'Mission description');
  checkRequired(vacancies, 'Mission number of vacancies');
  checkRequired(vacanciesData, 'Mission vacancies data');

  // Checks if photo number is correct
  if (photos.length > consts.MISSION.PHOTOS.MAX) throw buildTooManyFilesError();

  // Checks if user has a mission already with the same title
  await checkUserMissionWithSameTitle(uid, title);

  // Saves photos
  let uploadedPhotoUrls = [];
  if (photos.length > 0) {
    // Environment variable determines whether photos are uploaded locally or to Azure
    const isProduction = process.env.NODE_ENV === 'production';
    uploadedPhotoUrls = await Promise.all(
      photos.map(async (file) => {
        if (isProduction) {
          return await storageProvider.uploadToAzureBlob(
            file,
            'mission-photos',
          );
        } else {
          return await storageProvider.saveToLocalStorage(
            file,
            'uploads/mission-photos',
          );
        }
      }),
    );
  }

  // Mission data
  const missionData = {
    title: title || 'Mission not titled',
    description: description || 'No description',
    vacancies: vacancies || 0,
    vacanciesData: vacanciesData || '',
    totalPayment: 0,
    latitude: latitude || null,
    longitude: longitude || null,
    status: MISSION_STATUS.OPENED.ID,
    ownerId: uid,
  };

  // Database transaction is needed to insert all information successfully
  const client = await pool.connect();
  try {
    // Transaction starts
    await client.query('BEGIN');

    // Creates the new mission
    const newMission = await missionModel.create(missionData, client);

    // Creates vacancies for mission
    for (const vacancy of vacanciesData) {
      await missionParticipationModel.create(newMission.mid, vacancy, client);
    }

    // Creates conversation
    const conversation = await conversationService.createConversation(
      'mission',
      newMission.mid,
      client,
    );

    // Creates conversation participant
    await conversationService.createConversationParticipant(
      conversation.cid,
      uid,
      client,
    );

    // Creates photos
    for (const photoURL of uploadedPhotoUrls)
      await missionPhotoModel.create(newMission.mid, photoURL, client);

    // Commits
    await client.query('COMMIT');
    return newMission;
  } catch (error) {
    // Transaction rollbacks
    await client.query('ROLLBACK');
    throw error;
  } finally {
    // Either way, connection is always released
    client.release();
  }
};

// Close mission
export const closeMission = async (mid, user) => {
  // Parameter checks
  checkRequired(mid, 'Mission id');
  checkRequired(user, 'Current user');

  // First of all, data is read and validations are made
  const {
    vacanciesToUpdate,
    nextMissionStatus,
    message,
    occupied_vacancies,
    mission,
  } = await closeMissionValidations(mid, user);

  // Then, internal updates are made
  const notificationsToSend = await closeMissionInternalUpdates(
    mission,
    mid,
    user,
    nextMissionStatus,
    vacanciesToUpdate,
    occupied_vacancies,
    message,
  );

  // Lastly, notifications are sent
  for (const notification of notificationsToSend)
    socketProvider.emitToUser(
      notification.receiverId,
      notification.event,
      notification.payload,
    );

  return {
    status: MISSION_STATUS.IN_PROGRESS.ID,
    participants: occupied_vacancies,
  };
};

const closeMissionValidations = async (mid, user) => {
  // Gets mission
  const mission = await getMissionByIdOrThrow(mid);

  // Checks mission is owned by user
  checkMissionBelongsToUser(mission.owner_id, user.uid);

  // Checks occupied vacancies
  const occupied_vacancies =
    await missionParticipationModel.findAllOccupiedByMid(mid);
  if (occupied_vacancies.length === 0)
    throw new AppError(messages.MISSION.CLOSE.CANNOT_WITHOUT_ADVENTURERS, 409);

  // Different checks for opened or reopened mission
  let nextMissionStatus, vacanciesToUpdate, message;

  if (mission.status === MISSION_STATUS.OPENED.ID) {
    if (
      !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
        MISSION_STATUS.CLOSED.ID,
      )
    )
      throw new AppError(messages.MISSION.CLOSE.CANNOT_ON_CURRENT_STATE, 409);

    nextMissionStatus = MISSION_STATUS.CLOSED.ID;
    vacanciesToUpdate = occupied_vacancies.filter(
      (v) => v.status !== MISSION_PARTICIPATION_STATUS.RELEASED.ID,
    );
    message = messages.NOTIFICATION.MISSION_CLOSE.CLOSED(mission.title);
  } else if (mission.status === MISSION_STATUS.REOPENED.ID) {
    if (
      !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
        MISSION_STATUS.IN_PROGRESS.ID,
      )
    )
      throw new AppError(
        messages.MISSION.REOPEN.CANNOT_CLOSE_ON_CURRENT_STATE,
        409,
      );

    nextMissionStatus = MISSION_STATUS.IN_PROGRESS.ID;
    vacanciesToUpdate = await missionParticipationModel.findAllJoined(
      mission.mid,
    );
    message =
      vacanciesToUpdate.length === 0
        ? messages.NOTIFICATION.MISSION_CLOSE.CLOSE_AFTER_REOPENED_NO_NEW_ADVENTURERS(
            mission.title,
          )
        : messages.NOTIFICATION.MISSION_CLOSE.CLOSE_AFTER_REOPENED_NEW_ADVENTURERS(
            mission.title,
          );
  } else {
    throw new AppError(messages.MISSION.CLOSE.CANNOT_ON_CURRENT_STATE, 409);
  }

  return {
    vacanciesToUpdate,
    nextMissionStatus,
    message,
    occupied_vacancies,
    mission,
  };
};

const closeMissionInternalUpdates = async (
  mission,
  mid,
  user,
  nextMissionStatus,
  vacanciesToUpdate,
  occupied_vacancies,
  message,
) => {
  const client = await pool.connect();
  const notificationsToSend = [];

  try {
    await client.query('BEGIN');

    // Mission state is updated
    await missionModel.updateStatusByMid(mid, nextMissionStatus, client);

    // Vacancies are updated
    for (const vacancy of vacanciesToUpdate)
      await missionParticipationModel.updateStatus(
        vacancy.id,
        MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
        client,
      );

    // Lastly, notifications are generated
    for (const vacancy of occupied_vacancies) {
      if (MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT) {
        const notificationId = await notificationService.createNotification(
          {
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: NOTIFICATION_ACTION.MISSION_CLOSE.ID,
            status: null,
            message: message,
            senderId: user.uid,
            receiverId: vacancy.adventurer_id,
            payload: { associated_mission_id: mission.mid },
          },
          client,
        );
        notificationsToSend.push({
          receiverId: vacancy.adventurer_id,
          event: 'mission:closed',
          payload: {
            notificationId,
            missionId: mission.mid,
            vacancyId: vacancy.id,
            missionTitle: mission.title,
            senderId: user.uid,
            senderUsername: user.username,
            receiverId: vacancy.adventurer_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message: message,
          },
        });
      }
    }
    await client.query('COMMIT');
    return notificationsToSend;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Join mission
export const joinMission = async (mid, user, message, vacancyId) => {
  // Parameter checks
  checkRequired(mid, 'Mission id');
  checkRequired(user, 'Current user');
  checkRequired(vacancyId, 'Mission participation id');

  // Mission is searched
  const mission = await getMissionByIdOrThrow(mid);

  // Checks if mission was created by the current user
  if (mission.owner_id === user.uid)
    throw new AppError(messages.MISSION.JOIN.OWN_MISSION, 403);

  // Checks if mission status is valid for accepting adventurers
  checkCanAcceptAdventurers(mission.status);

  // Checks if mission is already full
  if (mission.occupied_vacancies === mission.total_vacancies)
    throw new AppError(messages.MISSION.JOIN.FILLED, 409);

  // Checks if user has already joined that mission
  await checkAdventurerAlreadyJoined(mid, user.uid);

  // Checks if vacancy exists
  const vacancy = await getMissionParticipationByIdOrThrow(vacancyId);
  if (vacancy.adventurer_id !== null) {
    throw new AppError(messages.MISSION.JOIN.FILLED, 409);
  }
  // Checks that vacancy exists in that mission
  checkVacancyNotMission(vacancy.mid, mid);

  // Checks if user has already requested the joining for this mission
  const ownerId = mission.owner_id;
  const pendingRequest = await notificationService.hasPendingJoinNotification(
    mid,
    user.uid,
    ownerId,
    vacancyId,
  );
  if (pendingRequest)
    throw new AppError(messages.MISSION.JOIN.REQUEST_ALREADY_SENT, 409);

  // Checks if user has configured their bank account
  if (user.stripe_connected_id === null)
    throw new AppError(
      messages.MISSION.JOIN.ADVENTURER_BANK_ACCOUNT_NOT_CONFIGURED,
      403,
    );

  // Otherwise, creates the notification for the joining request (or invite)
  const notificationId = await notificationService.createNotification({
    type: NOTIFICATION_TYPE.INVITATION.ID,
    kind: NOTIFICATION_KIND.ACTIONABLE.ID,
    action: NOTIFICATION_ACTION.JOIN_REQUEST.ID,
    status: NOTIFICATION_STATUS.PENDING.ID,
    message,
    senderId: user.uid,
    receiverId: ownerId,
    payload: { associated_mission_id: mid, associated_vacancy_id: vacancyId },
  });

  // And sends it to the user
  socketProvider.emitToUser(ownerId, 'notification:created', {
    notificationId,
    missionId: mid,
    vacancyId: vacancyId,
    missionTitle: mission.title,
    senderId: user.uid,
    senderUsername: user.username,
    receiverId: ownerId,
    type: NOTIFICATION_TYPE.INVITATION.ID,
    message,
  });

  return;
};

// Invite to mission
export const inviteToMission = async (
  mid,
  vacancyId,
  senderId,
  receiverId,
  message,
  user,
) => {
  // Parameter checks
  checkRequired(mid, 'Mission id');
  checkRequired(vacancyId, 'Mission participation id');
  checkRequired(senderId, 'Notification sender user id');
  checkRequired(receiverId, 'Notification receiver user id');

  // Cannot send a invitation to itself
  if (senderId === receiverId)
    throw new AppError(messages.MISSION.INVITE.CANNOT_INVITE_YOURSELF, 409);

  // eslint-disable-next-line no-unused-vars
  const [mission, receiver, vacancy] = await Promise.all([
    getMissionByIdOrThrow(mid),
    userService.getUserByUidOrThrow(receiverId),
    getMissionParticipationByIdOrThrow(vacancyId),
  ]);

  // Checks that vacancy exists in that mission
  checkVacancyNotMission(vacancy.mid, mid);

  // Checks if vacancy is already occupied
  if (vacancy.adventurer_id !== null)
    throw new AppError(messages.MISSION.INVITE.VACANCY_ALREADY_OCCUPIED, 409);

  // Checks if mission can accept adventurers
  checkCanAcceptAdventurers(mission.status);

  // Checks if applicant has already sent a invitation to that adventurer
  const hasPending = await notificationService.hasPendingJoinNotification(
    mid,
    senderId,
    receiverId,
    vacancyId,
  );
  if (hasPending)
    throw new AppError(messages.MISSION.INVITE.INVITATION_ALREADY_SENT, 409);

  // Checks if there is available vacancies
  if (mission.total_vacancies <= mission.occupied_vacancies)
    throw new AppError(messages.MISSION.INVITE.NO_VACANCIES_AVAILABLE, 409);

  // Checks if user has already joined that mission
  const adventurerId = mission.owner_id === senderId ? receiverId : senderId;
  await checkAdventurerAlreadyJoined(mid, adventurerId);

  const notificationData = {
    type: NOTIFICATION_TYPE.INVITATION.ID,
    kind: NOTIFICATION_KIND.ACTIONABLE.ID,
    status: NOTIFICATION_STATUS.PENDING.ID,
    action: NOTIFICATION_ACTION.MISSION_INVITE.ID,
    message,
    senderId,
    receiverId,
    payload: {
      associated_mission_id: mid,
      associated_vacancy_id: vacancyId,
    },
  };

  const newNotificationId =
    await notificationService.createNotification(notificationData);
  socketProvider.emitToUser(receiverId, 'notification:created', {
    notificationId: newNotificationId,
    mid,
    vacancyId,
    missionTitle: mission.title,
    senderId,
    senderUsername: user.username,
    receiverId,
    type: NOTIFICATION_TYPE.INVITATION.ID,
    message,
  });

  return;
};

// Unjoin mission
export const unjoinMission = async (mid, vacancyId, user) => {
  // Parameter checks
  checkRequired(mid, 'Mission id');
  checkRequired(vacancyId, 'Mission participation id');
  checkRequired(user, 'Current user');

  // Mission is searched
  const mission = await getMissionByIdOrThrow(mid);

  // Checks if mission is opened, so unjoin can be done
  if (!MISSION_STATUS[mission.status].ADVENTURERS_CAN_UNJOIN)
    throw new AppError(messages.MISSION.UNJOIN.CANNOT_IN_PROGRESS_MISSION);

  // Vacancy is searched
  const vacancy = await getMissionParticipationByIdOrThrow(vacancyId);

  // Checks that vacancy exists in that mission
  checkVacancyNotMission(vacancy.mid, mid);

  // Checks that participant is current user, a user can only unjoin itself
  if (vacancy.adventurer_id !== user.uid)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);

  // Checks if adventurer can unjoin can be deleted by states
  if (
    !MISSION_PARTICIPATION_STATUS[vacancy.status].VALID_NEXT_STATES.includes(
      MISSION_PARTICIPATION_STATUS.EMPTY.ID,
    )
  )
    throw new AppError(messages.MISSION.UNJOIN.CANNOT_IN_CURRENT_VACANCY_STATE);

  // Checks if user has actually joined that mission
  const alreadyJoined =
    await missionParticipationModel.findByMidAndAdventurerId(mid, user.uid);
  if (!alreadyJoined)
    throw new AppError(messages.MISSION.JOIN.ALREADY_JOINED, 409);

  // Gets adventurer fled information
  const adventurer = await userService.getUserByUidOrThrow(
    vacancy.adventurer_id,
  );

  // Updates and notification sending needs transaction
  const client = await pool.connect();
  let notificationId;
  const message = messages.NOTIFICATION.UNJOIN_MISSION(
    user.username,
    vacancy.title,
    mission.title,
  );

  try {
    await client.query('BEGIN');
    // Participation is updated
    const updatedVacancy =
      await missionParticipationModel.updateAdventurerAndStatus(
        vacancyId,
        null,
        MISSION_PARTICIPATION_STATUS.EMPTY.ID,
        client,
      );
    if (!updatedVacancy)
      throw new AppError(messages.MISSION.VACANCY.ALREADY_MODIFIED, 409);

    // Mission is updated
    const updateMission = await missionModel.updateOccupiedVacancies(
      mid,
      -1,
      client,
    );
    if (updateMission.length < 1)
      throw new AppError(messages.MISSION.NOT_FOUND, 404);

    // Adventurer leaves conversation
    const leaveMissionConversation =
      await conversationService.leaveMissionConversation(mid, user.uid, client);
    if (!leaveMissionConversation)
      throw new AppError(messages.GENERAL.UNEXPECTED_ERROR, 500);

    // Finally, a notification is sent to the owner
    notificationId = await notificationService.createNotification(
      {
        type: NOTIFICATION_TYPE.MISSION.ID,
        kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
        action: NOTIFICATION_ACTION.MISSION_UNJOIN.ID,
        status: null,
        message: message,
        senderId: user.uid,
        receiverId: mission.owner_id,
        payload: {
          associated_mission_id: mission.mid,
          associated_vacancy_id: vacancy.id,
        },
      },
      client,
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  socketProvider.emitToUser(vacancy.adventurer_id, 'mission:unjoined', {
    notificationId,
    missionId: mission.mid,
    vacancyId: vacancy.adventurer_id,
    missionTitle: mission.title,
    senderId: user.uid,
    senderUsername: adventurer.username,
    receiverId: mission.owner_id,
    type: NOTIFICATION_TYPE.MISSION.ID,
    message: message,
  });

  return;
};

// Submit participation
export const submitMissionParticipation = async (mid, user) => {
  // Parameter checks
  checkRequired(mid, 'Mission id');
  checkRequired(user, 'Current user');

  // Gets mission
  const mission = await getMissionByIdOrThrow(mid);

  // Gets vacancy
  const vacancy = await getMissionParticipationByMidAndAdventurerIdOrThrow(
    mid,
    user.uid,
  );

  // Check if mission can handle a submit
  if (!MISSION_STATUS[mission.status].CAN_SUBMIT_PARTICIPATION)
    throw new AppError(
      messages.MISSION.SUBMIT_PARTICIPATION.CANNOT_IN_CURRENT_STATE,
      409,
    );

  // Checks if vacancy can be submitted by status
  if (vacancy.status !== MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID)
    throw new AppError(
      messages.MISSION.SUBMIT_PARTICIPATION.MISSION_PART_ALREADY_SUBMITTED,
      409,
    );

  // Check if vacancy can be submitted by payment status
  if (vacancy.payment_status !== MISSION_PARTICIPATION_PAYMENT_STATUS.PAID.ID)
    throw new AppError(
      messages.MISSION.SUBMIT_PARTICIPATION.CANNOT_SUBMIT_UNPAID,
      409,
    );

  // Gets notification info
  const attempts =
    (await notificationService.countParticipationReviewAttempts(
      mid,
      user.uid,
    )) + 1;
  const missionCompletionMessage = messages.NOTIFICATION.SUBMIT_PARTICIPATION(
    mission.title,
    user.username,
  );

  // There is a mission participation update and notification creation, so a transaction is needed
  const client = await pool.connect();
  let notificationId, updatedParticipation;
  try {
    // Transaction starts
    await client.query('BEGIN');

    // Updates participation
    updatedParticipation =
      await missionParticipationModel.updateStatusByMidAndAdventurer(
        mid,
        user.uid,
        MISSION_PARTICIPATION_STATUS.SUBMITTED.ID,
        client,
      );
    if (!updatedParticipation)
      throw new AppError(
        messages.MISSION.SUBMIT_PARTICIPATION.MISSION_PART_ALREADY_SUBMITTED,
        409,
      );

    // Creates notification
    notificationId = await notificationService.createNotification(
      {
        type: NOTIFICATION_TYPE.MISSION.ID,
        kind: NOTIFICATION_KIND.ACTIONABLE.ID,
        action: NOTIFICATION_ACTION.PARTICIPATION_REVIEW.ID,
        status: NOTIFICATION_STATUS.PENDING.ID,
        message: missionCompletionMessage,
        senderId: user.uid,
        receiverId: mission.owner_id,
        payload: { associated_mission_id: Number(mid), attempt: attempts },
      },
      client,
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // Finally, sends notification
  socketProvider.emitToUser(
    mission.owner_id,
    'mission:participation-submitted',
    {
      notificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      missionId: Number(mid),
      missionTitle: mission.title,
      adventurerId: user.uid,
      adventurerUsername: user.username,
      message: missionCompletionMessage,
    },
  );

  return updatedParticipation;
};

// Cancel mission
export const cancelMission = async (mid, user) => {
  // Parameter checks
  checkRequired(mid, 'Mission id');
  checkRequired(user, 'Current user');

  // To save successful payments
  const successfulPayments = [];

  // Mission is searched
  const mission = await getMissionByIdOrThrow(mid);

  // Checks if mission was created by the current user
  checkMissionBelongsToUser(mission.owner_id, user.uid);

  // Gets occupied vacancies
  const occupied_vacancies =
    await missionParticipationModel.findAllOccupiedByMid(mid);

  // Gets if is delete or cancel action
  const isDeleting = MISSION_STATUS[mission.status].CAN_DELETE;
  const isCancelling = MISSION_STATUS[mission.status].CAN_CANCEL;

  // If its neither, then is an error
  if (!isDeleting && !isCancelling) {
    if (mission.status === MISSION_STATUS.IN_DISPUTE.ID)
      throw new AppError(messages.MISSION.DELETE.CANNOT_ACTIVE_DISPUTES, 409);
    throw new AppError(
      messages.MISSION.DELETE.CANNOT_DELETE_MISSION_STATE,
      409,
    );
  }

  // If is a delete, it just changes mission status
  if (isDeleting) {
    // Checks if mission can be deleted by status
    if (
      !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
        MISSION_STATUS.DELETED.ID,
      )
    )
      throw new AppError(
        messages.MISSION.DELETE.CANNOT_DELETE_MISSION_STATE,
        409,
      );

    await missionModel.updateStatusByMid(mid, MISSION_STATUS.DELETED.ID);
  }

  // Otherwise, reward has to be sent to the adventurers
  else if (isCancelling) {
    // Checks if mission can be cancelled by status
    if (
      !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
        MISSION_STATUS.CANCELLING.ID,
      )
    )
      throw new AppError(
        messages.MISSION.DELETE.CANNOT_CANCEL_MISSION_STATE,
        409,
      );

    // Intention is marked, mission is going to be cancel after all money transactions
    await missionModel.updateStatusByMid(mid, MISSION_STATUS.CANCELLING.ID);

    // Then, without using any db transaction, reward is sent to each adventurer of every unpaid vacancy
    for (const vacancy of occupied_vacancies) {
      if (vacancy.status !== MISSION_PARTICIPATION_STATUS.RELEASED.ID) {
        try {
          // Gets adventurer
          const adventurer = await userService.getUserByUidOrThrow(
            vacancy.adventurer_id,
          );

          // Creates payment with idempotency key
          if (adventurer.stripe_connected_id) {
            const transferData = {
              amount: Math.round(vacancy.monetary_reward * 100),
              currency: 'eur',
              destination: adventurer.stripe_connected_id,
              description: `mission_cancelled`,
              transfer_group: `mission_${mid}`,
            };
            const idempotencyKey = `cancel_${mid}_vac_${vacancy.id}`;

            // Stripe call, is slow because of this for, but is safe due to the idempotency key
            const transfer = await paymentProvider.createTransfer(
              transferData,
              idempotencyKey,
            );

            // Lastly, db transaction to create the payment and mark vacancy as paid out
            const client = await pool.connect();
            try {
              await client.query('BEGIN');

              // Creates transaction
              await missionPaymentModel.create(
                {
                  mid: mission.mid,
                  vacancy_id: vacancy.id,
                  sender_id: HERMYX_SYSTEM_ID,
                  receiver_id: adventurer.uid,
                  stripe_transaction_id: transfer.id,
                  transaction_type:
                    TRANSACTION_TYPE.CANCELLATION_COMPENSATION.ID,
                  amount_paid: vacancy.monetary_reward,
                },
                client,
              );

              // Marks vacancy as paid out
              await missionParticipationModel.updatePaymentStatusById(
                vacancy.id,
                MISSION_PARTICIPATION_PAYMENT_STATUS.LIQUIDATED.ID,
                client,
              );

              await client.query('COMMIT');
              successfulPayments.push(vacancy.id);
            } catch (dbError) {
              await client.query('ROLLBACK');
              // If db fails but transfer was correct, a log should be created to fix that inconsistency as soon as possible
              console.error(
                `FATAL DB ERROR: Transfer ${transfer.id} sent to ${adventurer.uid} after mission cancellation but DB failed`,
                dbError,
              );
            } finally {
              client.release();
            }
          }
        } catch (stripeError) {
          // If a Stripe payment fails, for doesn't end, error should be saved in a log to fix it as soon as possible
          console.error(
            `Stripe Error while paying out vacancy ${vacancy.id} due to cancellation compensation:`,
            stripeError.message,
          );
        }
      }
    }
  }

  // Either way, all adventurers are informed and mission conversation is closed
  const notificationsToSend = [];
  const client = await pool.connect();

  // Notifications are created in a transaction
  try {
    await client.query('BEGIN');
    // First, mission has been updated to cancel status
    if (occupied_vacancies.length === successfulPayments.length)
      await missionModel.updateStatusByMid(mid, MISSION_STATUS.CANCELLED.ID);

    // Conversation is ended
    await conversationService.closeMissionConversationType(mid, client);

    // Notifications are sent
    for (const vacancy of occupied_vacancies) {
      if (MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT) {
        const message = isDeleting
          ? messages.NOTIFICATION.DELETE_MISSION(mission.title)
          : successfulPayments.includes(vacancy.id)
            ? messages.NOTIFICATION.CANCEL_MISSION.SUCCESSFUL(mission.title)
            : messages.NOTIFICATION.CANCEL_MISSION.ISSUED(mission.title);
        const action = isDeleting
          ? NOTIFICATION_ACTION.MISSION_DELETE.ID
          : NOTIFICATION_ACTION.MISSION_CANCEL.ID;

        const notificationId = await notificationService.createNotification(
          {
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: action,
            status: null,
            message: message,
            senderId: user.uid,
            receiverId: vacancy.adventurer_id,
            payload: { associated_mission_id: mission.mid },
          },
          client,
        );

        const eventName = isDeleting ? 'mission:delete' : 'mission:cancel';
        notificationsToSend.push({
          receiverId: vacancy.adventurer_id,
          eventName: eventName,
          payload: {
            notificationId,
            missionId: mission.mid,
            vacancyId: vacancy.id,
            missionTitle: mission.title,
            senderId: user.uid,
            senderUsername: user.username,
            receiverId: vacancy.adventurer_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message: message,
          },
        });
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // And finally, notifications are sent
  for (const notification of notificationsToSend) {
    socketProvider.emitToUser(
      notification.receiverId,
      notification.eventName,
      notification.payload,
    );
  }

  return;
};

// Reopen mission
export const reopenMission = async (mid, user) => {
  // Parameters check
  checkRequired(mid, 'Mission id');
  checkRequired(user, 'Current user');

  // Mission is searched
  const mission = await getMissionByIdOrThrow(mid);

  // Checks if mission was created by the current user
  checkMissionBelongsToUser(mission.owner_id, user.uid);

  // Checks if mission can be reopened by state
  if (
    !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
      MISSION_STATUS.REOPENED.ID,
    )
  )
    throw new AppError(messages.MISSION.REOPEN.CANNOT_ON_CURRENT_STATE, 409);

  // Checks if there is at least one empty vacancy, so mission can be reopened
  const vacancies = await missionParticipationModel.findAllUnoccupied(mid);

  if (vacancies.length < 1)
    throw new AppError(
      messages.MISSION.REOPEN.CANNOT_WITHOUT_EMPTY_VACANCIES,
      409,
    );

  // Gets adventurers
  const occupied_vacancies =
    await missionParticipationModel.findAllOccupiedByMid(mid);

  // Mission status change and notifications sending need to be in a db transaction
  const notificationsToSend = [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Finally, mission is reopened
    await missionModel.updateStatusByMid(
      mid,
      MISSION_STATUS.REOPENED.ID,
      client,
    );

    // And all adventurers are informed
    for (const vacancy of occupied_vacancies) {
      if (MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT) {
        const message = messages.NOTIFICATION.REOPEN_MISSION(mission.title);
        const notificationId = await notificationService.createNotification(
          {
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: NOTIFICATION_ACTION.MISSION_REOPEN.ID,
            status: null,
            message: message,
            senderId: user.uid,
            receiverId: vacancy.adventurer_id,
            payload: {
              associated_mission_id: mission.mid,
            },
          },
          client,
        );
        notificationsToSend.push({
          receiverId: vacancy.adventurer_id,
          eventName: 'mission:reopened',
          payload: {
            notificationId,
            missionId: mission.mid,
            vacancyId: vacancy.id,
            missionTitle: mission.title,
            senderId: user.uid,
            senderUsername: user.username,
            receiverId: vacancy.adventurer_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message: message,
          },
        });
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // And finally, notifications are sent
  for (const notification of notificationsToSend) {
    socketProvider.emitToUser(
      notification.receiverId,
      notification.eventName,
      notification.payload,
    );
  }

  return;
};

// Finish mission
export const finishMission = async (mid, user) => {
  // Parameters check
  checkRequired(mid, 'Mission id');
  checkRequired(user, 'Current user');

  // Mission is searched
  const mission = await getMissionByIdOrThrow(mid);

  // Checks if mission was created by the current user
  checkMissionBelongsToUser(mission.owner_id, user.uid);

  // Checks if mission can be finished by state
  if (
    !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
      MISSION_STATUS.FINISHED.ID,
    )
  )
    throw new AppError(
      messages.MISSION.FINISH.CANNOT_IN_CURRENT_MISSION_STATE,
      409,
    );

  // Checks if every vacancy is in empty or finished state
  const participants = await missionParticipationModel.findAllByMid(mid);
  const canFinish = participants.every(
    (participant) =>
      participant.status === MISSION_PARTICIPATION_STATUS.EMPTY.ID ||
      participant.status === MISSION_PARTICIPATION_STATUS.RELEASED.ID,
  );
  if (!canFinish)
    throw new AppError(
      messages.MISSION.FINISH.CANNOT_ADVENTURERS_IN_PROGRESS,
      409,
    );

  // Then, mission status update and conversation closure are made
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Mission status is changed
    await missionModel.updateStatusByMid(
      mid,
      MISSION_STATUS.FINISHED.ID,
      client,
    );

    // And conversation is ended
    await conversationService.closeMissionConversationType(mid, client);
    await client.query('COMMIT');
    return;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Ban mission
export const banMission = async (user, mid, rid, reason) => {
  // Parameter checks
  checkRequired(user, 'Admin user');
  checkRequired(mid, 'Mission id');
  checkRequired(rid, 'Report id');
  checkRequired(reason, 'Report decision reason');

  // Only admins can do this action
  if (user.role !== USER_ROLE.ADMIN.ID)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);

  // Gets report
  const report = await reportService.getReport(rid);

  // Checks if report has not been answered yet
  if (report.status === REPORT_STATUS.ANSWERED.ID)
    throw new AppError(messages.REPORT.GENERAL.ALREADY_ANSWERED, 409);

  // Mission is searched
  const mission = await getMissionByIdOrThrow(mid);
  const isDeleting = MISSION_STATUS[mission.status].CAN_DELETE;

  // Participations are got
  const participations =
    await missionParticipationModel.findAllOccupiedByMid(mid);
  const successfulPayments = [];
  // If mission is cancelled, payment is sent to every vacancy
  if (!isDeleting) {
    const stripePromises = participations.map(async (vacancy) => {
      try {
        // Gets adventurer info
        const adventurer = await userService.getUserByUidOrThrow(
          vacancy.adventurer_id,
        );

        // Creates transfer in Stripe outside database transaction
        if (adventurer.stripe_connected_id) {
          const transferData = {
            amount: Math.round(vacancy.monetary_reward * 100),
            currency: 'eur',
            destination: adventurer.stripe_connected_id,
            description: `mission_banned`,
            transfer_group: `mission_${mid}`,
          };
          const idempotencyKey = `ban_${mid}_vac_${vacancy.id}`;

          // Makes transfer with idempotency key
          const transfer = await paymentProvider.createTransfer(
            transferData,
            idempotencyKey,
          );

          // Now saves it in database inside its own transaction
          const receiptClient = await pool.connect();
          try {
            await receiptClient.query('BEGIN');

            await missionPaymentModel.create(
              {
                mid: mission.mid,
                vacancy_id: vacancy.id,
                sender_id: HERMYX_SYSTEM_ID,
                receiver_id: adventurer.uid,
                stripe_transaction_id: transfer.id,
                transaction_type: TRANSACTION_TYPE.BAN_COMPENSATION.ID,
                amount_paid: vacancy.monetary_reward,
              },
              receiptClient,
            );

            // Updates mission participation payment status
            await missionParticipationModel.updatePaymentStatusById(
              vacancy.id,
              MISSION_PARTICIPATION_PAYMENT_STATUS.LIQUIDATED.ID,
              receiptClient,
            );

            await receiptClient.query('COMMIT');
            successfulPayments.push(vacancy.id);
          } catch (dbError) {
            await receiptClient.query('ROLLBACK');
            // If db fails but transfer was correct, a log should be created to fix that inconsistency as soon as possible
            console.error(
              `FATAL DB ERROR: Transfer ${transfer.id} sent to ${adventurer.uid} after mission ban but DB failed`,
              dbError,
            );
          } finally {
            receiptClient.release();
          }
        }
      } catch (stripeError) {
        // If a Stripe payment fails, for doesn't end, error should be saved in a log to fix it as soon as possible
        console.error(
          `Stripe Error while paying out vacancy ${vacancy.id} due to mission ban compensation:`,
          stripeError.message,
        );
      }
    });

    // All transfers are executed in parallel so is time saving
    await Promise.allSettled(stripePromises);
  }

  // Then, main transaction is done
  const client = await pool.connect();
  const notificationsToSend = [];
  let reportClosed;
  try {
    await client.query('BEGIN');
    // First, status is changed if every of each is correct
    if (participations.length === successfulPayments.length)
      await missionModel.updateStatusByMid(
        mid,
        MISSION_STATUS.REPORTED.ID,
        client,
      );

    // If mission can be deleted, its emptied completely
    if (isDeleting) {
      const updatedVacancies =
        await missionParticipationModel.cleanMissionParticipation(mid, client);
      if (participations.length !== updatedVacancies)
        throw new AppError(messages.MISSION.BAN.CANNOT_DELETE_VACANCIES, 409);

      const emptiedMission = await missionModel.emptyMission(mid, client);
      if (emptiedMission < 1)
        throw new AppError(messages.MISSION.GENERAL.MISSION_NOT_FOUND, 409);
    }

    // And current report is closed
    reportClosed = await reportService.closeReportAndConversation(
      rid,
      REPORT_DECISION.BAN_MISSION.ID,
      reason,
      user.uid,
      client,
    );
    if (!reportClosed)
      throw new AppError(messages.REPORT.GENERAL.REPORT_NOT_FOUND, 404);

    const ownerMessage = isDeleting
      ? messages.NOTIFICATION.BAN_MISSION.DELETE
      : messages.NOTIFICATION.CANCEL_MISSION.CANCEL;
    // To mission owner
    const ownerNotificationId = await notificationService.createNotification(
      {
        type: NOTIFICATION_TYPE.MISSION.ID,
        kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
        action: NOTIFICATION_ACTION.MISSION_BAN.ID,
        status: null,
        message: ownerMessage,
        senderId: HERMYX_SYSTEM_ID,
        receiverId: mission.owner_id,
        payload: { associated_mission_id: mission.mid },
      },
      client,
    );

    notificationsToSend.push({
      receiverId: mission.owner_id,
      eventName: 'mission:ban',
      payload: {
        notificationId: ownerNotificationId,
        missionId: mission.mid,
        vacancyId: null,
        missionTitle: mission.title,
        senderId: HERMYX_SYSTEM_ID,
        senderUsername: user.username,
        receiverId: mission.owner_id,
        type: NOTIFICATION_TYPE.MISSION.ID,
        message: ownerMessage,
      },
    });

    // To every adventurer
    for (const vacancy of participations) {
      if (MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT) {
        const message = isDeleting
          ? messages.NOTIFICATION.BAN_MISSION.DELETE
          : successfulPayments.includes(vacancy.id)
            ? messages.NOTIFICATION.BAN_MISSION.CANCEL.SUCCESSFUL
            : messages.NOTIFICATION.BAN_MISSION.CANCEL.ISSUED;
        const advNotificationId = await notificationService.createNotification(
          {
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: NOTIFICATION_ACTION.MISSION_BAN.ID,
            status: null,
            message: message,
            senderId: HERMYX_SYSTEM_ID,
            receiverId: vacancy.adventurer_id,
            payload: { associated_mission_id: mission.mid },
          },
          client,
        );

        notificationsToSend.push({
          receiverId: vacancy.adventurer_id,
          eventName: 'mission:ban',
          payload: {
            notificationId: advNotificationId,
            missionId: mission.mid,
            vacancyId: vacancy.id,
            missionTitle: mission.title,
            senderId: HERMYX_SYSTEM_ID,
            senderUsername: user.username,
            receiverId: vacancy.adventurer_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message,
          },
        });
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // Finally, every notification is sent
  for (const notification of notificationsToSend) {
    socketProvider.emitToUser(
      notification.receiverId,
      notification.eventName,
      notification.payload,
    );
  }

  // And conversation closure
  reportService.emitConversationClosed(
    reportClosed.participantIds,
    reportClosed.report,
  );

  return;
};

// Edit mission
export const editMission = async (user, mission, newPhotos, existingPhotos) => {
  // Parameter checks
  checkRequired(user, 'Current user');
  checkRequired(mission, 'Mission');

  // First, all fields validations are done
  const {
    originalMission,
    originalVacancies,
    newVacancies,
    existingVacancies,
    existingIds,
  } = await editMissionValidations(
    user.uid,
    mission,
    newPhotos,
    existingPhotos,
  );

  // Then external preparation (storage provider) is made
  const isProduction = process.env.NODE_ENV === 'production';
  const { uploadedPhotoUrls, photosToDelete } =
    await editMissionExternalPreparation(
      newPhotos,
      existingPhotos,
      mission.mid,
      isProduction,
    );

  // Then, database transaction is made
  const { notificationsToSend, updatedMission } =
    await editMissionInternalUpdates(
      mission,
      originalMission,
      uploadedPhotoUrls,
      photosToDelete,
      existingIds,
      existingVacancies,
      originalVacancies,
      newVacancies,
      user,
    );

  // Lastly, after database commit, storage provider deletion is done
  await editMissionExternalUpdates(
    photosToDelete,
    existingPhotos,
    isProduction,
    notificationsToSend,
  );

  return updatedMission;
};

const editMissionValidations = async (
  uid,
  mission,
  newPhotos,
  existingPhotos,
) => {
  // Checks if photo number is correct
  if (newPhotos.length + existingPhotos.length > consts.MISSION.PHOTOS.MAX)
    throw buildTooManyFilesError();

  // Gets original mission info
  const originalMission = await missionModel.findByMidExcludingUid(mission.mid);
  if (!originalMission) throw buildMissionNotFoundError();

  // Checks mission is owned by user
  checkMissionBelongsToUser(originalMission.owner_id, uid);

  // Checks that mission is in a editable status
  if (!MISSION_STATUS[originalMission.status].CAN_EDIT)
    throw new AppError(messages.MISSION.EDIT.CANNOT_EDIT_MISSION, 409);

  // Checks if user has a mission already with the same title and different id
  await checkUserMissionWithSameTitle(uid, mission.title, mission.mid);

  // Gets current vacancies info
  const originalVacancies =
    await missionParticipationModel.findAllOccupiedByMid(mission.mid);

  // Updates each vacancy of the mission, first, new and existing vacancies are selected
  const newVacancies = mission.vacanciesData.filter(
    (v) =>
      typeof v.id === 'string' ||
      (typeof v.id === 'number' &&
        v.status === MISSION_PARTICIPATION_STATUS.EMPTY.ID),
  );
  const existingVacancies = mission.vacanciesData.filter(
    (v) =>
      typeof v.id === 'number' &&
      v.status !== MISSION_PARTICIPATION_STATUS.EMPTY.ID,
  );
  // Id array including existing vacancies that stayed
  const existingIds = existingVacancies.map((v) => v.id);

  // New mission info can delete existing vacancies only in opened state
  if (!MISSION_STATUS[originalMission.status].CAN_DELETE_ADVENTURERS) {
    if (existingIds.length < originalVacancies.length) {
      throw new AppError(
        messages.MISSION.EDIT.CANNOT_DELETE_EXISTING_VACANCIES,
        409,
      );
    }
  }

  // Checks if vacancies are editable
  for (const vacancy of existingVacancies) {
    const currentOriginal = originalVacancies.find(
      (vac) => vac.id === vacancy.id,
    );

    if (
      currentOriginal &&
      !MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_EDIT
    ) {
      if (
        Number(currentOriginal.monetary_reward) !== Number(vacancy.reward) ||
        currentOriginal.description !== vacancy.description ||
        currentOriginal.title !== vacancy.title
      ) {
        throw new AppError(messages.MISSION.EDIT.CANNOT_EDIT_VACANCY, 409);
      }
    }
  }

  return {
    originalMission,
    originalVacancies,
    newVacancies,
    existingVacancies,
    existingIds,
  };
};

const editMissionExternalPreparation = async (
  newPhotos,
  existingPhotos,
  mid,
  isProduction,
) => {
  // Photos management, first uploading and saving new photos
  let uploadedPhotoUrls = [];

  if (newPhotos.length > 0) {
    uploadedPhotoUrls = await Promise.all(
      newPhotos.map(async (file) => {
        if (isProduction) {
          return await storageProvider.uploadToAzureBlob(
            file,
            'mission-photos',
          );
        } else {
          return await storageProvider.saveToLocalStorage(
            file,
            'uploads/mission-photos',
          );
        }
      }),
    );
  }
  const currentPhotosInDb = await missionPhotoModel.findAllByMid(mid);
  const photosToDelete = currentPhotosInDb.filter(
    (dbPhoto) => !existingPhotos.includes(dbPhoto.url),
  );

  return { uploadedPhotoUrls, photosToDelete };
};

const editMissionInternalUpdates = async (
  mission,
  originalMission,
  uploadedPhotoUrls,
  photosToDelete,
  existingIds,
  existingVacancies,
  originalVacancies,
  newVacancies,
  user,
) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // First internal updates
    const { updatedMission, vacanciesToNotify } = await internalUpdates(
      mission,
      originalMission,
      uploadedPhotoUrls,
      photosToDelete,
      existingIds,
      existingVacancies,
      originalVacancies,
      newVacancies,
      client,
    );

    // And then, notifications
    const notificationsToSend = await internalNotifications(
      mission,
      updatedMission,
      originalMission,
      existingIds,
      user,
      vacanciesToNotify,
      originalVacancies,
      client,
    );

    // Commits
    await client.query('COMMIT');
    return { notificationsToSend, updatedMission };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const internalUpdates = async (
  mission,
  originalMission,
  uploadedPhotoUrls,
  photosToDelete,
  existingIds,
  existingVacancies,
  originalVacancies,
  newVacancies,
  client,
) => {
  // Starting with tables updates
  mission.totalPayment = originalMission.total_payment;

  // Updates mission
  const updatedMission = await missionModel.update(mission, client);

  // Then, inserts new photos on db
  for (const photoURL of uploadedPhotoUrls) {
    await missionPhotoModel.create(mission.mid, photoURL, client);
  }
  // And deletes old photos from db
  for (const dbPhoto of photosToDelete) {
    await missionPhotoModel.deleteById(dbPhoto.id, client);
  }

  // First operation, deleting vacancies that are not occupied from the original mission
  await missionParticipationModel.deleteAllUnoccupied(
    mission.mid,
    existingIds,
    client,
  );

  const vacanciesToNotify = [];
  // After that, updating existing vacancies
  for (const vacancy of existingVacancies) {
    // Finds existing vacancy
    const currentOriginalVacancy = originalVacancies.find(
      (vac) => vac.id === vacancy.id,
    );
    // Updates existing vacancy only if its found, that means it hasn't been added or deleted
    if (currentOriginalVacancy !== undefined) {
      // Checks for each vacancy if any field has been changed
      if (
        Number(currentOriginalVacancy?.monetary_reward) !==
          Number(vacancy.reward) ||
        currentOriginalVacancy?.description + '' !== vacancy.description ||
        currentOriginalVacancy?.title + '' !== vacancy.title
      ) {
        // So its saves that vacancy because its owner will have to be notified
        const vacancyToSave = {
          adventurer_id: currentOriginalVacancy?.adventurer_id,
          ...vacancy,
        };
        vacanciesToNotify.push(vacancyToSave);
      }

      // Then, makes allowed changes in vacancy (anything but monetary reward)
      await missionParticipationModel.update(mission.mid, vacancy, client);
    }
  }

  // Lastly, inserting new vacancies
  for (const newVacancy of newVacancies)
    await missionParticipationModel.create(mission.mid, newVacancy, client);

  return { updatedMission, vacanciesToNotify };
};

const internalNotifications = async (
  mission,
  updatedMission,
  originalMission,
  existingIds,
  user,
  vacanciesToNotify,
  originalVacancies,
  client,
) => {
  // eslint-disable-next-line prefer-const
  let notificationsToSend = [];

  // First notifications to every participant, if mission's info has changed
  await missionChangedNotifications(
    mission,
    updatedMission,
    originalMission,
    existingIds,
    user,
    notificationsToSend,
    client,
  );

  // Then, if vacancy info is changed, each adventurer is notified. If monetary reward is changed, the notification is actionable.
  for (const vacancy of vacanciesToNotify) {
    // eslint-disable-next-line prefer-const
    let changes = [];
    // First, if any field of the vacancy has been changed, notification is sent
    await vacancyChangedNotifications(
      vacancy,
      originalVacancies,
      mission,
      updatedMission,
      user,
      notificationsToSend,
      changes,
      client,
    );
    // Then, if monetary reward has been changed, notification is sent
    await monetaryRewardChangedNotifications(
      vacancy,
      originalVacancies,
      mission,
      updatedMission,
      user,
      notificationsToSend,
      changes,
      client,
    );
  }

  return notificationsToSend;
};

const missionChangedNotifications = async (
  mission,
  updatedMission,
  originalMission,
  existingIds,
  user,
  notificationsToSend,
  client,
) => {
  const changes = [];
  Object.keys(updatedMission).forEach((key) => {
    // Detects changes in mission info, except for publication date and total payment
    if (
      originalMission[key] !== updatedMission[key] &&
      key !== 'publication_date' &&
      key !== 'total_payment'
    ) {
      if (key === 'total_vacancies') key = 'total vacancies';
      changes.push(key);
    }
  });

  if (changes.length > 0) {
    for (const vacancyId of existingIds) {
      const vacancy = await missionParticipationModel.findById(
        vacancyId,
        client,
      );
      if (
        vacancy.adventurer_id &&
        MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT
      ) {
        const message = messages.NOTIFICATION.MISSION_EDIT.MISSION_INFO_CHANGED(
          updatedMission.title,
          changes,
        );
        const notificationId = await notificationService.createNotification(
          {
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
            status: null,
            message: message,
            senderId: user.uid,
            receiverId: vacancy.adventurer_id,
            payload: {
              associated_mission_id: mission.mid,
              associated_vacancy_id: vacancyId,
            },
          },
          client,
        );
        notificationsToSend.push({
          receiverId: vacancy.adventurer_id,
          event: 'mission:edited',
          payload: {
            notificationId,
            missionId: mission.mid,
            vacancyId: vacancyId,
            missionTitle: mission.title,
            senderId: user.uid,
            senderUsername: user.username,
            receiverId: vacancy.adventurer_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message: message,
          },
        });
      }
    }
  }
};

const vacancyChangedNotifications = async (
  vacancy,
  originalVacancies,
  mission,
  updatedMission,
  user,
  notificationsToSend,
  changes,
  client,
) => {
  Object.keys(vacancy).forEach((key) => {
    // Detects changes in mission info
    if (
      originalVacancies.find((vac) => vac.id === vacancy.id)[key] !==
        vacancy[key] &&
      key !== 'reward'
    )
      changes.push(key);
    // The reward has different key name on each object
    if (
      key === 'reward' &&
      Number(
        originalVacancies.find((vac) => vac.id === vacancy.id)[
          'monetary_reward'
        ],
      ) !== Number(vacancy[key])
    )
      changes.push(key);
  });

  if (
    changes.length > 0 &&
    !(changes.length === 1 && changes.includes('reward')) && // If the only change is the reward, no additional notification is needed
    vacancy.adventurer_id &&
    MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT
  ) {
    // First, informational notification is sended
    const message = messages.NOTIFICATION.MISSION_EDIT.VACANCY_INFO_CHANGED(
      updatedMission.title,
      changes,
    );
    const notificationId = await notificationService.createNotification(
      {
        type: NOTIFICATION_TYPE.MISSION.ID,
        kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
        action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
        status: null,
        message: message,
        senderId: user.uid,
        receiverId: vacancy.adventurer_id,
        payload: {
          associated_mission_id: mission.mid,
          associated_vacancy_id: vacancy.id,
        },
      },
      client,
    );
    notificationsToSend.push({
      receiverId: vacancy.adventurer_id,
      event: 'mission:edited',
      payload: {
        notificationId,
        missionId: mission.mid,
        vacancyId: vacancy.id,
        missionTitle: mission.title,
        senderId: user.uid,
        senderUsername: user.username,
        receiverId: vacancy.adventurer_id,
        type: NOTIFICATION_TYPE.MISSION.ID,
        message: message,
      },
    });
  }
};

const monetaryRewardChangedNotifications = async (
  vacancy,
  originalVacancies,
  mission,
  updatedMission,
  user,
  notificationsToSend,
  changes,
  client,
) => {
  // Then, if monetary reward has been changed, notification is sent
  if (changes.includes('reward')) {
    // First, if a pending monetary reward notification exists, it changes its value
    // eslint-disable-next-line prefer-const
    let notification =
      await notificationService.findNotificationByActionStatusAndVacancyId(
        NOTIFICATION_ACTION.MISSION_EDIT.ID,
        NOTIFICATION_STATUS.PENDING.ID,
        vacancy.id,
        client,
      );
    if (notification.length > 0) {
      notification[0].payload.new_offer = vacancy.reward;
      notification[0].message =
        messages.NOTIFICATION.MISSION_EDIT.NEW_REWARD_OFFER(
          updatedMission.title,
          originalVacancies.find((vac) => vac.id === vacancy.id)
            .monetary_reward,
          vacancy.reward,
        );
      await notificationService.updateNotification({
        nid: notification[0].nid,
        type: notification[0].type,
        kind: notification[0].kind,
        action: notification[0].action,
        status: notification[0].status,
        message: notification[0].message,
        senderId: notification[0].sender_id,
        recipientId: notification[0].recipient_id,
        payload: notification[0].payload,
      });
    } else {
      // If not, the new notification is send
      if (MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT) {
        const message = messages.NOTIFICATION.MISSION_EDIT.NEW_REWARD_OFFER(
          updatedMission.title,
          originalVacancies.find((vac) => vac.id === vacancy.id)
            .monetary_reward,
          vacancy.reward,
        );
        const notificationId = await notificationService.createNotification({
          type: NOTIFICATION_TYPE.MISSION.ID,
          kind: NOTIFICATION_KIND.ACTIONABLE.ID,
          action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
          status: NOTIFICATION_STATUS.PENDING.ID,
          message: message,
          senderId: user.uid,
          receiverId: vacancy.adventurer_id,
          payload: {
            associated_mission_id: mission.mid,
            associated_vacancy_id: vacancy.id,
            new_offer: vacancy.reward,
          },
        });
        notificationsToSend.push({
          receiverId: vacancy.adventurer_id,
          event: 'mission:edited',
          payload: {
            notificationId,
            missionId: mission.mid,
            vacancyId: vacancy.id,
            missionTitle: mission.title,
            senderId: user.uid,
            senderUsername: user.username,
            receiverId: vacancy.adventurer_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message: message,
          },
        });
      }
    }
  }
};

const editMissionExternalUpdates = async (
  photosToDelete,
  existingPhotos,
  isProduction,
  notificationsToSend,
) => {
  for (const dbPhoto of photosToDelete) {
    if (!existingPhotos.includes(dbPhoto.url)) {
      if (isProduction) {
        await storageProvider.deleteFromAzureBlob(
          dbPhoto.url,
          'mission-photos',
        );
      } else {
        await storageProvider.deleteFromLocalStorage(dbPhoto.url);
      }
    }
  }

  // And notifications are sent
  for (const notification of notificationsToSend) {
    socketProvider.emitToUser(
      notification.receiverId,
      notification.event,
      notification.payload,
    );
  }
};

/// Error builders
const buildMissionNotFoundError = () => {
  return new AppError(messages.MISSION.GENERAL.MISSION_NOT_FOUND, 404);
};

const buildTooManyFilesError = () => {
  return new AppError(messages.GENERAL.TOO_MANY_FILES, 400);
};

/// Helper functions
const checkUserMissionWithSameTitle = async (uid, title, mid = undefined) => {
  // Checks if user has a mission already with the same title
  const { hasDuplicate } = await missionModel.findByUidAndTitle(
    uid,
    title,
    mid,
  );
  if (hasDuplicate)
    throw new AppError(
      messages.MISSION.PUBLISH.MISSION_WITH_SAME_TITLE,
      400,
      'title',
    );
};

const checkMissionBelongsToUser = (missionOwnerUid, currentUserUid) => {
  // Checks mission is owned by user
  if (missionOwnerUid !== currentUserUid)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
};

const checkVacancyNotMission = (vacancyMid, mid) => {
  // Checks that vacancy exists in that mission
  if (vacancyMid !== mid)
    throw new AppError(messages.MISSION.GENERAL.VACANCY_NOT_IN_MISSION, 409);
};

const checkCanAcceptAdventurers = (status) => {
  // Checks if mission can accept adventurers
  if (!MISSION_STATUS[status].CAN_ACCEPT_ADVENTURERS)
    throw new AppError(messages.MISSION.JOIN.NOT_ACCEPTS_ADVENTURERS, 409);
};

const checkAdventurerAlreadyJoined = async (mid, uid) => {
  // Checks if user has already joined that mission
  const alreadyJoined =
    await missionParticipationModel.findByMidAndAdventurerId(mid, uid);
  if (alreadyJoined)
    throw new AppError(messages.MISSION.JOIN.ALREADY_JOINED, 409);
};

// Sync a mission status after review a participation
export const syncMissionCompletionStatus = async (mid, client) => {
  // Gets summary
  const summary = await missionModel.getMissionStatusSummary(mid, client);

  // If it was not found, it returns null
  if (!summary || summary.participant_count === 0) {
    return null;
  }

  // Decides next status
  let nextStatus = null;
  if (
    summary.active_count > 0 ||
    (summary.active_count === 0 && summary.dispute_count === 0)
  ) {
    nextStatus = MISSION_STATUS.IN_PROGRESS.ID;
  } else if (summary.dispute_count > 0) {
    nextStatus = MISSION_STATUS.IN_DISPUTE.ID;
  }
  if (!nextStatus) {
    return null;
  }

  // Updates status
  return await missionModel.updateStatusByMid(mid, nextStatus, client);
};

// Expels a banned adventurer from a mission and handles refunds
export const expelBannedAdventurerFromMission = async (
  mission,
  user,
  admin,
) => {
  // Parameter checks
  checkRequired(mission, 'Mission');
  checkRequired(user, 'User');
  checkRequired(admin, 'Admin');

  let notificationId, notificationMessage;
  // If mission is not closed
  if (MISSION_STATUS[mission.status].CAN_DELETE) {
    // Uses database transaction from the start
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Unjoins user
      const unjoin = await unjoinParticipant(mission.mid, user.uid, client);
      if (unjoin < 1)
        throw new AppError(messages.MISSION.GENERAL.MISSION_NOT_FOUND, 404);

      // Updates occupied vacancies
      const unjoinMission = await updateOccupiedVacancies(
        mission.mid,
        -1,
        client,
      );
      if (unjoinMission.length < 1)
        throw new AppError(messages.MISSION.GENERAL.MISSION_NOT_FOUND);

      // Chooses message
      notificationMessage = messages.NOTIFICATION.BAN_USER.OPENED_MISSION(
        user.username,
        mission.title,
      );
      // Creates notification
      notificationId = await notificationService.createNotification({
        type: NOTIFICATION_TYPE.MISSION.ID,
        kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
        action: NOTIFICATION_ACTION.USER_BAN.ID,
        status: null,
        message: notificationMessage,
        senderId: HERMYX_SYSTEM_ID,
        receiverId: mission.owner_id,
        payload: {
          associated_mission_id: mission.mid,
          associated_vacancy_id: mission.vacancy_id || null,
        },
      });

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    // Send notification to applicant
    await sendBannedAdventurerNotification(
      mission,
      user,
      notificationId,
      notificationMessage,
    );
  }

  // Mission is closed
  else if (
    MISSION_STATUS[mission.status].CAN_CANCEL &&
    MISSION_PARTICIPATION_STATUS[mission.participation_status].CAN_INTERACT
  ) {
    // In a database transaction, prepares mission and marks it as partially refunded
    const prepClient = await pool.connect();
    try {
      await prepClient.query('BEGIN');

      // Unjoins user
      const unjoin = await unjoinParticipant(mission.mid, user.uid, prepClient);
      if (unjoin < 1)
        throw new AppError(messages.MISSION.GENERAL.MISSION_NOT_FOUND, 404);

      // Updates occupied vacancies
      await updateOccupiedVacancies(mission.mid, -1, prepClient);

      // Updates participation payment status, so intent is marked
      await updateParticipationPaymentStatusById(
        mission.vacancy_id,
        MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
        prepClient,
      );

      await prepClient.query('COMMIT');
    } catch (e) {
      await prepClient.query('ROLLBACK');
      throw e;
    } finally {
      prepClient.release();
    }

    let refundSuccessful = true;
    try {
      // Now, outside of a transaction, refund is made
      const payments = await getMissionPaymentsByVacancyId(mission.vacancy_id);
      let amountToRefund = mission.monetary_reward;

      for (const payment of payments) {
        if (amountToRefund <= 0) break;

        const availableBalance = payment.amount_paid - payment.amount_refunded;
        const paymentRefund = Math.min(amountToRefund, availableBalance);

        // Call to Stripe for refund
        const refund = await paymentProvider.createRefund(
          {
            payment_intent: payment.stripe_transaction_id,
            amount: Math.round(paymentRefund * 100),
            metadata: {
              mission_id: mission.mid,
              vacancy_id: mission.vacancy_id,
              reason: 'user_banned_refund',
            },
          },
          `user_banned_refund_${mission.mid}_${mission.vacancy_id}`,
        );

        // Transaction to save refund on db
        const receiptClient = await pool.connect();
        try {
          await receiptClient.query('BEGIN');

          await refundMissionPayment(paymentRefund, payment.pid, receiptClient);

          await createMissionPayment(
            {
              mid: mission.mid,
              vacancy_id: mission.vacancy_id,
              sender_id: HERMYX_SYSTEM_ID,
              receiver_id: mission.owner_id,
              stripe_transaction_id: refund.id,
              transaction_type: TRANSACTION_TYPE.BAN_COMPENSATION.ID,
              amount_paid: paymentRefund,
            },
            receiptClient,
          );

          await receiptClient.query('COMMIT');
        } catch (dbError) {
          await receiptClient.query('ROLLBACK');
          refundSuccessful = true;
          // If db fails but transfer was correct, a log should be created to fix that inconsistency as soon as possible
          console.error(
            `FATAL DB ERROR: a refund from ${mission.vacancy_id} after monetary reward lowered but DB failed`,
            dbError,
          );
        } finally {
          receiptClient.release();
        }

        amountToRefund -= paymentRefund;
      }
    } catch (stripeError) {
      // If a Stripe payment fails error should be saved in a log to fix it as soon as possible
      refundSuccessful = true;
      console.error(
        `Stripe Error when refunding vacancy ${mission.vacancy_id} due to monetary reward lowered:`,
        stripeError.message,
      );
    }

    // Lastly, a final database transaction to close the refund process and recalculate totals
    const finalClient = await pool.connect();
    try {
      await finalClient.query('BEGIN');

      // If refund was completely successful, status is changed
      if (refundSuccessful)
        // Refunds banned vacancy
        await refundBannedVacancy(
          mission.vacancy_id,
          mission.monetary_reward,
          finalClient,
        );

      // Recalculates total payment and saves it
      const occupied_vacancies = await getAllOccupiedByMid(
        mission.mid,
        finalClient,
      );

      const newTotal =
        occupied_vacancies.reduce(
          (sum, vacancy) => sum + Number(vacancy.monetary_reward),
          0,
        ) * HERMYX_FEE || 0;

      await missionModel.updateMissionPayment(
        mission.mid,
        newTotal,
        finalClient,
      );

      // Chooses message
      notificationMessage = refundSuccessful
        ? messages.NOTIFICATION.BAN_USER.CLOSED_MISSION.SUCCESSFUL(
            user.username,
            mission.title,
          )
        : messages.NOTIFICATION.BAN_USER.CLOSED_MISSION.ISSUED(
            user.username,
            mission.title,
          );
      // Creates notification
      notificationId = await notificationService.createNotification({
        type: NOTIFICATION_TYPE.MISSION.ID,
        kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
        action: NOTIFICATION_ACTION.USER_BAN.ID,
        status: null,
        message: notificationMessage,
        senderId: HERMYX_SYSTEM_ID,
        receiverId: mission.owner_id,
        payload: {
          associated_mission_id: mission.mid,
          associated_vacancy_id: mission.vacancy_id || null,
        },
      });

      await finalClient.query('COMMIT');
    } catch (e) {
      await finalClient.query('ROLLBACK');
      throw e;
    } finally {
      finalClient.release();
    }

    // Send notifications
    await sendBannedAdventurerNotification(
      mission,
      user,
      notificationId,
      notificationMessage,
    );
  }
};

// Sends notifications to the applicant of the mission where the user has been banned
const sendBannedAdventurerNotification = async (
  mission,
  user,
  notificationId,
  message,
) => {
  // And sends it
  socketProvider.emitToUser(mission.owner_id, 'mission:adventurer-ban', {
    notificationId,
    missionId: mission.mid,
    vacancyId: mission.vacancy_id || null,
    missionTitle: mission.title,
    senderId: HERMYX_SYSTEM_ID,
    senderUsername: user.username,
    receiverId: mission.owner_id,
    type: NOTIFICATION_TYPE.MISSION.ID,
    message: message,
  });
};
