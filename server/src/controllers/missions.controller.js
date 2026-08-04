//External modules
import { consts, messages } from '@hermyx/shared';
import {
  createMission as _createMission,
  getAllMissionsInDraft as _getAllMissionsInDraft,
  getMissionById as _getMissionById,
  getMissions as _getMissions,
  getById,
  getParticipantsForDisplay,
  updateMissionStatus,
  getByUidAndTitle,
  getMissionsOpened as _getMissionsOpened,
  updateMission,
  adventurerUnjoined,
  emptyMission,
  updateMissionPayment,
  openMission,
} from '../models/mission.model.js';
import { getById as getUserById } from '../models/app_user.model.js';
import {
  getById as getMissionParticipationById,
  submitParticipation as submitMissionParticipationRecord,
  getVacancyById,
  insertVacancies,
  unjoinVacancy,
  updateVacancy,
  deleteUnoccupiedVacancies,
  getOccupiedVacancies,
  getEmptyVacancies,
  markVacancyAsPaidOut,
  updateStatus,
  getJoinedVacancies,
  getWaitingForPaymentVacancies,
  cleanMissionParticipation,
  unjoinParticipant,
  updatePaymentStatus,
  refundBannedVacancy,
} from '../models/mission_participation.model.js';
import {
  createNotification,
  countParticipationReviewAttempts,
  hasPendingJoinNotification,
  findByActionStatusAndVacancy,
  updateNotification,
} from '../models/notification.model.js';
import { emitToUser } from '../services/socket.service.js';
import { createRefund, createTransfer } from '../services/payment.service.js';
import {
  MISSION_LIFE_CYCLE,
  VACANCY_LIFE_CYCLE,
} from './../../../node_modules/@hermyx/shared/utils/missions.utils.js';
import {
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
} from '@hermyx/shared/utils/notifications.utils.js';
import {
  createMissionPayment,
  getMissionPaymentsByVacancy,
  refundFromPayment,
} from '../models/mission_payment.model.js';
import {
  HERMYX_FEE,
  HERMYX_TRANSACTION_ID,
  TRANSACTION_TYPE,
  VACANCY_PAYMENT_STATUS,
} from '@hermyx/shared/utils/payment.utils.js';
import { closeReport, getReportById } from '../models/report.model.js';
import {
  REPORT_DECISION,
  REPORT_STATUS,
} from '@hermyx/shared/utils/reports.utils.js';
import {
  deleteFromAzureBlob,
  deleteFromLocalStorage,
  saveToLocalStorage,
  uploadToAzureBlob,
} from '../services/storage.service.js';
import {
  deletePhoto,
  getMissionPhotos,
  insertPhoto,
} from '../models/mission_photo.model.js';

