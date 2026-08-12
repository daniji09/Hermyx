import {
  messages,
  MISSION_STATUS,
  MISSION_PARTICIPATION_STATUS,
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  REPORT_TYPE,
  HERMYX_FEE,
  HERMYX_SYSTEM_ID,
  TRANSACTION_TYPE,
  MISSION_PARTICIPATION_PAYMENT_STATUS,
} from '@hermyx/shared';
import {
  create,
  findByActionStatusAndVacancy,
  findByActionStatusSenderAndMission,
  findById,
  findExpiredParticipationReview,
  getByRecipientId,
  markAllAsSeenByRecipientId,
  markAsSeen,
  updateNotificationStatus,
} from '../models/notification.model.js';
import { findByUid as getUserById } from '../models/user.model.js';
import {
  findByMid,
  syncMissionCompletionStatus,
  updateMissionPayment,
} from '../models/mission.model.js';
import {
  approveParticipation,
  findByMidAndAdventurerId as getMissionParticipationById,
  findAllOccupied,
  findById as _findById,
  joinVacancy,
  markVacancyAsPaidOut,
  refundVacancy,
  releaseParticipation,
  reopenParticipation,
  requestParticipationRevision,
  updatePaymentStatus,
  updateStatus,
  updateVacancyMonetaryReward,
} from '../models/mission-participation.model.js';
import { emitToUser } from '../providers/socket.provider.js';
import { createRefund, createTransfer } from '../providers/payment.provider.js';
import {
  createMissionPayment,
  getMissionPaymentsByVacancy,
  refundFromPayment,
} from '../models/mission-payment.model.js';
import { createDisputeTicket } from '../services/dispute.service.js';

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await getByRecipientId(req.user.uid);
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
};

export const markMyNotificationAsSeen = async (req, res) => {
  const { notificationId } = req.params;

  try {
    const notification = await findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipient_id !== req.user.uid) {
      return res.status(403).json({
        error: 'You do not have permission to update this notification.',
      });
    }

    const updatedNotification = await markAsSeen(notificationId);
    return res.status(200).json({ notification: updatedNotification });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
};

