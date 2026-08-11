//External modules
import {
  messages,
  MISSION_STATUS,
  MISSION_PARTICIPATION_STATUS,
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  HERMYX_FEE,
  HERMYX_SYSTEM_ID,
  TRANSACTION_TYPE,
  MISSION_PARTICIPATION_PAYMENT_STATUS,
  REPORT_DECISION,
  REPORT_STATUS,
} from '@hermyx/shared';
import {
  getAllMissionsInDraft as _getAllMissionsInDraft,
  findByMid,
  updateStatus,
  finishMissionAndCloseConversation,
  adventurerUnjoined,
  emptyMission,
  updateMissionPayment,
  openMission,
} from '../models/mission.model.js';
import { findByUid as getUserById } from '../models/user.model.js';
import { getConversationParticipants } from '../models/conversation-participant.model.js';
import {
  findByMidAndAdventurerId as getMissionParticipationById,
  submitParticipation as submitMissionParticipationRecord,
  findById,
  unjoinVacancy,
  findAllOccupied,
  getEmptyVacancies,
  markVacancyAsPaidOut,
  cleanMissionParticipation,
  unjoinParticipant,
  updatePaymentStatus,
  refundBannedVacancy,
} from '../models/mission-participation.model.js';
import {
  create,
  countParticipationReviewAttempts,
  hasPendingJoinNotification,
} from '../models/notification.model.js';
import { emitToUser } from '../providers/socket.provider.js';
import { createRefund, createTransfer } from '../providers/payment.provider.js';
import {
  createMissionPayment,
  getMissionPaymentsByVacancy,
  refundFromPayment,
} from '../models/mission-payment.model.js';
import { closeReport, getReportById } from '../models/report.model.js';
import * as missionService from '../services/mission.service.js';
import * as missionParticipationModel from '../models/mission-participation.model.js';

/// Controller functions
// Get all missions
export const getMissions = async (req, res, next) => {
  try {
    const { title } = req.query;
    const pagination = req.pagination;
    const { missions, paginationData } = await missionService.getMissions(
      title,
      pagination,
    );
    return res.status(200).json({ missions, pagination: paginationData });
  } catch (error) {
    next(error);
  }
};

// Get all opened missions
export const getMissionsOpened = async (req, res, next) => {
  try {
    const { title, minPayment, maxPayment, maxDistanceKm } = req.query;
    const pagination = req.pagination;
    const excludeOwnerId = title ? req.user?.uid : undefined;
    const user = req.user;
    const { missions, paginationData } = await missionService.getOpenedMissions(
      title,
      minPayment,
      maxPayment,
      maxDistanceKm,
      pagination,
      excludeOwnerId,
      user,
    );
    return res.status(200).json({ missions, pagination: paginationData });
  } catch (error) {
    next(error);
  }
};

// Get mission by mid
export const getMissionByMid = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const uid = req.user.uid;
    const mission = await missionService.getMissionByMid(mid, uid);
    return res.status(200).json(mission);
  } catch (error) {
    next(error);
  }
};

// Publishes mission
export const publishMission = async (req, res, next) => {
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
    console.log(req.body);
    const photos = req.files.photos || [];
    const mission = await missionService.publishMission(
      uid,
      title,
      description,
      vacancies,
      vacanciesData || [],
      latitude,
      longitude,
      photos,
    );
    return res.status(201).json({ mission });
  } catch (error) {
    next(error);
  }
};

// Closes a mission
export const closeMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { status, participants } = await missionService.closeMission(
      mid,
      req.user,
    );
    return res.status(200).json({ status, participants });
  } catch (error) {
    next(error);
  }
};

// Sends a join request to the mission owner instead of joining immediately
export const joinMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { message, vacancyId } = req.body;
    await missionService.joinMission(mid, req.user, message, vacancyId);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Edits a mission
export const editMission = async (req, res, next) => {
  try {
    const user = req.user;
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
    const newMission = await missionService.editMission(
      user,
      mission,
      newPhotos,
      existingPhotos,
    );
    return res.status(200).json({ mission: newMission });
  } catch (error) {
    next(error);
  }
};

// -------