export const getMissionById = async (req, res) => {
  try {
    // Gets the id
    const { id } = req.params;
    const uid = req.user.uid;

    // Searches mission by id
    const [mission, participants, waitingForPaymentVacancies, photos] =
      await Promise.all([
        _getMissionById(id, uid),
        getParticipantsForDisplay(id),
        getWaitingForPaymentVacancies(),
        getMissionPhotos(id),
      ]);

    // Returns success or error
    if (!mission) {
      return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
    }

    // Mission can be finished if all vacancies are empty or finished
    const canFinish =
      participants.every(
        (participant) =>
          participant.status === VACANCY_LIFE_CYCLE.EMPTY.ID ||
          participant.status === VACANCY_LIFE_CYCLE.RELEASED.ID,
      ) &&
      MISSION_LIFE_CYCLE[mission.status].VALID_NEXT_STATES.includes(
        MISSION_LIFE_CYCLE.FINISHED.ID,
      );

    return res.status(200).json({
      mission: {
        ...mission,
        participants,
        waitingForPaymentVacancies,
        canFinish,
        photos,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

export const getMissions = async (req, res) => {
  const { title } = req.query;
  const pagination = req.pagination;

  try {
    // Gets all missions filtering what is needed
    const { rows: missions, totalCount } = await _getMissions({
      title,
      pagination,
    });

    const totalItems = parseInt(totalCount);

    if (missions) {
      const totalPages = Math.ceil(totalItems / pagination.limit);
      const hasMore = pagination.page < totalPages;

      // Pagination object is built
      return res.status(200).json({
        missions,
        pagination: {
          currentPage: pagination.page,
          totalPages: totalPages,
          totalItems: totalItems,
          hasMore: hasMore,
        },
      });
    } else
      return res.status(404).json({
        errors: { general: [messages.MISSIONS_NOT_FOUND] },
      });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

export const getAllMissionsInDraft = async (req, res) => {
  try {
    const missions = await _getAllMissionsInDraft();
    res.status(200).json({ data: missions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

export const getMissionsOpened = async (req, res) => {
  const { title, minPayment, maxPayment, maxDistanceKm } = req.query;
  const pagination = req.pagination;
  const excludeOwnerId = title ? req.user?.uid : undefined;

  try {
    // Gets all missions filtering what is needed
    const { rows: missions, totalCount } = await _getMissionsOpened({
      title,
      minPayment,
      maxPayment,
      maxDistanceKm,
      originUserId: maxDistanceKm !== undefined ? req.user.uid : undefined,
      pagination,
      excludeOwnerId,
    });

    const totalItems = parseInt(totalCount);

    if (missions) {
      const totalPages = Math.ceil(totalItems / pagination.limit);
      const hasMore = pagination.page < totalPages;

      // Pagination object is built
      return res.status(200).json({
        missions,
        pagination: {
          currentPage: pagination.page,
          totalPages: totalPages,
          totalItems: totalItems,
          hasMore: hasMore,
        },
      });
    } else
      return res.status(404).json({
        errors: { general: [messages.MISSIONS_NOT_FOUND] },
      });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

/*Check whether the user wants to save the creation or create a new mission. 
Depending on that, the fields are checked or not, and the status is updated accordingly.*/
export const createMission = async (req, res) => {
  try {
    const { uid } = req.user;
    const {
      title,
      description,
      vacancies,
      vacanciesData,
      latitude,
      longitude,
    } = req.body;
    const photos = req.files.photos;
    const missionData = {
      title: title || 'Mission not titled',
      description: description || 'No description',
      vacancies: vacancies || 0,
      vacanciesData: vacanciesData || '',
      totalPayment: 0,
      latitude: latitude || null,
      longitude: longitude || null,
      status: MISSION_LIFE_CYCLE.OPENED.ID,
      ownerId: uid,
    };

    // Checks if user has a mission already with the same title
    const { hasDuplicate } = await getByUidAndTitle(uid, title);
    if (hasDuplicate)
      return res.status(400).json({
        errors: { general: [messages.MISSION_SAME_TITLE] },
      });

    // Creates the new mission
    const newMission = await _createMission(missionData);
    console.log(photos);

    // Checks if photo number is correct
    if (photos.length > consts.MISSION.PHOTOS.MAX) {
      return res.status(400).json({
        errors: { general: [messages.MISSION_SAME_TITLE] },
      });
    }

    // Saves photos
    let uploadedPhotoUrls = [];
    if (photos.length > 0) {
      // Environment variable determines whether photos are uploaded locally or to Azure
      const isProduction = process.env.NODE_ENV === 'production';
      uploadedPhotoUrls = await Promise.all(
        photos.map(async (file) => {
          if (isProduction) {
            return await uploadToAzureBlob(file);
          } else {
            return await saveToLocalStorage(file);
          }
        }),
      );
    }

    // Inserts photos
    for (const photoURL of uploadedPhotoUrls)
      await insertPhoto(newMission.mid, photoURL);

    return res.status(201).json({ mission: newMission });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

export const editMission = async (req, res) => {
  try {
    const { uid } = req.user;
    const mission = req.body;

    // New and old photos are extracted
    const newPhotos = req.files?.photos
      ? Array.isArray(req.files.photos)
        ? req.files.photos
        : [req.files.photos]
      : [];
    const existingPhotos = req.body.existingPhotos
      ? Array.isArray(req.body.existingPhotos)
        ? req.body.existingPhotos
        : [req.body.existingPhotos]
      : [];

    // Checks if photo number is correct
    if (newPhotos.length + existingPhotos.length > consts.MISSION.PHOTOS.MAX) {
      return res.status(400).json({
        errors: { general: [messages.MISSION_SAME_TITLE] },
      });
    }

    // Gets original mission info
    const originalMission = await _getMissionById(mission.mid);
    mission.totalPayment = originalMission.total_payment;

    // Checks that mission is in a editable status
    if (!MISSION_LIFE_CYCLE[originalMission.status].CAN_EDIT)
      return res.status(400).json({
        errors: { general: [messages.CANNOT_EDIT_MISSION] },
      });

    // Checks if user has a mission already with the same title and different id
    const { hasDuplicate } = await getByUidAndTitle(
      uid,
      mission.title,
      mission.mid,
    );
    if (hasDuplicate)
      return res.status(400).json({
        errors: { general: [messages.MISSION_SAME_TITLE] },
      });

    // Gets current vacancies info
    const originalVacancies = await getOccupiedVacancies(mission.mid);

    // Updates each vacancy of the mission, first, new and existing vacancies are selected
    const newVacancies = mission.vacanciesData.filter(
      (v) =>
        typeof v.id === 'string' ||
        (typeof v.id === 'number' && v.status === VACANCY_LIFE_CYCLE.EMPTY.ID),
    );
    const existingVacancies = mission.vacanciesData.filter(
      (v) =>
        typeof v.id === 'number' && v.status !== VACANCY_LIFE_CYCLE.EMPTY.ID,
    );
    // Id array including existing vacancies that stayed
    const existingIds = existingVacancies.map((v) => v.id);

    // New mission info can delete existing vacancies only in opened state
    if (!MISSION_LIFE_CYCLE[originalMission.status].CAN_DELETE_ADVENTURERS) {
      if (existingIds.length < originalVacancies.length) {
        return res.status(400).json({
          errors: {
            general: [messages.CANNOT_DELETE_EXISTING_VACANCIES],
          },
        });
      }
    }

    // Updates mission
    const updatedMission = await updateMission(mission);
    console.log(newPhotos, existingPhotos);
    // Photos management, first uploading and saving new photos
    const currentPhotosInDb = await getMissionPhotos(mission.mid);
    const isProduction = process.env.NODE_ENV === 'production';
    let uploadedPhotoUrls = [];
    if (newPhotos.length > 0) {
      uploadedPhotoUrls = await Promise.all(
        newPhotos.map(async (file) => {
          if (isProduction) {
            return await uploadToAzureBlob(file);
          } else {
            return await saveToLocalStorage(file);
          }
        }),
      );
    }

    // Then, inserting them on db
    for (const photoURL of uploadedPhotoUrls) {
      await insertPhoto(mission.mid, photoURL);
    }

    // Photos that are not in existingPhotos but exist in db, must be deleted physically and from db
    for (const dbPhoto of currentPhotosInDb) {
      if (!existingPhotos.includes(dbPhoto.url)) {
        if (isProduction) {
          await deleteFromAzureBlob(dbPhoto.url);
        } else {
          await deleteFromLocalStorage(dbPhoto.url);
        }
        await deletePhoto(dbPhoto.id);
      }
    }

    // First operation, deleting vacancies that are not occupied from the original mission
    await deleteUnoccupiedVacancies(mission.mid, existingIds);

    const vacanciesToNotify = [];
    // After that, updating existing vacancies
    const updatePromises = existingVacancies.map((vacancy) => {
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
          // If that vacancy is not editable, its an error
          if (!VACANCY_LIFE_CYCLE[vacancy.status].CAN_EDIT)
            return res.status(400).json({
              errors: { general: [messages.CANNOT_EDIT_VACANCY] },
            });
          // So its saves that vacancy because its owner will have to be notified
          const vacancyToSave = {
            adventurer_id: currentOriginalVacancy?.adventurer_id,
            ...vacancy,
          };
          vacanciesToNotify.push(vacancyToSave);
        }

        // Then, makes allowed changes in vacancy (anything but monetary reward)
        return updateVacancy(mission.mid, vacancy);
      }
    });
    await Promise.all(updatePromises);

    // Lastly, inserting new vacancies
    await insertVacancies(mission.mid, newVacancies);

    // First, if mission info is changed, every old vacancy is notified
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
        const vacancy = await getVacancyById(mission.mid, vacancyId);
        if (
          vacancy.adventurer_id &&
          VACANCY_LIFE_CYCLE[vacancy.status].CAN_INTERACT
        ) {
          const message = `${updatedMission.title} info has been changed: ${changes.join(', ')}. Check it out!`;
          const notificationId = await createNotification({
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
            status: null,
            message: message,
            senderId: uid,
            receiverId: vacancy.adventurer_id,
            payload: {
              associated_mission_id: mission.mid,
              associated_vacancy_id: vacancyId,
            },
          });
          emitToUser(vacancy.adventurer_id, 'mission:edited', {
            notificationId,
            missionId: mission.mid,
            vacancyId: vacancyId,
            missionTitle: mission.title,
            senderId: uid,
            senderUsername: req.user.username,
            receiverId: vacancy.adventurer_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message: message,
          });
        }
      }
    }

    // Then, if vacancy info is changed, each adventurer is notified. If monetary reward is changed, the notification is actionable.
    for (const vacancy of vacanciesToNotify) {
      const changes = [];
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
        VACANCY_LIFE_CYCLE[vacancy.status].CAN_INTERACT
      ) {
        // First, informational notification is sended
        const message = `Your vacancy at ${updatedMission.title} info has been changed: ${changes.join(', ')}. Check it out!`;
        const notificationId = await createNotification({
          type: NOTIFICATION_TYPE.MISSION.ID,
          kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
          action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
          status: null,
          message: message,
          senderId: uid,
          receiverId: vacancy.adventurer_id,
          payload: {
            associated_mission_id: mission.mid,
            associated_vacancy_id: vacancy.id,
          },
        });
        emitToUser(vacancy.adventurer_id, 'mission:edited', {
          notificationId,
          missionId: mission.mid,
          vacancyId: vacancy.id,
          missionTitle: mission.title,
          senderId: uid,
          senderUsername: req.user.username,
          receiverId: vacancy.adventurer_id,
          type: NOTIFICATION_TYPE.MISSION.ID,
          message: message,
        });
      }

      // Then, if monetary reward has been changed, notification is sended
      if (changes.includes('reward')) {
        // First, if a pending monetary reward notification exists, it changes its value
        // eslint-disable-next-line prefer-const
        let notification = await findByActionStatusAndVacancy(
          NOTIFICATION_ACTION.MISSION_EDIT.ID,
          NOTIFICATION_STATUS.PENDING.ID,
          vacancy.id,
        );
        if (notification.length > 0) {
          notification[0].payload.new_offer = vacancy.reward;
          notification[0].message = `A new monetary reward offer at ${updatedMission.title} has been made: ${originalVacancies.find((vac) => vac.id === vacancy.id).monetary_reward}€ -> ${vacancy.reward}€. Accept or reject it!`;
          await updateNotification({
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
          if (VACANCY_LIFE_CYCLE[vacancy.status].CAN_INTERACT) {
            const message = `A new monetary reward offer at ${updatedMission.title} has been made: ${originalVacancies.find((vac) => vac.id === vacancy.id).monetary_reward}€ -> ${vacancy.reward}€. Accept or reject it!`;
            const notificationId = await createNotification({
              type: NOTIFICATION_TYPE.MISSION.ID,
              kind: NOTIFICATION_KIND.ACTIONABLE.ID,
              action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
              status: NOTIFICATION_STATUS.PENDING.ID,
              message: message,
              senderId: uid,
              receiverId: vacancy.adventurer_id,
              payload: {
                associated_mission_id: mission.mid,
                associated_vacancy_id: vacancy.id,
                new_offer: vacancy.reward,
              },
            });
            emitToUser(vacancy.adventurer_id, 'mission:edited', {
              notificationId,
              missionId: mission.mid,
              vacancyId: vacancy.id,
              missionTitle: mission.title,
              senderId: uid,
              senderUsername: req.user.username,
              receiverId: vacancy.adventurer_id,
              type: NOTIFICATION_TYPE.MISSION.ID,
              message: message,
            });
          }
        }
      }
    }

    return res.status(200).json({ mission: updatedMission });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

/*Verify that the owner of the mission is the one closing it and that at least one person is assigned to close the mission.*/
export const close = async (req, res) => {
  const { mid } = req.params;
  const userId = req.user.uid;

  try {
    const mission = await getById(mid);
    if (!mission) {
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });
    }

    if (mission.owner_id !== userId) {
      return res.status(403).json({ error: messages.UNAUTHORIZED_ERROR });
    }

    // Checks occupied vacancies
    const occupied_vacancies = await getOccupiedVacancies(mission.mid);
    if (occupied_vacancies === 0) {
      return res
        .status(400)
        .json({ error: messages.CLOSE_WITHOUT_ADVENTURERS });
    }
    // Different close for opened or reopened mission+
    if (mission.status === MISSION_LIFE_CYCLE.OPENED.ID) {
      // Checks if mission can be closed by states
      if (
        !MISSION_LIFE_CYCLE[mission.status].VALID_NEXT_STATES.includes(
          MISSION_LIFE_CYCLE.CLOSED.ID,
        )
      )
        return res.status(400).json({ error: messages.CANNOT_CLOSE_STATE });

      // Then, it updates the mission
      await updateMissionStatus(mid, MISSION_LIFE_CYCLE.CLOSED.ID);

      // Updates vacancies status, there is 2 for because if a vacancy fails when a notification has been sent, there is no rollback possible
      for (const vacancy of occupied_vacancies)
        if (vacancy.status !== VACANCY_LIFE_CYCLE.RELEASED.ID)
          updateStatus(vacancy.id, VACANCY_LIFE_CYCLE.PENDING_PAYMENT.ID);

      const message = `Mission ${mission.title} has been closed. Waiting for owner payment to start. You can't unjoin anymore, but owner is able to cancel it yet.`;
      // Finally, all occupied vacancies are notified
      for (const vacancy of occupied_vacancies) {
        if (VACANCY_LIFE_CYCLE[vacancy.status].CAN_INTERACT) {
          const notificationId = await createNotification({
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: NOTIFICATION_ACTION.MISSION_CLOSE.ID,
            status: null,
            message: message,
            senderId: userId,
            receiverId: vacancy.adventurer_id,
            payload: {
              associated_mission_id: mission.mid,
            },
          });
          emitToUser(vacancy.adventurer_id, 'mission:closed', {
            notificationId,
            missionId: mission.mid,
            vacancyId: vacancy.adventurer_id,
            missionTitle: mission.title,
            senderId: userId,
            senderUsername: req.user.username,
            receiverId: vacancy.adventurer_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message: message,
          });
        }
      }
      return res.status(200).json({
        status: MISSION_LIFE_CYCLE.CLOSED.ID,
        participants: occupied_vacancies,
      });
    } else if (mission.status === MISSION_LIFE_CYCLE.REOPENED.ID) {
      // Checks if mission can be started by states
      if (
        !MISSION_LIFE_CYCLE[mission.status].VALID_NEXT_STATES.includes(
          MISSION_LIFE_CYCLE.IN_PROGRESS.ID,
        )
      )
        return res
          .status(400)
          .json({ error: messages.CANNOT_REOPEN_MISSION_STATE });

      // Then, it updates the mission
      await updateMissionStatus(mid, MISSION_LIFE_CYCLE.IN_PROGRESS.ID);

      // And the vacancies are updated
      const joined_vacancies = await getJoinedVacancies(mission.mid);
      for (const vacancy of joined_vacancies)
        updateStatus(vacancy.id, VACANCY_LIFE_CYCLE.PENDING_PAYMENT.ID);

      // Finally, all occupied vacancies are notified
      const occupied_vacancies = await getOccupiedVacancies(mission.mid);
      const message =
        joined_vacancies.length === 0
          ? `Mission ${mission.title} has been closed after being reopened. No new adventurers have joined.`
          : `Mission ${mission.title} has been closed after being reopened. Waiting for owner payment to start new adventurers.`;
      for (const vacancy of occupied_vacancies) {
        if (VACANCY_LIFE_CYCLE[vacancy.status].CAN_INTERACT) {
          const notificationId = await createNotification({
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: NOTIFICATION_ACTION.MISSION_CLOSE.ID,
            status: null,
            message: message,
            senderId: userId,
            receiverId: vacancy.adventurer_id,
            payload: {
              associated_mission_id: mission.mid,
            },
          });
          emitToUser(vacancy.adventurer_id, 'mission:closed', {
            notificationId,
            missionId: mission.mid,
            vacancyId: vacancy.adventurer_id,
            missionTitle: mission.title,
            senderId: userId,
            senderUsername: req.user.username,
            receiverId: vacancy.adventurer_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message: message,
          });
        }
      }
      return res.status(200).json({
        status: MISSION_LIFE_CYCLE.IN_PROGRESS.ID,
        participants: occupied_vacancies,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Sends a join request to the mission owner instead of joining immediately
export const joinMission = async (req, res) => {
  const { mid } = req.params;
  const uid = req.user.uid;
  const message = req.body.message || '';
  const vacancyId = req.body.vacancyId;
  try {
    // Mission is searched
    const mission = await getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission was created by the current user
    if (mission.owner_id === uid)
      return res.status(403).json({ error: messages.JOIN_OWN_MISSION });

    // Checks if mission status is valid for accepting adventurers
    if (!MISSION_LIFE_CYCLE[mission.status].CAN_ACCEPT_ADVENTURERS)
      return res.status(409).json({
        error: messages.MISSION_NOT_ACCEPTING_ADVENTURERS,
      });

    // Checks if mission is already full
    if (mission.occupied_vacancies === mission.total_vacancies)
      return res.status(409).json({
        error: messages.MISSION_FILLED,
      });

    // Checks if user has already joined that mission
    const alreadyJoined = await getMissionParticipationById(mid, uid);
    if (alreadyJoined)
      return res.status(409).json({ error: messages.MISSION_ALREADY_JOINED });

    // Checks if vacancy exists
    const vacancy = await getVacancyById(mid, vacancyId);
    if (!vacancy)
      return res.status(404).json({ error: messages.VACANCY_NOT_FOUND });
    if (vacancy.adventurer_id !== null) {
      return res.status(409).json({ error: messages.MISSION_FILLED });
    }

    // Checks if user has already requested the joining for this mission
    const ownerId = mission.owner_id;
    const pendingRequest = await hasPendingJoinNotification(
      mid,
      uid,
      ownerId,
      vacancyId,
    );
    if (pendingRequest) {
      return res.status(409).json({
        error: messages.REQUEST_ALREADY_SENT,
      });
    }

    // Checks if user has configured their bank account
    if (req.user.stripe_connected_id === null) {
      return res
        .status(403)
        .json({ error: messages.ADVENTURER_BANK_ACCOUNT_NOT_CONFIGURED });
    }

    // Otherwise, creates the notification for the joining request (or invite)
    const action =
      mission.owner_id === uid
        ? NOTIFICATION_ACTION.MISSION_INVITE.ID
        : NOTIFICATION_ACTION.JOIN_REQUEST.ID;
    const notificationId = await createNotification({
      type: NOTIFICATION_TYPE.INVITATION.ID,
      kind: NOTIFICATION_KIND.ACTIONABLE.ID,
      action,
      status: NOTIFICATION_STATUS.PENDING.ID,
      message,
      senderId: uid,
      receiverId: ownerId,
      payload: { associated_mission_id: mid, associated_vacancy_id: vacancyId },
    });

    // And sends it to the user
    emitToUser(ownerId, 'notification:created', {
      notificationId,
      missionId: mid,
      vacancyId: vacancyId,
      missionTitle: mission.title,
      senderId: uid,
      senderUsername: req.user.username,
      receiverId: ownerId,
      type: NOTIFICATION_TYPE.INVITATION.ID,
      message,
    });

    return res.status(201).json({});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Receives missionId, senderId and receiverId, prepares the data, and creates a notification.
export const inviteToMission = async (req, res) => {
  const { missionId, receiverId, vacancyId, message } = req.body;
  const senderId = req.user.uid;

  if (senderId === receiverId) {
    return res.status(400).json({ error: messages.CANNOT_INVITE_YOURSELF });
  }

  try {
    const [mission, receiver, vacancy] = await Promise.all([
      getById(missionId),
      getUserById(receiverId),
      getVacancyById(missionId, vacancyId),
    ]);

    if (!mission) {
      return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
    }

    if (!receiver) {
      return res.status(404).json({ error: messages.RECEIVER_NOT_FOUND });
    }

    if (!vacancy) {
      return res.status(404).json({ error: messages.VACANCY_NOT_FOUND });
    }

    if (vacancy.adventurer_id !== null) {
      return res.status(409).json({ error: messages.VACANCY_ALREADY_OCCUPIED });
    }

    if (!MISSION_LIFE_CYCLE[mission.status].CAN_ACCEPT_ADVENTURERS) {
      return res.status(409).json({
        error: messages.MISSION_NOT_ACCEPTING_ADVENTURERS,
      });
    }

    const type = NOTIFICATION_TYPE.INVITATION.ID;
    const action =
      mission.owner_id === senderId
        ? NOTIFICATION_ACTION.MISSION_INVITE.ID
        : NOTIFICATION_ACTION.JOIN_REQUEST.ID;

    const hasPending = await hasPendingJoinNotification(
      missionId,
      senderId,
      receiverId,
      vacancyId,
    );

    if (hasPending) {
      return res.status(409).json({
        error: messages.PENDING_NOTIFICATION_EXISTS,
      });
    }

    const adventurerId = mission.owner_id === senderId ? receiverId : senderId;

    if (mission.total_vacancies <= mission.occupied_vacancies) {
      return res.status(409).json({ error: messages.NO_VACANCIES_AVAILABLE });
    }

    const alreadyJoined = await getMissionParticipationById(
      missionId,
      adventurerId,
    );
    if (alreadyJoined) {
      return res.status(409).json({ error: messages.MISSION_ALREADY_JOINED });
    }

    const notificationData = {
      type,
      kind: NOTIFICATION_KIND.ACTIONABLE.ID,
      status: NOTIFICATION_STATUS.PENDING.ID,
      action,
      message,
      senderId,
      receiverId,
      payload: {
        associated_mission_id: missionId,
        associated_vacancy_id: vacancyId,
      },
    };

    const newNotificationId = await createNotification(notificationData);

    emitToUser(receiverId, 'notification:created', {
      notificationId: newNotificationId,
      missionId,
      vacancyId,
      missionTitle: mission.title,
      senderId,
      senderUsername: req.user.username,
      receiverId,
      type,
      message,
    });

    return res.status(201).json(newNotificationId);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
};

export const submitMissionParticipation = async (req, res) => {
  const { mid } = req.params;
  const adventurerId = req.user.uid;

  try {
    const mission = await getById(mid);
    if (!mission) {
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });
    }

    const participation = await getMissionParticipationById(mid, adventurerId);
    if (!participation) {
      return res.status(403).json({
        error: messages.MISSION_PARTICIPATION_REQUIRED,
      });
    }

    if (participation.status !== MISSION_LIFE_CYCLE.IN_PROGRESS.ID) {
      return res.status(409).json({
        error: messages.MISSION_PART_ALREADY_SUBMITTED,
      });
    }

    if (participation.payment_status !== VACANCY_PAYMENT_STATUS.PAID.ID) {
      return res.status(409).json({
        error: messages.CANNOT_SUBMIT_UNPAID,
      });
    }

    const updatedParticipation = await submitMissionParticipationRecord(
      mid,
      adventurerId,
    );

    if (!updatedParticipation) {
      return res
        .status(409)
        .json({ error: messages.MISSION_PART_ALREADY_SUBMITTED });
    }

    const attempts =
      (await countParticipationReviewAttempts(mid, adventurerId)) + 1;
    const missionCompletionMessage = `The participation in "${mission.title}" was submitted by ${req.user.username}.`;
    const notificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.ACTIONABLE.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_REVIEW.ID,
      status: NOTIFICATION_STATUS.PENDING.ID,
      message: missionCompletionMessage,
      senderId: adventurerId,
      receiverId: mission.owner_id,
      payload: { associated_mission_id: Number(mid), attempt: attempts },
    });

    emitToUser(mission.owner_id, 'mission:participation-submitted', {
      notificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      missionId: Number(mid),
      missionTitle: mission.title,
      adventurerId,
      adventurerUsername: req.user.username,
      message: missionCompletionMessage,
    });

    return res.status(200).json({
      message: messages.MISSION_PART_SUBMITTED_SUCCESSFULLY,
      participation: updatedParticipation,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Unjoin mission by adventurer before mission has started
export const unjoinMission = async (req, res) => {
  const { mid } = req.params;
  const uid = req.user.uid;
  const vacancyId = req.body?.vacancyId;

  try {
    // Mission is searched
    const mission = await getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission is opened, so unjoin can be done
    if (!MISSION_LIFE_CYCLE[mission.status].ADVENTURERS_CAN_UNJOIN) {
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_UNJOIN_IN_PROGRESS_MISSION],
        },
      });
    }

    // Vacancy is searched
    const vacancy = await getVacancyById(mid, vacancyId);

    // Checks if adventurer can unjoin can be deleted by states
    if (
      !VACANCY_LIFE_CYCLE[vacancy.status].VALID_NEXT_STATES.includes(
        VACANCY_LIFE_CYCLE.EMPTY.ID,
      )
    )
      return res
        .status(400)
        .json({ error: messages.CANNOT_UNJOIN_VACANCY_STATE });

    // Checks if user has actually joined that mission
    const alreadyJoined = await getMissionParticipationById(mid, uid);
    if (alreadyJoined < 1)
      return res
        .status(409)
        .json({ error: messages.VACANCY_NOT_JOINED_BY_USER });

    // Unjoin is done
    await unjoinVacancy(mid, vacancyId);

    // Mission info is update
    await adventurerUnjoined(mid);

    // Gets adventurer fled information
    const adventurer = await getUserById(vacancy.adventurer_id);
    const message = `Adventurer ${adventurer.username} fled the vacancy ${vacancy.title} from your mission ${mission.title}.`;
    // Finally, a notification is sent to the owner
    const notificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.MISSION_UNJOIN.ID,
      status: null,
      message: message,
      senderId: uid,
      receiverId: mission.owner_id,
      payload: {
        associated_mission_id: mission.mid,
        associated_vacancy_id: vacancy.id,
      },
    });
    emitToUser(vacancy.adventurer_id, 'mission:unjoined', {
      notificationId,
      missionId: mission.mid,
      vacancyId: vacancy.adventurer_id,
      missionTitle: mission.title,
      senderId: uid,
      senderUsername: adventurer.username,
      receiverId: mission.owner_id,
      type: NOTIFICATION_TYPE.MISSION.ID,
      message: message,
    });

    return res.status(200).json({});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Cancels or deletes mission
export const cancelMission = async (req, res) => {
  const { mid } = req.params;
  const uid = req.user.uid;

  try {
    // Mission is searched
    const mission = await getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission was created by the current user
    if (mission.owner_id !== uid)
      return res.status(403).json({ error: messages.CANNOT_DELETE_MISSION });

    // Gets occupied vacancies
    const occupied_vacancies = await getOccupiedVacancies(mid);

    // If mission has to be "deleted", it will be
    if (MISSION_LIFE_CYCLE[mission.status].CAN_DELETE) {
      // Checks if mission can be deleted by states
      if (
        !MISSION_LIFE_CYCLE[mission.status].VALID_NEXT_STATES.includes(
          MISSION_LIFE_CYCLE.DELETED.ID,
        )
      )
        return res
          .status(400)
          .json({ error: messages.CANNOT_DELETE_MISSION_STATE });

      // Then mission status is updated
      await updateMissionStatus(mid, MISSION_LIFE_CYCLE.DELETED.ID);
    }
    // If mission has to be cancelled, it will be
    else if (MISSION_LIFE_CYCLE[mission.status].CAN_CANCEL) {
      // Checks if mission can be cancelled by states
      if (
        !MISSION_LIFE_CYCLE[mission.status].VALID_NEXT_STATES.includes(
          MISSION_LIFE_CYCLE.CANCELLING.ID,
        )
      )
        return res
          .status(400)
          .json({ error: messages.CANNOT_CANCEL_MISSION_STATE });

      // Then mission status is updated
      await updateMissionStatus(mid, MISSION_LIFE_CYCLE.CANCELLING.ID);

      // And the reward is sent to the adventurers TODO: try-catch individual o transacción?
      for (const vacancy of occupied_vacancies) {
        if (vacancy.status !== VACANCY_LIFE_CYCLE.RELEASED.ID) {
          const adventurer = await getUserById(vacancy.adventurer_id);
          if (adventurer.stripe_connected_id) {
            const transferData = {
              amount: Math.round(vacancy.monetary_reward * 100),
              currency: 'eur',
              destination: adventurer.stripe_connected_id,
              description: `mission_cancelled`,
              transfer_group: `mission_${mid}`,
            };

            const idempotencyKey = `cancel_${mid}_vac_${vacancy.id}`;
            const transfer = await createTransfer(transferData, idempotencyKey);

            // Adds mission payment
            await createMissionPayment({
              mid: mission.mid,
              vacancy_id: vacancy.id,
              sender_id: HERMYX_TRANSACTION_ID,
              receiver_id: adventurer.uid,
              stripe_transaction_id: transfer.id,
              transaction_type: TRANSACTION_TYPE.CANCELLATION_COMPENSATION.ID,
              amount_paid: vacancy.monetary_reward,
            });

            await markVacancyAsPaidOut(vacancy.id);
          }
        }
      }
      await updateMissionStatus(mid, MISSION_LIFE_CYCLE.CANCELLED.ID);
    }
    // Otherwise, mission can't be deleted or cancelled
    else
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_DELETE_MISSION_STATE],
        },
      });

    // Either way, all adventurers are informed
    for (const vacancy of occupied_vacancies) {
      if (VACANCY_LIFE_CYCLE[vacancy.status].CAN_INTERACT) {
        const message = MISSION_LIFE_CYCLE[mission.status].CAN_DELETE
          ? `Mission ${mission.title} has been deleted, so it won't be done, we are sorry.`
          : `Mission ${mission.title} has been cancelled, but don't worry, your reward is on your way!.`;
        const notificationId = await createNotification({
          type: NOTIFICATION_TYPE.MISSION.ID,
          kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
          action: MISSION_LIFE_CYCLE[mission.status].CAN_DELETE
            ? NOTIFICATION_ACTION.MISSION_DELETE.ID
            : NOTIFICATION_ACTION.MISSION_CANCEL.ID,
          status: null,
          message: message,
          senderId: uid,
          receiverId: vacancy.adventurer_id,
          payload: {
            associated_mission_id: mission.mid,
          },
        });
        const eventName = MISSION_LIFE_CYCLE[mission.status].CAN_DELETE
          ? 'mission:delete'
          : 'mission:cancel';
        emitToUser(vacancy.adventurer_id, eventName, {
          notificationId,
          missionId: mission.mid,
          vacancyId: vacancy.id,
          missionTitle: mission.title,
          senderId: uid,
          senderUsername: req.user.username,
          receiverId: vacancy.adventurer_id,
          type: NOTIFICATION_TYPE.MISSION.ID,
          message: message,
        });
      }
    }
    return res.status(200).json({});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Reopens mission
export const reopenMission = async (req, res) => {
  const { mid } = req.params;
  const uid = req.user.uid;

  try {
    // Mission is searched
    const mission = await getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission was created by the current user
    if (mission.owner_id !== uid)
      return res.status(403).json({ error: messages.CANNOT_REOPEN_MISSION });

    // Checks if mission can be reopened by state
    if (
      !MISSION_LIFE_CYCLE[mission.status].VALID_NEXT_STATES.includes(
        MISSION_LIFE_CYCLE.REOPENED.ID,
      )
    )
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_REOPEN_MISSION_STATE],
        },
      });

    // Checks if there is at least one empty vacancy, so mission can be reopened
    const vacancies = await getEmptyVacancies(mid);

    if (vacancies < 1)
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_REOPEN_MISSION_WITHOUT_EMPTY_VACANCIES],
        },
      });

    // Finally, mission is reopened
    await updateMissionStatus(mid, MISSION_LIFE_CYCLE.REOPENED.ID);

    // And all adventurers are informed
    const occupied_vacancies = await getOccupiedVacancies(mid);
    for (const vacancy of occupied_vacancies) {
      if (VACANCY_LIFE_CYCLE[vacancy.status].CAN_INTERACT) {
        const message = `Mission ${mission.title} has been reopened, so new teammates will enter!`;
        const notificationId = await createNotification({
          type: NOTIFICATION_TYPE.MISSION.ID,
          kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
          action: NOTIFICATION_ACTION.MISSION_REOPEN.ID,
          status: null,
          message: message,
          senderId: uid,
          receiverId: vacancy.adventurer_id,
          payload: {
            associated_mission_id: mission.mid,
          },
        });
        emitToUser(vacancy.adventurer_id, 'mission:reopened', {
          notificationId,
          missionId: mission.mid,
          vacancyId: vacancy.id,
          missionTitle: mission.title,
          senderId: uid,
          senderUsername: req.user.username,
          receiverId: vacancy.adventurer_id,
          type: NOTIFICATION_TYPE.MISSION.ID,
          message: message,
        });
      }
    }

    return res.status(200).json({});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Finishes mission
export const finishMission = async (req, res) => {
  const { mid } = req.params;
  const uid = req.user.uid;

  try {
    // Mission is searched
    const mission = await getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission was created by the current user
    if (mission.owner_id !== uid)
      return res.status(403).json({ error: messages.CANNOT_FINISH });

    // Checks if mission can be reopened by state
    if (
      !MISSION_LIFE_CYCLE[mission.status].VALID_NEXT_STATES.includes(
        MISSION_LIFE_CYCLE.FINISHED.ID,
      )
    )
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_FINISH_MISSION_STATE],
        },
      });

    // Checks if every vacancy is in empty or finished state
    const participants = await getParticipantsForDisplay(mid);
    const canFinish = participants.every(
      (participant) =>
        participant.status === VACANCY_LIFE_CYCLE.EMPTY.ID ||
        participant.status === VACANCY_LIFE_CYCLE.RELEASED.ID,
    );

    if (!canFinish)
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_FINISH_ADVENTURERS_IN_PROGRESS],
        },
      });

    // Finally, mission is reopened
    await updateMissionStatus(mid, MISSION_LIFE_CYCLE.FINISHED.ID);

    return res.status(200).json({});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Bans mission
export const banMission = async (req, res) => {
  const { mid } = req.params;
  const { rid, reason } = req.body;

  try {
    // Gets report
    const report = await getReportById(rid);
    if (!report)
      return res
        .status(404)
        .json({ errors: { general: [messages.REPORT_NOT_FOUND] } });

    // Checks if report has not been answered yet
    if (report.status === REPORT_STATUS.ANSWERED.ID)
      return res.status(409).json({ errors: messages.REPORT_ALREADY_ANSWERED });

    // Mission is searched
    const mission = await getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Participation is got
    const participation = await getOccupiedVacancies(mid);

    // Mission state changes logic, if payment has been done it has to be release to adventurers
    if (MISSION_LIFE_CYCLE[mission.status].CAN_DELETE) {
      // Mission participation is cleaned
      const updatedVacancies = await cleanMissionParticipation(mid);
      if (participation.length !== updatedVacancies)
        return res
          .status(409)
          .json({ error: messages.CANNOT_DELETE_VACANCIES });

      // Occupied vacancies are updated
      const emptiedMission = await emptyMission(mid);
      if (emptiedMission < 1)
        return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });
    } else {
      for (const vacancy of participation) {
        const adventurer = await getUserById(vacancy.adventurer_id);
        if (adventurer.stripe_connected_id) {
          const transferData = {
            amount: Math.round(vacancy.monetary_reward * 100),
            currency: 'eur',
            destination: adventurer.stripe_connected_id,
            description: `mission_banned`,
            transfer_group: `mission_${mid}`,
          };

          const idempotencyKey = `ban_${mid}_vac_${vacancy.id}`;
          const transfer = await createTransfer(transferData, idempotencyKey);

          // Adds mission payment
          await createMissionPayment({
            mid: mission.mid,
            vacancy_id: vacancy.id,
            sender_id: HERMYX_TRANSACTION_ID,
            receiver_id: adventurer.uid,
            stripe_transaction_id: transfer.id,
            transaction_type: TRANSACTION_TYPE.BAN_COMPENSATION.ID,
            amount_paid: vacancy.monetary_reward,
          });

          await markVacancyAsPaidOut(vacancy.id);
        }
      }
    }

    // Finally, mission is reopened
    await updateMissionStatus(mid, MISSION_LIFE_CYCLE.REPORTED.ID);

    // Report is closed
    const reportClosed = await closeReport(
      rid,
      REPORT_DECISION.BAN_MISSION.ID,
      reason,
      req.user.uid,
    );
    if (!reportClosed)
      return res.status(404).json({ error: messages.REPORT_NOT_FOUND });

    // Then, applicant and possible adventurers are notified
    const message = MISSION_LIFE_CYCLE[mission.status].CAN_DELETE
      ? `This mission has been banned by Hermyx administration, now is retired from the public and won't be done.`
      : `This mission has been banned by Hermyx administration, now is retired from the public and it has been cancelled, so payment will be made to the adventurers.`;

    // Applicant is informed
    const notificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.MISSION_BAN.ID,
      status: null,
      message: message,
      senderId: HERMYX_TRANSACTION_ID,
      receiverId: mission.owner_id,
      payload: {
        associated_mission_id: mission.mid,
      },
    });
    emitToUser(mission.owner_id, 'mission:ban', {
      notificationId,
      missionId: mission.mid,
      vacancyId: null,
      missionTitle: mission.title,
      senderId: HERMYX_TRANSACTION_ID,
      senderUsername: req.user.username,
      receiverId: mission.owner_id,
      type: NOTIFICATION_TYPE.MISSION.ID,
      message: message,
    });

    // All adventurers are informed
    for (const vacancy of participation) {
      if (VACANCY_LIFE_CYCLE[vacancy.status].CAN_INTERACT) {
        const notificationId = await createNotification({
          type: NOTIFICATION_TYPE.MISSION.ID,
          kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
          action: NOTIFICATION_ACTION.MISSION_BAN.ID,
          status: null,
          message: message,
          senderId: HERMYX_TRANSACTION_ID,
          receiverId: vacancy.adventurer_id,
          payload: {
            associated_mission_id: mission.mid,
          },
        });
        emitToUser(vacancy.adventurer_id, 'mission:ban', {
          notificationId,
          missionId: mission.mid,
          vacancyId: vacancy.id,
          missionTitle: mission.title,
          senderId: HERMYX_TRANSACTION_ID,
          senderUsername: req.user.username,
          receiverId: vacancy.adventurer_id,
          type: NOTIFICATION_TYPE.MISSION.ID,
          message: message,
        });
      }
    }

    return res.status(200).json({});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Bans mission