export const markMyNotificationsAsSeen = async (req, res) => {
  try {
    const notifications = await markAllAsSeenByRecipientId(req.user.uid);
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
};

const respondToParticipationReview = async ({
  notification,
  response,
  message: disputeReason,
  userId,
  username,
  notificationId,
  res,
}) => {
  const missionId = notification.payload.associated_mission_id;
  const mission = await findByMid(missionId);

  if (!mission) {
    return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
  }

  if (mission.owner_id !== userId) {
    return res.status(403).json({ error: messages.UNAUTHORIZED_ERROR });
  }

  if (mission.status !== MISSION_STATUS.IN_PROGRESS.ID) {
    return res.status(409).json({ error: messages.MISSION_NOT_IN_PROGRESS });
  }

  const participation = await getMissionParticipationById(
    missionId,
    notification.sender_id,
  );

  if (!participation) {
    return res
      .status(404)
      .json({ error: messages.MISSION_PARTICIPATION_NOT_FOUND });
  }

  if (participation.status !== MISSION_PARTICIPATION_STATUS.SUBMITTED.ID) {
    return res
      .status(409)
      .json({ error: messages.MISSION_PARTICIPATION_ALREADY_REVIEWED });
  }

  if (response === 'disputed') {
    const attempt = Number(notification.payload?.attempt || 1);
    if (attempt <= 1) {
      return res.status(409).json({
        error: messages.MISSION_PARTICIPATION_DISPUTE_REQUIRES_RETRY,
      });
    }

    // Checks if vacancy can be in dispute by states
    if (
      !MISSION_PARTICIPATION_STATUS[
        participation.status
      ].VALID_NEXT_STATES.includes(MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID)
    )
      return res
        .status(400)
        .json({ error: messages.CANNOT_DISPUTE_PARTICIPATION_STATE });

    const disputeMessage = `A dispute was opened for "${mission.title}" by ${username}.`;
    const dispute = await createDisputeTicket({
      senderId: userId,
      counterpartId: notification.sender_id,
      adventurerId: notification.sender_id,
      missionId,
      vacancyId: participation.id,
      notificationId,
      reportType: REPORT_TYPE.REVIEW_DISPUTE.ID,
      reason: disputeReason,
      systemMessage: disputeMessage,
    });

    emitToUser(notification.sender_id, 'mission:participation-disputed', {
      notificationId: dispute.followUpNotificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_DISPUTED.ID,
      missionId,
      missionTitle: mission.title,
      ownerId: userId,
      ownerUsername: username,
      message: disputeMessage,
      reportId: dispute.report.rid,
    });

    for (const recipientId of [notification.sender_id, dispute.adminId]) {
      emitToUser(recipientId, 'conversation:message-received', {
        conversationId: dispute.conversation.cid,
        conversationType: 'dispute',
        messageId: dispute.initialMessage.mid,
        reportId: dispute.report.rid,
        senderId: userId,
      });
    }

    return res.status(200).json({
      message: messages.MISSION_PARTICIPATION_DISPUTED_SUCCESSFULLY,
    });
  }

  if (response === 'rejected') {
    // Checks if vacancy can be rejected by states
    if (
      !MISSION_PARTICIPATION_STATUS[
        participation.status
      ].VALID_NEXT_STATES.includes(MISSION_PARTICIPATION_STATUS.REJECTED.ID)
    )
      return res
        .status(400)
        .json({ error: messages.CANNOT_REJECT_PARTICIPATION_STATE });

    await requestParticipationRevision(missionId, notification.sender_id);
    await syncMissionCompletionStatus(missionId);
    await updateNotificationStatus(
      notificationId,
      NOTIFICATION_STATUS.REJECTED.ID,
    );
    await markAsSeen(notificationId);

    const revisionMessage = `Your participation in "${mission.title}" was rejected by ${username}. Please accept the revision or open a dispute.`;
    const followUpNotificationId = await create({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.ACTIONABLE.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_REJECTION_RESPONSE.ID,
      status: NOTIFICATION_STATUS.PENDING.ID,
      message: revisionMessage,
      senderId: userId,
      receiverId: notification.sender_id,
      payload: { associated_mission_id: missionId },
    });

    emitToUser(notification.sender_id, 'mission:participation-revision', {
      notificationId: followUpNotificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_REJECTION_RESPONSE.ID,
      missionId,
      missionTitle: mission.title,
      ownerId: userId,
      ownerUsername: username,
      message: revisionMessage,
    });

    return res.status(200).json({
      message: messages.MISSION_PARTICIPATION_REVISION_REQUESTED_SUCCESSFULLY,
    });
  }
  // Checks if vacancy can be accepted by states
  if (
    !MISSION_PARTICIPATION_STATUS[
      participation.status
    ].VALID_NEXT_STATES.includes(MISSION_PARTICIPATION_STATUS.ACCEPTED.ID)
  )
    return res
      .status(400)
      .json({ error: messages.CANNOT_ACCEPT_PARTICIPATION_STATE });

  await approveParticipation(missionId, notification.sender_id);

  // Reward is payed
  const adventurer = await getUserById(notification.sender_id);
  if (adventurer.stripe_connected_id) {
    const transferData = {
      amount: Math.round(participation.monetary_reward * 100),
      currency: 'eur',
      destination: adventurer.stripe_connected_id,
      description: `mission_payed`,
      transfer_group: `mission_${missionId}`,
    };

    const idempotencyKey = `pay_${missionId}_vac_${participation.id}`;
    const transfer = await createTransfer(transferData, idempotencyKey);

    // Adds mission payment
    await createMissionPayment({
      mid: missionId,
      vacancy_id: participation.id,
      sender_id: HERMYX_SYSTEM_ID,
      receiver_id: adventurer.uid,
      stripe_transaction_id: transfer.id,
      transaction_type: TRANSACTION_TYPE.PAYOUT.ID,
      amount_paid: participation.monetary_reward,
    });

    await markVacancyAsPaidOut(participation.id);
    await releaseParticipation(missionId, notification.sender_id);
  }

  await syncMissionCompletionStatus(missionId);
  await updateNotificationStatus(
    notificationId,
    NOTIFICATION_STATUS.ACCEPTED.ID,
  );
  await markAsSeen(notificationId);

  const approvedMessage = `Your participation in "${mission.title}" was approved by ${username}.`;
  const followUpNotificationId = await create({
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
    status: null,
    message: approvedMessage,
    senderId: userId,
    receiverId: notification.sender_id,
    payload: { associated_mission_id: missionId },
  });

  emitToUser(notification.sender_id, 'mission:participation-approved', {
    notificationId: followUpNotificationId,
    type: NOTIFICATION_TYPE.MISSION.ID,
    action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
    missionId,
    missionTitle: mission.title,
    ownerId: userId,
    ownerUsername: username,
    message: approvedMessage,
  });

  return res.status(200).json({
    message: messages.MISSION_PARTICIPATION_APPROVED_SUCCESSFULLY,
  });
};

const respondToParticipationRejection = async ({
  notification,
  response,
  message: disputeReason,
  userId,
  username,
  notificationId,
  res,
}) => {
  const missionId = notification.payload.associated_mission_id;
  const mission = await findByMid(missionId);

  if (!mission) {
    return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
  }

  const participation = await getMissionParticipationById(missionId, userId);

  if (!participation) {
    return res
      .status(404)
      .json({ error: messages.MISSION_PARTICIPATION_NOT_FOUND });
  }

  if (participation.status !== MISSION_PARTICIPATION_STATUS.REJECTED.ID) {
    return res
      .status(409)
      .json({ error: messages.MISSION_PARTICIPATION_ALREADY_REVIEWED });
  }

  if (response === 'disputed') {
    // Checks if vacancy can be in dispute by states
    if (
      !MISSION_PARTICIPATION_STATUS[
        participation.status
      ].VALID_NEXT_STATES.includes(MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID)
    )
      return res
        .status(400)
        .json({ error: messages.CANNOT_DISPUTE_PARTICIPATION_STATE });
    const disputeMessage = `${username} opened a dispute for "${mission.title}".`;
    const dispute = await createDisputeTicket({
      senderId: userId,
      counterpartId: mission.owner_id,
      adventurerId: userId,
      missionId,
      vacancyId: participation.id,
      notificationId,
      reportType: REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID,
      reason: disputeReason,
      systemMessage: disputeMessage,
    });

    emitToUser(mission.owner_id, 'mission:participation-disputed', {
      notificationId: dispute.followUpNotificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_DISPUTED.ID,
      missionId,
      missionTitle: mission.title,
      adventurerId: userId,
      adventurerUsername: username,
      missionStatus: dispute.missionAfterSync?.status,
      message: disputeMessage,
      reportId: dispute.report.rid,
    });

    for (const recipientId of [mission.owner_id, dispute.adminId]) {
      emitToUser(recipientId, 'conversation:message-received', {
        conversationId: dispute.conversation.cid,
        conversationType: 'dispute',
        messageId: dispute.initialMessage.mid,
        reportId: dispute.report.rid,
        senderId: userId,
      });
    }

    return res.status(200).json({
      message: messages.MISSION_PARTICIPATION_DISPUTED_SUCCESSFULLY,
    });
  }

  if (response !== 'accepted' && response !== 'accept') {
    return res.status(400).json({ error: messages.INVALID_RESPONSE_ACTION });
  }

  // Checks if vacancy can be in progress by states
  if (
    !MISSION_PARTICIPATION_STATUS[
      participation.status
    ].VALID_NEXT_STATES.includes(MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID)
  )
    return res
      .status(400)
      .json({ error: messages.CANNOT_REOPEN_PARTICIPATION_STATE });

  await reopenParticipation(missionId, userId);
  await syncMissionCompletionStatus(missionId);
  await updateNotificationStatus(
    notificationId,
    NOTIFICATION_STATUS.ACCEPTED.ID,
  );
  await markAsSeen(notificationId);

  return res.status(200).json({
    message: messages.MISSION_PARTICIPATION_REVISION_ACCEPTED_SUCCESSFULLY,
  });
};

const respondToMissionJoinNotification = async ({
  notification,
  response,
  notificationId,
  res,
}) => {
  const missionId = notification.payload.associated_mission_id;
  const mission = await findByMid(missionId);

  if (!mission) {
    return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
  }

  if (response === 'rejected') {
    await updateNotificationStatus(
      notificationId,
      NOTIFICATION_STATUS.REJECTED.ID,
    );
    await markAsSeen(notificationId);

    const rejectionMessage =
      notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
        ? `Your invitation to join "${mission.title}" was rejected.`
        : `Your request to join "${mission.title}" was rejected.`;
    const followUpNotificationId = await create({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: notification.action,
      status: null,
      message: rejectionMessage,
      senderId: notification.recipient_id,
      receiverId: notification.sender_id,
      payload: { associated_mission_id: missionId },
    });

    emitToUser(notification.sender_id, 'notification:created', {
      notificationId: followUpNotificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: notification.action,
      missionId,
      missionTitle: mission.title,
      senderId: notification.recipient_id,
      receiverId: notification.sender_id,
      message: rejectionMessage,
    });

    return res.status(200).json({ message: 'Notification rejected' });
  }

  if (response !== 'accepted' && response !== 'accept') {
    return res.status(400).json({ error: messages.INVALID_RESPONSE_ACTION });
  }

  const vacancyId = notification.payload.associated_vacancy_id;

  if (!vacancyId) {
    return res.status(409).json({
      error: messages.NOTIFICATION_NOT_ASSOCIATED_WITH_VACANCY,
    });
  }

  const vacancy = await _findById(vacancyId);

  // Checks if vacancy can be joined by states
  if (
    !MISSION_PARTICIPATION_STATUS[vacancy.status].VALID_NEXT_STATES.includes(
      MISSION_PARTICIPATION_STATUS.JOINED.ID,
    )
  )
    return res
      .status(400)
      .json({ error: messages.CANNOT_JOIN_PARTICIPATION_STATE });

  const adventurerId =
    mission.owner_id === notification.sender_id
      ? notification.recipient_id
      : notification.sender_id;

  const alreadyJoined = await getMissionParticipationById(
    missionId,
    adventurerId,
  );

  if (alreadyJoined) {
    return res.status(409).json({ error: messages.MISSION_ALREADY_JOINED });
  }

  const adventurer = await getUserById(adventurerId);

  if (adventurer.stripe_connected_id === null) {
    return res
      .status(403)
      .json({ error: messages.ADVENTURER_BANK_ACCOUNT_NOT_CONFIGURED });
  }

  // Joins vacancy
  const join_vacancy = await joinVacancy(
    missionId,
    notification.payload.associated_vacancy_id,
    adventurerId,
  );
  if (join_vacancy < 1)
    return res.status(409).json({ error: messages.VACANCY_NOT_JOINED });

  // Updates notification
  await updateNotificationStatus(
    notificationId,
    NOTIFICATION_STATUS.ACCEPTED.ID,
  );
  await markAsSeen(notificationId);

  // Rejects automatically every notification for this vacancy or from this adventurer
  const vacancyNotifications = await findByActionStatusAndVacancy(
    NOTIFICATION_ACTION.JOIN_REQUEST.ID,
    NOTIFICATION_STATUS.PENDING.ID,
    notification.payload.associated_vacancy_id,
  );
  const adventurerNotifications = await findByActionStatusSenderAndMission(
    NOTIFICATION_ACTION.JOIN_REQUEST.ID,
    NOTIFICATION_STATUS.PENDING.ID,
    missionId,
    notification.sender_id,
  );

  for (const notificationToReject of [
    ...vacancyNotifications,
    ...adventurerNotifications,
  ]) {
    // Rejects notification
    await updateNotificationStatus(
      notificationToReject.nid,
      NOTIFICATION_STATUS.REJECTED.ID,
    );
    await markAsSeen(notificationToReject.nid);

    // Sends confirmation notification to adventurers rejected
    const rejectionMessage =
      notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
        ? `Your invitation to join "${mission.title}" was rejected.`
        : `Your request to join "${mission.title}" was rejected.`;
    const followUpNotificationId = await create({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: notification.action,
      status: null,
      message: rejectionMessage,
      senderId: notificationToReject.recipient_id,
      receiverId: notificationToReject.sender_id,
      payload: { associated_mission_id: missionId },
    });

    emitToUser(notification.sender_id, 'notification:created', {
      notificationId: followUpNotificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: notification.action,
      missionId,
      missionTitle: mission.title,
      senderId: notificationToReject.recipient_id,
      receiverId: notificationToReject.sender_id,
      message: rejectionMessage,
    });
  }

  // Sends confirmation notification to adventurers accepted
  const acceptanceMessage =
    notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
      ? `Your invitation to join "${mission.title}" was accepted.`
      : `Your request to join "${mission.title}" was accepted. You are now part of the team.`;
  const followUpNotificationId = await create({
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: notification.action,
    status: null,
    message: acceptanceMessage,
    senderId: notification.recipient_id,
    receiverId: notification.sender_id,
    payload: { associated_mission_id: missionId },
  });

  emitToUser(notification.sender_id, 'notification:created', {
    notificationId: followUpNotificationId,
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: notification.action,
    missionId,
    missionTitle: mission.title,
    senderId: notification.recipient_id,
    receiverId: notification.sender_id,
    message: acceptanceMessage,
  });

  return res.status(200).json({ message: 'Adventurer successfully added' });
};

const respondToVacancyMonetaryRewardEdition = async ({
  notification,
  response,
  userId,
  username,
  notificationId,
  res,
}) => {
  const missionId = notification.payload.associated_mission_id;
  const mission = await findByMid(missionId);
  if (!mission) {
    return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
  }

  const participation = await getMissionParticipationById(missionId, userId);
  if (!participation) {
    return res
      .status(404)
      .json({ error: messages.MISSION_PARTICIPATION_NOT_FOUND });
  }

  // Checks that mission is in a editable status
  if (!MISSION_STATUS[mission.status].CAN_EDIT)
    return res.status(400).json({
      errors: { general: [messages.CANNOT_EDIT_MISSION] },
    });

  if (response === 'rejected') {
    await updateNotificationStatus(
      notificationId,
      NOTIFICATION_STATUS.REJECTED.ID,
    );
    await markAsSeen(notificationId);

    const rejectionMessage = `${username} rejected your new monetary reward offer for "${mission.title}": ${participation.monetary_reward}€ -> ${notification.payload.new_offer}€.`;
    const followUpNotificationId = await create({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
      status: NOTIFICATION_STATUS.REJECTED.ID,
      message: rejectionMessage,
      senderId: userId,
      receiverId: mission.owner_id,
      payload: {
        associated_mission_id: missionId,
        associated_vacancy_id: notification.payload.associated_vacancy_id,
      },
    });

    emitToUser(mission.owner_id, 'mission:participation-negotiation-rejected', {
      notificationId: followUpNotificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
      missionId,
      missionTitle: mission.title,
      adventurerId: userId,
      adventurerUsername: username,
      message: rejectionMessage,
    });

    return res.status(200).json({
      message: messages.MISSION_PARTICIPATION_DISPUTED_SUCCESSFULLY,
    });
  }

  if (response !== 'accepted' && response !== 'accept') {
    return res.status(400).json({ error: messages.INVALID_RESPONSE_ACTION });
  }

  // Updates vacancy and notifications info
  await updateVacancyMonetaryReward(
    notification.payload.associated_vacancy_id,
    notification.payload.new_offer,
  );
  await updateNotificationStatus(
    notificationId,
    NOTIFICATION_STATUS.ACCEPTED.ID,
  );
  await markAsSeen(notificationId);

  // Monetary change affects mission, if new offer is lower, a refund is made
  if (participation.monetary_reward > notification.payload.new_offer) {
    // Partially refunded
    await updatePaymentStatus(
      notification.payload.associated_vacancy_id,
      MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
    );

    // First, payments for this mission are get
    const payments = await getMissionPaymentsByVacancy(
      notification.payload.associated_vacancy_id,
    );

    // Amount to refund is calculated
    let amountToRefund =
      (participation.monetary_reward - notification.payload.new_offer) *
      HERMYX_FEE;

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
            mission_id: missionId,
            vacancy_id: notification.payload.associated_vacancy_id,
            reason: 'negotiation_refund',
          },
        },
        `negotiation_refund_${missionId}_${notification.payload.associated_vacancy_id}_${Date.now()}`,
      );

      // Payment is updated on db
      await refundFromPayment(paymentRefund, payment.pid);

      // And new transaction is added to db
      await createMissionPayment({
        mid: missionId,
        vacancy_id: notification.payload.associated_vacancy_id,
        sender_id: HERMYX_SYSTEM_ID,
        receiver_id: mission.owner_id,
        stripe_transaction_id: refund.id,
        transaction_type: TRANSACTION_TYPE.NEGOTIATION_REFUND.ID,
        amount_paid: paymentRefund,
      });

      amountToRefund -= paymentRefund;
    }
    // When refund is complete, is marked as that
    await refundVacancy(
      notification.payload.associated_vacancy_id,
      participation.monetary_reward - notification.payload.new_offer,
    );

    // Updates total payment on mission
    const occupied_vacancies = await findAllOccupied(mission.mid);
    await updateMissionPayment(
      mission.mid,
      occupied_vacancies.reduce(
        (sum, vacancy) => sum + Number(vacancy.monetary_reward),
        0,
      ) * HERMYX_FEE || 0,
    );
  } else {
    // If new offer is higher, mission and vacancy states change if vacancy was already paid
    if (
      participation.payment_status ===
      MISSION_PARTICIPATION_PAYMENT_STATUS.PAID.ID
    ) {
      await updateStatus(
        notification.payload.associated_vacancy_id,
        MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
      );
      await updatePaymentStatus(
        notification.payload.associated_vacancy_id,
        MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_PAID.ID,
      );
    }
  }

  const acceptMessage = `${username} accepted your new monetary reward offer for "${mission.title}": ${participation.monetary_reward}€ -> ${notification.payload.new_offer}€.`;
  const followUpNotificationId = await create({
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
    status: NOTIFICATION_STATUS.ACCEPTED.ID,
    message: acceptMessage,
    senderId: userId,
    receiverId: mission.owner_id,
    payload: {
      associated_mission_id: missionId,
      associated_vacancy_id: notification.payload.associated_vacancy_id,
    },
  });

  emitToUser(mission.owner_id, 'mission:participation-negotiation-accepted', {
    notificationId: followUpNotificationId,
    type: NOTIFICATION_TYPE.MISSION.ID,
    action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
    missionId,
    missionTitle: mission.title,
    adventurerId: userId,
    adventurerUsername: username,
    message: acceptMessage,
  });

  return res.status(200).json({
    message: messages.MISSION_PARTICIPATION_REVISION_ACCEPTED_SUCCESSFULLY,
  });
};

