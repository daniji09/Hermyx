import {
  consts,
  HERMYX_SYSTEM_ID,
  messages,
  MISSION_PARTICIPATION_PAYMENT_STATUS,
  MISSION_PARTICIPATION_STATUS,
  MISSION_STATUS,
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  TRANSACTION_TYPE,
} from '@hermyx/shared';
import pool from '../config/db.config.js';
import { AppError } from '../utils/error.util.js';
import * as conversationService from '../services/conversation.service.js';
import * as notificationService from '../services/notification.service.js';
import * as userService from '../services/user.service.js';
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
  checkMid(mid);

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
  checkVacancyId(id);

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
  checkVacancyId(mid);
  checkAdventurerId(adventurerId);

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
  checkMid(mid);
  return await missionParticipationModel.findMissionPaymentByMid(mid);
};

// Gets all waiting for payment participants by mission
export const getAllWaitingForPaymentByMid = async (mid) => {
  checkMid(mid);
  return await missionParticipationModel.findAllWaitingForPaymentByMid(mid);
};

// Create mission payment
export const createMissionPayment = async (missionPaymentData, client) => {
  checkMissionPaymentData(missionPaymentData);
  return await missionPaymentModel.create(missionPaymentData, client);
};

// Pays a vacancy
export const payParticipant = async (id, payment, client) => {
  checkVacancyId(id);
  checkPayment(payment);
  return await missionParticipationModel.payParticipant(id, payment, client);
};

// Get all occupied vacancies of a mission
export const getAllOccupiedByMid = async (mid) => {
  checkMid(mid);
  return await missionParticipationModel.findAllOccupiedByMid(mid);
};

// Updates mission payment
export const updateMissionPayment = async (mid, payment, client) => {
  checkMid(mid);
  checkPayment(payment);
  return await missionModel.updateMissionPayment(mid, payment, client);
};

// Updates status
export const updateStatusByMid = async (mid, status, client) => {
  checkMid(mid);
  checkStatus(status);
  return await missionModel.updateStatusByMid(mid, status, client);
};

// Updates mission participation status by mid an adventurer
export const updateParticipationStatusByMidAndAdventurer = async (
  mid,
  adventurerId,
  status,
  client,
) => {
  checkMid(mid);
  checkAdventurerId(adventurerId);
  checkStatus(status);
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
  checkVacancyId(id);
  checkAdventurerId(adventurerId);
  checkStatus(status);
  return await missionParticipationModel.updateAdventurerAndStatus(
    id,
    adventurerId,
    status,
    client,
  );
};

// Updates occupied vacancies
export const updateOccupiedVacancies = async (mid, amount, client) => {
  checkMid(mid);
  checkAmount(amount);
  return await missionModel.updateOccupiedVacancies(mid, amount, client);
};

// Starts participants of a mission
export const startParticipants = async (mid, client) => {
  checkMid(mid);
  return await missionParticipationModel.startParticipants(mid, client);
};

// Finds a payment by Stripe transaction id
export const findPaymentByStripeTransactionId = async (stripeTransactionId) => {
  checkStripeTransactionId(stripeTransactionId);
  return await missionPaymentModel.findByStripeTransactionId(
    stripeTransactionId,
  );
};

// Gets mission status summary
export const getMissionStatusSummary = async (mid, client) => {
  checkMid(mid);
  return await missionModel.getMissionStatusSummary(mid, client);
};

// Syncs mission status due to a participation status change
export const syncMissionCompletionStatus = async (mid, client) => {
  checkMid(mid);
  return missionModel.syncMissionCompletionStatus(mid, client);
};

// Updates payment status by id
export const updateParticipationPaymentStatusById = async (
  vacancyId,
  status,
  client,
) => {
  checkVacancyId(vacancyId);
  checkStatus(status);
  return await missionParticipationModel.updatePaymentStatusById(
    vacancyId,
    status,
    client,
  );
};

//---
export const getMissionParticipationReviewContext = async (
  mid,
  adventurerId,
  client,
) => {
  checkMid(mid);
  checkAdventurerId(adventurerId);
  return missionParticipationModel.findReviewContext(mid, adventurerId, client);
};

export const updateMissionParticipationOwnerReview = async (
  participationId,
  reviewId,
  client,
) =>
  missionParticipationModel.updateOwnerReview(
    participationId,
    reviewId,
    client,
  );

export const updateMissionParticipationAdventurerReview = async (
  participationId,
  reviewId,
  client,
) =>
  missionParticipationModel.updateAdventurerReview(
    participationId,
    reviewId,
    client,
  );
export const disputeMissionParticipation = async (mid, adventurerId, client) =>
  missionParticipationModel.disputeParticipation(mid, adventurerId, client);

export const getOccupiedMissionParticipations = async (mid, client) =>
  missionParticipationModel.findAllOccupiedByMid(mid, client);

export const updateMissionParticipationStatus = async (
  participationId,
  status,
  client,
) => missionParticipationModel.updateStatus(participationId, status, client);

