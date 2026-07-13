//External modules
import { messages } from '@hermyx/shared';
import {
  createMission as _createMission,
  getAllMissionsInDraft as _getAllMissionsInDraft,
  getMissionById as _getMissionById,
  getMissions as _getMissions,
  getById,
  getParticipantsForDisplay,
  getParticipantsForRelease,
  updateMissionStatus,
  getByUidAndTitle,
  getMissionsOpened as _getMissionsOpened,
  updateMission,
  getMissionParticipation,
  adventurerUnjoined,
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
} from '../models/mission_participation.model.js';
import {
  createNotification,
  countParticipationReviewAttempts,
  hasPendingJoinNotification,
  findByActionStatusAndVacancy,
  updateNotification,
} from '../models/notification.model.js';
import { emitToUser } from '../services/socket.service.js';
import {
  createPaymentIntentNew,
  createRefund,
} from '../services/payment.service.js';
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

export const getMissionById = async (req, res) => {
  try {
    // Gets the id
    const { id } = req.params;
    const uid = req.user.uid;

    // Searches mission by id
    const [mission, participants] = await Promise.all([
      _getMissionById(id, uid),
      getParticipantsForDisplay(id),
    ]);

    // Returns success or error
    if (!mission) {
      return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
    }

    return res.status(200).json({
      mission: {
        ...mission,
        participants,
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
  const { title } = req.query;
  const pagination = req.pagination;
  const excludeOwnerId = title ? req.user?.uid : undefined;

  try {
    // Gets all missions filtering what is needed
    const { rows: missions, totalCount } = await _getMissionsOpened({
      title,
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
      isDraft,
    } = req.body;

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

    // Updates new payment
    mission.totalPayment =
      mission.vacanciesData.reduce(
        (sum, vacancy) => sum + Number(vacancy.reward),
        0,
      ) || 0;

    // Gets current mission info
    const currentMission = await _getMissionById(mission.mid);

    // Checks that mission is in a editable status
    if (!MISSION_LIFE_CYCLE[currentMission.status].CAN_EDIT)
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
      (v) => typeof v.id === 'string',
    );
    const existingVacancies = mission.vacanciesData.filter(
      (v) => typeof v.id === 'number',
    );

    // Id array including existing vacancies that stayed
    const existingIds = existingVacancies.map((v) => v.id);

    // New mission info can delete existing vacancies only in opened state
    if (!MISSION_LIFE_CYCLE[currentMission.status].CAN_DELETE_ADVENTURERS) {
      if (existingIds.length < originalVacancies) {
        return res.status(400).json({
          errors: {
            general: [messages.CANNOT_DELETE_EXISTING_VACANCIES],
          },
        });
      }
    }

    // Updates mission
    const updatedMission = await updateMission(mission);

    // First operation, deleting vacancies that are not occupied
    await deleteUnoccupiedVacancies(mission.mid, existingIds);

    const vacanciesToNotify = [];
    // After that, updating existing vacancies
    const updatePromises = existingVacancies.map((vacancy) => {
      const currentOriginalVacancy = originalVacancies.find(
        (vac) => vac.id === vacancy.id,
      );

      // Checks for each vacancy if any field has been changed
      if (
        Number(currentOriginalVacancy.monetary_reward) !==
          Number(vacancy.reward) ||
        currentOriginalVacancy.description !== vacancy.description ||
        currentOriginalVacancy.title !== vacancy.title
      ) {
        // So its saves that vacancy because its owner will have to be notified
        const vacancyToSave = {
          adventurer_id: currentOriginalVacancy.adventurer_id,
          ...vacancy,
        };
        vacanciesToNotify.push(vacancyToSave);
      }

      // Then, makes allowed changes in vacancy (anything but monetary reward)
      return updateVacancy(mission.mid, vacancy);
    });
    await Promise.all(updatePromises);

    // Lastly, inserting new vacancies
    await insertVacancies(mission.mid, newVacancies);
    /*TODO: transacciones bancarias (y realmente mejorar las cosas de arriba porque los bucles tienen que 
    estar fuera, pero bueno, eso es de transacciones de bd)
    // Now, checks monetary reward differences, for a possible payment
    if (currentMission.total_payment < mission.totalPayment) {
      const extraAmount = mission.totalPayment - currentMission.total_payment;

      const pi = await createPaymentIntentNew(
        {
          amount: Math.round(extraAmount * 100),
          currency: 'eur',
          customer: req.user.stripe_customer_id,
          automatic_payment_methods: { enabled: true },
          metadata: {
            missionId: mission.mid,
            ownerId: req.user.uid,
            action: 'edit_extra_charge',
          },
        },
        `edit_extra_${mission.mid}_${Date.now()}`,
      );

      return res.status(200).json({
        mission: updatedMission,
        requiresExtraPayment: true,
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
      });
    } else if (currentMission.total_payment > mission.totalPayment) {
      const amountToRefund = Math.round(
        Math.abs(currentMission.total_payment - mission.totalPayment) * 100,
      );

      const refund = await createRefund(
        {
          payment_intent: currentMission.stripe_pi_id,
          amount: amountToRefund,
          reason: 'requested_by_customer',
        },
        `refund_edit_${mission.mid}_${Date.now()}`,
      );
      console.log(refund);
      return res.status(200).json({
        mission: updatedMission,
        refunded_amount: refund.amount * 100,
      });
    }
*/
    // First, if mission info is changed, every old vacancy is notified
    const changes = [];
    Object.keys(updatedMission).forEach((key) => {
      // Detects changes in mission info, except for publication date and total payment
      if (
        currentMission[key] !== updatedMission[key] &&
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
        !(changes.length === 1 && changes.includes('reward')) // If the only change is the reward, no additional notification is needed
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
          console.log(notification[0], vacancy.reward);
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

    return res.status(200).json({ mission: updatedMission });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

/*Verify that the owner of the mission is the one starting it and that at least one person is assigned to start the mission.*/
export const start = async (req, res) => {
  const { missionId } = req.params;
  const userId = req.user.uid;

  try {
    const mission = await getById(missionId);
    if (!mission) {
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });
    }

    if (mission.owner_id !== userId) {
      return res.status(403).json({ error: messages.UNAUTHORIZED_ERROR });
    }

    const currentParticipants = (await getParticipantsForRelease(missionId))
      .length;

    if (currentParticipants === 0) {
      return res
        .status(400)
        .json({ error: messages.START_WITHOUT_ADVENTURERS });
    }

    // Checks if mission can be started by states
    if (
      !MISSION_LIFE_CYCLE[mission.status].VALID_NEXT_STATES.includes(
        MISSION_LIFE_CYCLE.PENDING_PAYMENT.ID,
      )
    )
      return res.status(400).json({ error: messages.CANNOT_START_STATE });

    // Then, it updates the mission
    await updateMissionStatus(missionId, MISSION_LIFE_CYCLE.PENDING_PAYMENT.ID);

    const occupied_vacancies = await getOccupiedVacancies(mission.mid);
    const missionData = {
      mid: mission.mid,
      title: mission.title,
      description: mission.description,
      vacancies: mission.total_vacancies,
      longitude: mission.longitude,
      latitude: mission.latitude,
      totalPayment:
        occupied_vacancies.reduce(
          (sum, vacancy) => sum + Number(vacancy.monetary_reward),
          0,
        ) || 0,
    };
    // Updates total payment
    await updateMission(missionData);

    return res.status(200).json({
      status: MISSION_LIFE_CYCLE.PENDING_PAYMENT.ID,
      participants: currentParticipants,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Sends a join request to the mission owner instead of joining immediately
export const joinMission = async (req, res) => {
  const { mid } = req.params;
  const uid = req.user.uid;
  const message = req.body?.message?.trim() || '';
  const vacancyId = req.body?.vacancyId;

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
        error: 'You already sent a join request for this mission.',
      });
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

    return res.status(201).json({
      message: 'Join request sent successfully',
    });
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
    console.log(notificationData);
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

    if (!MISSION_LIFE_CYCLE[mission.status].ADVENTURERS_CAN_SUBMIT) {
      return res.status(400).json({
        error: messages.MISSION_NOT_IN_PROGRESS,
      });
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

// Sends a join request to the mission owner instead of joining immediately
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

    /* TODO: enviar notificación al creador de la misión para informarle que ha perdido un participante
    Const invitationId = await createInvitationRecord({
      missionId: mid,
      vacancyId: vacancyId,
      senderId: uid,
      receiverId: ownerId,
      type: 'adventurer_to_applicant',
      message,
    });

    emitToUser(ownerId, 'invitation:created', {
      invitationId,
      missionId: mid,
      vacancyId: vacancyId,
      missionTitle: mission.title,
      senderId: uid,
      senderUsername: req.user.username,
      receiverId: ownerId,
      type: 'adventurer_to_applicant',
      message,
    });*/

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
      await updateMissionStatus(mid, MISSION_LIFE_CYCLE.CANCELLING.ID); // TODO: primero a cancelling pero eso depende de lo de stripe
      // TODO: pagar a todos los aventureros
    }
    // Otherwise, mission can't be deleted or cancelled
    else
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_DELETE_MISSION_STATE],
        },
      });

    /* TODO: enviar notificación a todos los aventureros de que la misión ha sido cancelada
    Const invitationId = await createInvitationRecord({
      missionId: mid,
      vacancyId: vacancyId,
      senderId: uid,
      receiverId: ownerId,
      type: 'adventurer_to_applicant',
      message,
    });

    emitToUser(ownerId, 'invitation:created', {
      invitationId,
      missionId: mid,
      vacancyId: vacancyId,
      missionTitle: mission.title,
      senderId: uid,
      senderUsername: req.user.username,
      receiverId: ownerId,
      type: 'adventurer_to_applicant',
      message,
    });*/

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
      return res.status(403).json({ error: messages.CANNOT_DELETE_MISSION });

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

    /* TODO: enviar notificación a todos los aventureros de que la misión ha sido reabierta
    Const invitationId = await createInvitationRecord({
      missionId: mid,
      vacancyId: vacancyId,
      senderId: uid,
      receiverId: ownerId,
      type: 'adventurer_to_applicant',
      message,
    });

    emitToUser(ownerId, 'invitation:created', {
      invitationId,
      missionId: mid,
      vacancyId: vacancyId,
      missionTitle: mission.title,
      senderId: uid,
      senderUsername: req.user.username,
      receiverId: ownerId,
      type: 'adventurer_to_applicant',
      message,
    });*/

    return res.status(200).json({});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};