/*Receives a notification id and response. Business behavior is selected by action.*/
export const respondToNotification = async (req, res, next) => {
  const { notificationId } = req.params;
  const { response, message } = req.body;

  const userId = req.user.uid;

  try {
    const notification = await findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: messages.NOTIFICATION_NOT_FOUND });
    }

    if (notification.recipient_id !== userId) {
      return res.status(403).json({
        error: messages.UNAUTHORIZED_ERROR,
      });
    }

    if (notification.status !== NOTIFICATION_STATUS.PENDING.ID) {
      return res.status(400).json({
        error: messages.NOTIFICATION_NOT_PENDING(notification.status),
      });
    }

    if (notification.action === NOTIFICATION_ACTION.PARTICIPATION_REVIEW.ID) {
      return await respondToParticipationReview({
        notification,
        response,
        message,
        userId,
        username: req.user.username,
        notificationId,
        res,
      });
    }

    if (
      notification.action ===
      NOTIFICATION_ACTION.PARTICIPATION_REJECTION_RESPONSE.ID
    ) {
      return await respondToParticipationRejection({
        notification,
        response,
        message,
        userId,
        username: req.user.username,
        notificationId,
        res,
      });
    }

    if (
      notification.action === NOTIFICATION_ACTION.JOIN_REQUEST.ID ||
      notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
    ) {
      return await respondToMissionJoinNotification({
        notification,
        response,
        notificationId,
        res,
      });
    }

    if (notification.action === NOTIFICATION_ACTION.MISSION_EDIT.ID) {
      return await respondToVacancyMonetaryRewardEdition({
        notification,
        response,
        userId,
        username: req.user.username,
        notificationId,
        res,
      });
    }

    return res
      .status(400)
      .json({ error: messages.INVALID_NOTIFICATION_ACTION });
  } catch (error) {
    next(error);
  }
};

