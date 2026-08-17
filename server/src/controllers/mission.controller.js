//External modules
import {
  messages,
  MISSION_STATUS,
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_TYPE,
  HERMYX_FEE,
  HERMYX_SYSTEM_ID,
  TRANSACTION_TYPE,
  MISSION_PARTICIPATION_PAYMENT_STATUS,
  REPORT_DECISION,
} from '@hermyx/shared';
import {
  getAllMissionsInDraft as _getAllMissionsInDraft,
  findByMid,
  updateOccupiedVacancies,
  updateMissionPayment,
  openMission,
} from '../models/mission.model.js';
import { findByUid as getUserById } from '../models/user.model.js';
import {
  findById,
  findAllOccupiedByMid,
  unjoinParticipant,
  updatePaymentStatus,
  refundBannedVacancy,
} from '../models/mission-participation.model.js';
import { createNotification as create } from '../services/notification.service.js';
import { emitToUser } from '../providers/socket.provider.js';
import { createRefund } from '../providers/payment.provider.js';
import {
  findByVacancyId as getMissionPaymentsByVacancy,
  refund as refundFromPayment,
} from '../models/mission-payment.model.js';
import { closeReportAndConversationByMid } from '../services/report.service.js';
import * as missionService from '../services/mission.service.js';

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

// Receives missionId, senderId and receiverId, prepares the data, and creates a notification.
export const inviteToMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { receiverId, vacancyId, message } = req.body;
    const nid = await missionService.inviteToMission(
      mid,
      vacancyId,
      req.user.uid,
      receiverId,
      message,
      req.user,
    );
    return res.status(200).json(nid);
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

// Unjoin mission by adventurer before mission has started
export const unjoinMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { vacancyId } = req.body;
    await missionService.unjoinMission(mid, vacancyId, req.user);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Submit participation
export const submitMissionParticipation = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const updatedParticipation =
      await missionService.submitMissionParticipation(mid, req.user);
    return res.status(200).json({
      message: messages.MISSION_PART_SUBMITTED_SUCCESSFULLY,
      participation: updatedParticipation,
    });
  } catch (error) {
    next(error);
  }
};

// Cancels or deletes mission
export const cancelMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    await missionService.cancelMission(mid, req.user);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Reopens mission
export const reopenMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    await missionService.reopenMission(mid, req.user);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Finishes mission
export const finishMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    await missionService.finishMission(mid, req.user);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Bans mission
export const banMission = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { rid, reason } = req.body;
    await missionService.banMission(req.user, mid, rid, reason);
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

// Kick adventurer out
export const kickAdventurerOut = async (req, res) => {
  const { mid, vacancyId } = req.params;
  const { rid, reason } = req.body;
  let reportClosed;
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
    const unjoinMission = await updateOccupiedVacancies(mission.mid);
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
        await create({
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
      const occupied_vacancies = await findAllOccupiedByMid(mid);
      await updateMissionPayment(
        mission.mid,
        occupied_vacancies.reduce(
          (sum, vacancy) => sum + Number(vacancy.monetary_reward),
          0,
        ) * HERMYX_FEE || 0,
      );
    } else {
      // If not, mission is closed, so it checks if it was the only adventurer
      const occupied_vacancies = await findAllOccupiedByMid(mid);
      if (occupied_vacancies.length === 0) await openMission(mid);
    }

    // Report is closed
    reportClosed = await closeReportAndConversationByMid(
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

    // And conversation closure
    reportService.emitConversationClosed(
      reportClosed.participantIds,
      reportClosed.report,
    );

    return res.status(200).json({});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};
