import {
  consts,
  messages,
  MISSION_PARTICIPATION_STATUS,
  MISSION_STATUS,
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
} from '@hermyx/shared';
import pool from '../config/db.config.js';
import { AppError } from '../utils/error.util.js';
import * as conversationService from '../services/conversation.service.js';
import * as notificationService from '../services/notification.service.js';
import * as storageProvider from '../providers/storage.provider.js';
import * as socketProvider from '../providers/socket.provider.js';
import * as missionModel from '../models/mission.model.js';
import * as missionParticipationModel from '../models/mission-participation.model.js';
import * as missionPhotoModel from '../models/mission-photo.model.js';

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
  if (mission.owner_id !== user.uid)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);

  // Checks occupied vacancies
  const occupied_vacancies =
    await missionParticipationModel.findAllOccupied(mid);
  if (occupied_vacancies.length === 0)
    throw new AppError(messages.MISSION.CLOSE.CANNOT_WITHOUT_ADVENTURERS, 400);

  // Different checks for opened or reopened mission
  let nextMissionStatus, vacanciesToUpdate, message;

  if (mission.status === MISSION_STATUS.OPENED.ID) {
    if (
      !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
        MISSION_STATUS.CLOSED.ID,
      )
    )
      throw new AppError(messages.MISSION.CLOSE.CANNOT_ON_CURRENT_STATE, 400);

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
      throw new AppError(messages.MISSION.REOPEN.CANNOT_ON_CURRENT_STATE, 400);

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
    throw new AppError(messages.MISSION.CLOSE.CANNOT_ON_CURRENT_STATE, 400);
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
    await missionModel.updateStatus(mid, nextMissionStatus, client);

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

// Edit mission
export const editMission = async (user, mission, newPhotos, existingPhotos) => {
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

  // Checks mission is owned by user
  if (originalMission.owner_id !== uid)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);

  // Checks that mission is in a editable status
  if (!MISSION_STATUS[originalMission.status].CAN_EDIT)
    throw new AppError(messages.MISSION.EDIT.CANNOT_EDIT_MISSION, 400);

  // Checks if user has a mission already with the same title and different id
  await checkUserMissionWithSameTitle(uid, mission.title, mission.mid);

  // Gets current vacancies info
  const originalVacancies = await missionParticipationModel.findAllOccupied(
    mission.mid,
  );

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
        throw new AppError(messages.MISSION.EDIT.CANNOT_EDIT_VACANCY, 400);
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

const checkUid = (uid) => {
  if (!uid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Uid'));
};

const checkUser = (user) => {
  if (!user) throw new Error(messages.GENERAL.FIELD_REQUIRED('User'));
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