export const updateMissionParticipationPaymentStatus = async (
  participationId,
  status,
  client,
) =>
  missionParticipationModel.updatePaymentStatus(
    participationId,
    status,
    client,
  );

export const updateMissionParticipationReward = async (
  participationId,
  monetaryReward,
  client,
) =>
  missionParticipationModel.updateVacancyMonetaryReward(
    participationId,
    monetaryReward,
    client,
  );

export const refundMissionParticipation = async (
  participationId,
  amount,
  client,
) => missionParticipationModel.refundVacancy(participationId, amount, client);

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

/// Endpoint complex function
export const releaseMissionParticipation = async (
  mid,
  adventurerId,
  client,
) => {
  if (!client) {
    const transactionClient = await pool.connect();
    try {
      await transactionClient.query('BEGIN');
      const participation = await releaseMissionParticipation(
        mid,
        adventurerId,
        transactionClient,
      );
      await transactionClient.query('COMMIT');
      return participation;
    } catch (error) {
      await transactionClient.query('ROLLBACK');
      throw error;
    } finally {
      transactionClient.release();
    }
  }
  checkMid(mid);
  checkAdventurerId(adventurerId);
  const participation =
    await missionParticipationModel.updateStatusByMidAndAdventurer(
      mid,
      adventurerId,
      MISSION_PARTICIPATION_STATUS.RELEASED.ID,
      client,
    );
  if (participation)
    await conversationService.freezeMissionConversationHistory(
      mid,
      adventurerId,
      client,
    );
  return participation;
};

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
  checkUid(uid);
  checkMid(mid);

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
  checkUid(uid);
  checkTitle(title);
  checkDescription(description);
  checkVacancies(vacancies);
  checkVacanciesData(vacanciesData);

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
  checkMid(mid);
  checkUser(user);

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
  checkMid(mid);
  checkUser(user);
  checkVacancyId(vacancyId);

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
  checkMid(mid);
  checkVacancyId(vacancyId);
  checkSenderId(senderId);
  checkReceiverId(receiverId);

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
  checkMid(mid);
  checkVacancyId(vacancyId);
  checkUser(user);

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
        null, // ¡La magia de desconectar al usuario!
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
  checkMid(mid);
  checkUser(user);

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

// Cancel mission TODO: probar
export const cancelMission = async (mid, user) => {
  // Parameter checks
  checkMid(mid);
  checkUser(user);

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

    // Finally, mission has been updated to cancel status
    if (occupied_vacancies.length === successfulPayments.length)
      await missionModel.updateStatusByMid(mid, MISSION_STATUS.CANCELLED.ID);
  }

  // Either way, all adventurers are informed
  const notificationsToSend = [];
  const client = await pool.connect();

  // Notifications are created in a transaction
  try {
    await client.query('BEGIN');
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
  checkMid(mid);
  checkUser(user);

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
  checkMid(mid);
  checkUser(user);

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

// Edit mission
export const editMission = async (user, mission, newPhotos, existingPhotos) => {
  // Parameter checks
  checkUid(user.uid);
  checkMission(mission);

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

/// Data checks
const checkMission = (mission) => {
  if (!mission) throw new Error(messages.GENERAL.FIELD_REQUIRED('Mission'));
};

const checkMid = (mid) => {
  if (!mid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Mid'));
};

const checkTitle = (title) => {
  if (!title) throw new Error(messages.GENERAL.FIELD_REQUIRED('Title'));
};

const checkDescription = (description) => {
  if (!description)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Description'));
};

const checkVacancies = (vacancies) => {
  if (!vacancies) throw new Error(messages.GENERAL.FIELD_REQUIRED('Vacancies'));
};

const checkVacanciesData = (vacanciesData) => {
  if (!vacanciesData)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Vacancies data'));
};

const checkVacancyId = (vacancyId) => {
  if (!vacancyId)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Vacancy id'));
};

const checkUid = (uid) => {
  if (!uid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Uid'));
};

const checkSenderId = (senderId) => {
  if (!senderId) throw new Error(messages.GENERAL.FIELD_REQUIRED('Sender id'));
};

const checkReceiverId = (receiverId) => {
  if (!receiverId)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Receiver id'));
};

const checkAdventurerId = (adventurerId) => {
  if (!adventurerId)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Adventurer id'));
};

const checkUser = (user) => {
  if (!user) throw new Error(messages.GENERAL.FIELD_REQUIRED('User'));
};

const checkMissionPaymentData = (paymentData) => {
  if (!paymentData)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Payment data'));
};

const checkPayment = (payment) => {
  if (!payment) throw new Error(messages.GENERAL.FIELD_REQUIRED('Payment'));
};

const checkStatus = (status) => {
  if (!status) throw new Error(messages.GENERAL.FIELD_REQUIRED('Status'));
};

const checkAmount = (amount) => {
  if (!amount) throw new Error(messages.GENERAL.FIELD_REQUIRED('Amount'));
};

const checkStripeTransactionId = (stripeTransactionId) => {
  if (!stripeTransactionId)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Stripe transaction id'));
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
    throw new AppError(messages.MISSION.PUBLISH.MISSION_WITH_SAME_TITLE, 400);
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