// Automatize called functions, jobs
export const autoAcceptParticipation = async (req, res) => {
  try {
    // Gets expired participation reviews
    const expiredReviews = await findExpiredParticipationReview();

    // Checks if there is any
    if (expiredReviews.length === 0)
      return res.status(200).json('No notifications expired.');

    // Notifications that can't be accepted
    const errors = [];
    const successes = [];

    // If there are, it tries to auto-accept them
    for (const expiredReview of expiredReviews) {
      console.log(expiredReview);
      // Gets mission
      const mission = await findByMid(
        expiredReview.payload.associated_mission_id,
      );
      if (!mission)
        errors.push(
          `${messages.MISSION_NOT_FOUND}. Notification: ${expiredReview.nid}.`,
        );
      else {
        // Gets participation
        const participation = await getMissionParticipationById(
          expiredReview.payload.associated_mission_id,
          expiredReview.sender_id,
        );
        // Checks if vacancy can be accepted by states
        if (
          !MISSION_PARTICIPATION_STATUS[
            participation.status
          ].VALID_NEXT_STATES.includes(MISSION_PARTICIPATION_STATUS.ACCEPTED.ID)
        )
          errors.push(
            `${messages.CANNOT_ACCEPT_PARTICIPATION_STATE}. Notification: ${expiredReview.nid}.`,
          );
        else {
          await approveParticipation(
            expiredReview.payload.associated_mission_id,
            expiredReview.sender_id,
          );

          // Reward is payed
          const adventurer = await getUserById(expiredReview.sender_id);
          if (adventurer.stripe_connected_id) {
            const transferData = {
              amount: Math.round(participation.monetary_reward * 100),
              currency: 'eur',
              destination: adventurer.stripe_connected_id,
              description: `mission_payed`,
              transfer_group: `mission_${expiredReview.payload.associated_mission_id}`,
            };

            const idempotencyKey = `pay_${expiredReview.payload.associated_mission_id}_vac_${participation.id}`;
            const transfer = await createTransfer(transferData, idempotencyKey);

            // Adds mission payment
            await createMissionPayment({
              mid: expiredReview.payload.associated_mission_id,
              vacancy_id: participation.id,
              sender_id: HERMYX_SYSTEM_ID,
              receiver_id: adventurer.uid,
              stripe_transaction_id: transfer.id,
              transaction_type: TRANSACTION_TYPE.PAYOUT.ID,
              amount_paid: participation.monetary_reward,
            });

            await markVacancyAsPaidOut(participation.id);
            await releaseParticipation(
              expiredReview.payload.associated_mission_id,
              expiredReview.sender_id,
            );
          }

          await syncMissionCompletionStatus(
            expiredReview.payload.associated_mission_id,
          );
          await updateNotificationStatus(
            expiredReview.nid,
            NOTIFICATION_STATUS.ACCEPTED.ID,
          );
          await markAsSeen(expiredReview.nid);

          const approvedMessage = `Your participation in "${mission.title}" was approved automatically by the system after it wasn't reviewed on time (one week).`;
          const followUpNotificationId = await create({
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
            status: null,
            message: approvedMessage,
            senderId: HERMYX_SYSTEM_ID,
            receiverId: expiredReview.sender_id,
            payload: {
              associated_mission_id:
                expiredReview.payload.associated_mission_id,
            },
          });

          emitToUser(
            expiredReview.sender_id,
            'mission:participation-approved',
            {
              notificationId: followUpNotificationId,
              type: NOTIFICATION_TYPE.MISSION.ID,
              action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
              missionId: expiredReview.payload.associated_mission_id,
              missionTitle: mission.title,
              ownerId: HERMYX_SYSTEM_ID,
              ownerUsername: 'SYSTEM',
              message: approvedMessage,
            },
          );

          successes.push(
            `${messages.MISSION_PARTICIPATION_APPROVED_SUCCESSFULLY}. Notification: ${expiredReview.nid}.`,
          );
        }
      }
    }
    return res.status(200).json({ errors, successes });
  } catch (error) {
    console.error(
      '[CRON] Error while accepting expired participation reviews:',
      error,
    );
  }
};