export const kickAdventurerOut = async (req, res) => {
  const { mid, vacancyId } = req.params;
  const { rid, reason } = req.body;

  try {
    // Mission is searched
    const mission = await getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Adventurer participation is got
    const vacancy = await getVacancyById(mid, vacancyId);
    if (!vacancy)
      return res.status(404).json({ error: messages.VACANCY_NOT_FOUND });
    if (vacancy.mid !== mid)
      return res.status(409).json({ error: messages.VACANCY_NOT_IN_MISSION });

    // Adventurer is got
    const adventurer = await getUserById(vacancy.adventurer_id);
    if (!adventurer)
      return res.status(404).json({ error: messages.USER_NOT_FOUND });

    // Unjoin user
    const unjoin = await unjoinParticipant(mission.mid, vacancy.adventurer_id);
    if (unjoin < 1)
      return res.status(404).json({ error: messages.MISSION_NOT_FOUND });

    // Updates mission
    const unjoinMission = await adventurerUnjoined(mission.mid);
    if (unjoinMission < 1)
      return res.status(404).json({ error: messages.MISSION_NOT_FOUND });

    // If payment has been made, is refunded
    if (MISSION_LIFE_CYCLE[mission.status].CAN_CANCEL) {
      // Refunds payment to the applicant
      await updatePaymentStatus(
        vacancyId,
        VACANCY_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
      );

      // First, payments for this mission are get
      const payments = await getMissionPaymentsByVacancy(vacancyId);

      // Amount to refund is calculated
      let amountToRefund = vacancy.monetary_reward;

      // That amount is refunded from every payment that is associated with the vacancy, if needed
      for (const payment of payments) {
        if (amountToRefund <= 0) break;

        // Amount to refund from this payment is calculated
        const availableBalance = payment.amount_paid - payment.amount_refunded;
        const paymentRefund = Math.min(amountToRefund, availableBalance);

        // Refund is made on Stripe
        const refund = await createRefund(
          {
            payment_intent: payment.stripe_transaction_id,
            amount: Math.round(paymentRefund * 100),
            metadata: {
              mission_id: mid,
              vacancy_id: vacancyId,
              reason: 'adventurer_kicked_out_refund',
            },
          },
          `adventurer_kicked_out_refund_${mid}_${vacancyId}_${Date.now()}`,
        );

        // Payment is updated on db
        await refundFromPayment(paymentRefund, payment.pid);

        // And new transaction is added to db
        await createMissionPayment({
          mid: mid,
          vacancy_id: vacancyId,
          sender_id: HERMYX_TRANSACTION_ID,
          receiver_id: mission.owner_id,
          stripe_transaction_id: refund.id,
          transaction_type:
            TRANSACTION_TYPE.ADVENTURER_KICKED_OUT_COMPENSATION.ID,
          amount_paid: paymentRefund,
        });

        amountToRefund -= paymentRefund;
      }
      // When refund is complete, is marked as that
      await refundBannedVacancy(vacancyId, vacancy.monetary_reward);

      // Updates total payment on mission
      const occupied_vacancies = await getOccupiedVacancies(mid);
      await updateMissionPayment(
        mission.mid,
        occupied_vacancies.reduce(
          (sum, vacancy) => sum + Number(vacancy.monetary_reward),
          0,
        ) * HERMYX_FEE || 0,
      );
    } else {
      // If not, mission is closed, so it checks if it was the only adventurer
      const occupied_vacancies = await getOccupiedVacancies(mid);
      if (occupied_vacancies.length === 0) await openMission(mid);
    }

    // Report is closed
    const reportClosed = await closeReport(
      rid,
      REPORT_DECISION.KICK_ADVENTURER_OUT.ID,
      reason,
      req.user.uid,
    );
    if (!reportClosed)
      return res.status(404).json({ error: messages.REPORT_NOT_FOUND });

    // Notifies owner of the mission
    let messageOwner = `Adventurer ${adventurer.username} of your mission ${mission.title} has been kicked out by Hermyx administration, so this vacancy has been emptied.`;
    if (MISSION_LIFE_CYCLE[mission.status].CAN_CANCEL)
      messageOwner += ` Their reward is being refunded to you.`;
    const notificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.ADVENTURER_KICKED_OUT.ID,
      status: null,
      message: messageOwner,
      senderId: HERMYX_TRANSACTION_ID,
      receiverId: mission.owner_id,
      payload: {
        associated_mission_id: mission.mid,
        associated_vacancy_id: vacancyId,
      },
    });
    emitToUser(mission.owner_id, 'mission:adventurer-kicked-out', {
      notificationId,
      missionId: mission.mid,
      vacancyId: null,
      missionTitle: mission.title,
      senderId: HERMYX_TRANSACTION_ID,
      senderUsername: req.user.username,
      receiverId: mission.owner_id,
      type: NOTIFICATION_TYPE.MISSION.ID,
      message: messageOwner,
    });

    // And notifies adventurer
    const messageAdventurer = `You have been kicked out of the mission ${mission.title}, so you won't be able to receive the reward.`;
    if (MISSION_LIFE_CYCLE[mission.status].CAN_CANCEL)
      messageOwner += `Their reward is being refunded to you.`;
    const notificationAdventurerId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.ADVENTURER_KICKED_OUT.ID,
      status: null,
      message: messageAdventurer,
      senderId: HERMYX_TRANSACTION_ID,
      receiverId: vacancy.adventurer_id,
      payload: {
        associated_mission_id: mission.mid,
        associated_vacancy_id: vacancyId,
      },
    });
    emitToUser(mission.owner_id, 'mission:adventurer-kicked-out', {
      notificationAdventurerId,
      missionId: mission.mid,
      vacancyId: null,
      missionTitle: mission.title,
      senderId: HERMYX_TRANSACTION_ID,
      senderUsername: req.user.username,
      receiverId: vacancy.adventurer_id,
      type: NOTIFICATION_TYPE.MISSION.ID,
      message: messageAdventurer,
    });
    return res.status(200).json({});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};