export const getAllMissionsInDraft = async (req, res) => {
  try {
    const missions = await _getAllMissionsInDraft();
    res.status(200).json({ data: missions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
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
      findByMid(missionId),
      getUserById(receiverId),
      findById(vacancyId),
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

    if (!MISSION_STATUS[mission.status].CAN_ACCEPT_ADVENTURERS) {
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

    const newNotificationId = await create(notificationData);

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
    const mission = await findByMid(mid);
    if (!mission) {
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });
    }

    const participation = await getMissionParticipationById(mid, adventurerId);
    if (!participation) {
      return res.status(403).json({
        error: messages.MISSION_PARTICIPATION_REQUIRED,
      });
    }

    if (participation.status !== MISSION_STATUS.IN_PROGRESS.ID) {
      return res.status(409).json({
        error: messages.MISSION_PART_ALREADY_SUBMITTED,
      });
    }

    if (
      participation.payment_status !==
      MISSION_PARTICIPATION_PAYMENT_STATUS.PAID.ID
    ) {
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
    const notificationId = await create({
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
    const mission = await findByMid(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission is opened, so unjoin can be done
    if (!MISSION_STATUS[mission.status].ADVENTURERS_CAN_UNJOIN) {
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_UNJOIN_IN_PROGRESS_MISSION],
        },
      });
    }

    // Vacancy is searched
    const vacancy = await findById(vacancyId);

    // Checks if adventurer can unjoin can be deleted by states
    if (
      !MISSION_PARTICIPATION_STATUS[vacancy.status].VALID_NEXT_STATES.includes(
        MISSION_PARTICIPATION_STATUS.EMPTY.ID,
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
    await unjoinVacancy(mid, vacancyId, uid);

    // Gets adventurer fled information
    const adventurer = await getUserById(vacancy.adventurer_id);
    const message = `Adventurer ${adventurer.username} fled the vacancy ${vacancy.title} from your mission ${mission.title}.`;
    // Finally, a notification is sent to the owner
    const notificationId = await create({
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
    const mission = await findByMid(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission was created by the current user
    if (mission.owner_id !== uid)
      return res.status(403).json({ error: messages.CANNOT_DELETE_MISSION });

    // Gets occupied vacancies
    const occupied_vacancies = await findAllOccupied(mid);

    // If mission has to be "deleted", it will be
    if (MISSION_STATUS[mission.status].CAN_DELETE) {
      // Checks if mission can be deleted by states
      if (
        !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
          MISSION_STATUS.DELETED.ID,
        )
      )
        return res
          .status(400)
          .json({ error: messages.CANNOT_DELETE_MISSION_STATE });

      // Then mission status is updated
      await updateStatus(mid, MISSION_STATUS.DELETED.ID);
    }
    // If mission has to be cancelled, it will be
    else if (MISSION_STATUS[mission.status].CAN_CANCEL) {
      // Checks if mission can be cancelled by states
      if (
        !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
          MISSION_STATUS.CANCELLING.ID,
        )
      )
        return res
          .status(400)
          .json({ error: messages.CANNOT_CANCEL_MISSION_STATE });

      // Then mission status is updated
      await updateStatus(mid, MISSION_STATUS.CANCELLING.ID);

      // And the reward is sent to the adventurers TODO: try-catch individual o transacción?
      for (const vacancy of occupied_vacancies) {
        if (vacancy.status !== MISSION_PARTICIPATION_STATUS.RELEASED.ID) {
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
              sender_id: HERMYX_SYSTEM_ID,
              receiver_id: adventurer.uid,
              stripe_transaction_id: transfer.id,
              transaction_type: TRANSACTION_TYPE.CANCELLATION_COMPENSATION.ID,
              amount_paid: vacancy.monetary_reward,
            });

            await markVacancyAsPaidOut(vacancy.id);
          }
        }
      }
      await updateStatus(mid, MISSION_STATUS.CANCELLED.ID);
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
      if (MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT) {
        const message = MISSION_STATUS[mission.status].CAN_DELETE
          ? `Mission ${mission.title} has been deleted, so it won't be done, we are sorry.`
          : `Mission ${mission.title} has been cancelled, but don't worry, your reward is on your way!.`;
        const notificationId = await create({
          type: NOTIFICATION_TYPE.MISSION.ID,
          kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
          action: MISSION_STATUS[mission.status].CAN_DELETE
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
        const eventName = MISSION_STATUS[mission.status].CAN_DELETE
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
    const mission = await findByMid(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission was created by the current user
    if (mission.owner_id !== uid)
      return res.status(403).json({ error: messages.CANNOT_REOPEN_MISSION });

    // Checks if mission can be reopened by state
    if (
      !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
        MISSION_STATUS.REOPENED.ID,
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
    await updateStatus(mid, MISSION_STATUS.REOPENED.ID);

    // And all adventurers are informed
    const occupied_vacancies = await findAllOccupied(mid);
    for (const vacancy of occupied_vacancies) {
      if (MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT) {
        const message = `Mission ${mission.title} has been reopened, so new teammates will enter!`;
        const notificationId = await create({
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
    const mission = await findByMid(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission was created by the current user
    if (mission.owner_id !== uid)
      return res.status(403).json({ error: messages.CANNOT_FINISH });

    // Checks if mission can be reopened by state
    if (
      !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
        MISSION_STATUS.FINISHED.ID,
      )
    )
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_FINISH_MISSION_STATE],
        },
      });

    // Checks if every vacancy is in empty or finished state
    const participants = await missionParticipationModel.findAllByMid(mid);
    const canFinish = participants.every(
      (participant) =>
        participant.status === MISSION_PARTICIPATION_STATUS.EMPTY.ID ||
        participant.status === MISSION_PARTICIPATION_STATUS.RELEASED.ID,
    );

    if (!canFinish)
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_FINISH_ADVENTURERS_IN_PROGRESS],
        },
      });

    // Finally, mission and its conversation are closed
    const { conversation } = await finishMissionAndCloseConversation(mid);

    if (conversation) {
      const conversationParticipants = await getConversationParticipants(
        conversation.cid,
      );

      for (const participant of conversationParticipants) {
        emitToUser(participant.uid, 'conversation:closed', {
          conversationId: conversation.cid,
          missionId: Number(mid),
          closedAt: conversation.closed_at,
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
    const mission = await findByMid(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Participation is got
    const participation = await findAllOccupied(mid);

    // Mission state changes logic, if payment has been done it has to be release to adventurers
    if (MISSION_STATUS[mission.status].CAN_DELETE) {
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
            sender_id: HERMYX_SYSTEM_ID,
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
    await updateStatus(mid, MISSION_STATUS.REPORTED.ID);

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
    const message = MISSION_STATUS[mission.status].CAN_DELETE
      ? `This mission has been banned by Hermyx administration, now is retired from the public and won't be done.`
      : `This mission has been banned by Hermyx administration, now is retired from the public and it has been cancelled, so payment will be made to the adventurers.`;

    // Applicant is informed
    const notificationId = await create({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.MISSION_BAN.ID,
      status: null,
      message: message,
      senderId: HERMYX_SYSTEM_ID,
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
      senderId: HERMYX_SYSTEM_ID,
      senderUsername: req.user.username,
      receiverId: mission.owner_id,
      type: NOTIFICATION_TYPE.MISSION.ID,
      message: message,
    });

    // All adventurers are informed
    for (const vacancy of participation) {
      if (MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT) {
        const notificationId = await create({
          type: NOTIFICATION_TYPE.MISSION.ID,
          kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
          action: NOTIFICATION_ACTION.MISSION_BAN.ID,
          status: null,
          message: message,
          senderId: HERMYX_SYSTEM_ID,
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
          senderId: HERMYX_SYSTEM_ID,
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

// Kick adventurer out
export const kickAdventurerOut = async (req, res) => {
  const { mid, vacancyId } = req.params;
  const { rid, reason } = req.body;

  try {
    // Mission is searched
    const mission = await findByMid(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Adventurer participation is got
    const vacancy = await findById(vacancyId);
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
    if (MISSION_STATUS[mission.status].CAN_CANCEL) {
      // Refunds payment to the applicant
      await updatePaymentStatus(
        vacancyId,
        MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
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
          sender_id: HERMYX_SYSTEM_ID,
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
      const occupied_vacancies = await findAllOccupied(mid);
      await updateMissionPayment(
        mission.mid,
        occupied_vacancies.reduce(
          (sum, vacancy) => sum + Number(vacancy.monetary_reward),
          0,
        ) * HERMYX_FEE || 0,
      );
    } else {
      // If not, mission is closed, so it checks if it was the only adventurer
      const occupied_vacancies = await findAllOccupied(mid);
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
    if (MISSION_STATUS[mission.status].CAN_CANCEL)
      messageOwner += ` Their reward is being refunded to you.`;
    const notificationId = await create({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.ADVENTURER_KICKED_OUT.ID,
      status: null,
      message: messageOwner,
      senderId: HERMYX_SYSTEM_ID,
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
      senderId: HERMYX_SYSTEM_ID,
      senderUsername: req.user.username,
      receiverId: mission.owner_id,
      type: NOTIFICATION_TYPE.MISSION.ID,
      message: messageOwner,
    });

    // And notifies adventurer
    const messageAdventurer = `You have been kicked out of the mission ${mission.title}, so you won't be able to receive the reward.`;
    if (MISSION_STATUS[mission.status].CAN_CANCEL)
      messageOwner += `Their reward is being refunded to you.`;
    const notificationAdventurerId = await create({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.ADVENTURER_KICKED_OUT.ID,
      status: null,
      message: messageAdventurer,
      senderId: HERMYX_SYSTEM_ID,
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
      senderId: HERMYX_SYSTEM_ID,
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
