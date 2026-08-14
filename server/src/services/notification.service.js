import {
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
  REPORT_TYPE,
  TRANSACTION_TYPE,
} from '@hermyx/shared';
import pool from '../config/db.config.js';
import { AppError } from '../utils/error.util.js';
import * as notificationModel from '../models/notification.model.js';
import * as disputeService from './dispute.service.js';
import * as missionService from './mission.service.js';
import * as paymentService from './payment.service.js';
import * as userService from './user.service.js';
import * as conversationService from './conversation.service.js';
import * as paymentProvider from '../providers/payment.provider.js';
import * as socketProvider from '../providers/socket.provider.js';

/// Model access functions
export const createNotification = async (notificationData, client) =>
  notificationModel.create(notificationData, client);

// Get notification by nid
export const getNotificationByNid = async (nid, client) => {
  checkNid(nid);
  return await notificationModel.findById(nid, client);
};

const getNotificationByNidOrThrow = async (nid) => {
  const notification = await getNotificationByNid(nid);
  if (!notification)
    throw new AppError(messages.NOTIFICATION.GENERAL.NOT_FOUND, 404);
  return notification;
};

export const getNotificationsByRecipientId = async (recipientId, client) =>
  notificationModel.findByRecipientId(recipientId, client);

export const findNotificationByActionStatusAndVacancyId = async (
  action,
  status,
  vacancyId,
  client,
) =>
  notificationModel.findByActionStatusAndVacancy(
    action,
    status,
    vacancyId,
    client,
  );

export const findNotificationsByActionStatusSenderAndMissionId = async (
  action,
  status,
  missionId,
  senderId,
  client,
) =>
  notificationModel.findByActionStatusSenderAndMission(
    action,
    status,
    missionId,
    senderId,
    client,
  );

export const findExpiredParticipationReviews = async (client) =>
  notificationModel.findExpiredParticipationReviews(client);

export const updateNotification = async (notificationData, client) =>
  notificationModel.update(notificationData, client);

export const updateNotificationStatus = async (
  notificationId,
  status,
  client,
) => notificationModel.updateStatusByNid(notificationId, status, client);

export const markNotificationAsSeen = async (notificationId, client) =>
  notificationModel.markAsSeenByNid(notificationId, client);

export const markNotificationsAsSeenByRecipientId = async (
  recipientId,
  client,
) => notificationModel.markAllAsSeenByRecipientId(recipientId, client);

export const addAssociatedReport = async (notificationId, reportId, client) =>
  notificationModel.addAssociatedReport(notificationId, reportId, client);

export const hasPendingJoinNotification = async (
  mid,
  uid,
  ownerId,
  vacancyId,
  client,
) =>
  notificationModel.hasPendingJoinNotification(
    mid,
    uid,
    ownerId,
    vacancyId,
    client,
  );

export const countParticipationReviewAttempts = async (
  mid,
  adventurerId,
  client,
) =>
  notificationModel.countParticipationReviewAttempts(mid, adventurerId, client);

/// Endpoint complex functions
// Gets current user's notifications
export const getMyNotifications = async (uid) => {
  // Parameter checks
  checkUid(uid);

  // Gets current user's notifications
  return await notificationModel.findByRecipientId(uid);
};

// Marks all current user's unseen notifications are seen
export const markMyNotificationsAsSeen = async (uid) => {
  // Parameter checks
  checkUid(uid);

  // Marks notifications as seen
  return await notificationModel.markAllAsSeenByRecipientId(uid);
};

// Responds to a notification
export const respondToNotification = async ({
  nid,
  response,
  message,
  user,
}) => {
  // Parameter checks
  checkNid(nid);
  checkResponse(response);
  checkUser(user);

  // Gets notification
  const notification = await getNotificationByNidOrThrow(nid);

  // Checks if notification recipient is current user, so is authorized to respond it
  checkNotificationRecipient(notification.recipient_id, user.uid);

  // Checks if notification is actually pending
  if (notification.status !== NOTIFICATION_STATUS.PENDING.ID)
    throw new AppError(
      messages.NOTIFICATION.GENERAL.NOTIFICATION_NOT_PENDING(
        notification.status,
      ),
      400,
    );

  // Prepares response object
  const responseData = { notification, response, message, user };

  // Participation review notification
  if (notification.action === NOTIFICATION_ACTION.PARTICIPATION_REVIEW.ID)
    return respondToParticipationReview(responseData);

  // Participation rejection notification
  if (
    notification.action ===
    NOTIFICATION_ACTION.PARTICIPATION_REJECTION_RESPONSE.ID
  )
    return respondToParticipationRejection(responseData);

  // Mission join notification
  if (
    notification.action === NOTIFICATION_ACTION.JOIN_REQUEST.ID ||
    notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
  )
    return respondToMissionJoinNotification(responseData);

  // Mission monetary reward edit notification
  if (notification.action === NOTIFICATION_ACTION.MISSION_EDIT.ID)
    return respondToVacancyMonetaryRewardEdition(responseData);

  // If neither of those, then is incorrect
  throw new AppError(
    messages.NOTIFICATION.GENERAL.INVALID_NOTIFICATION_ACTION,
    400,
  );
};

// Respond to participation review notification
const respondToParticipationReview = async ({
  notification,
  response,
  message: disputeReason,
  user,
}) => {
  // Gets mission information
  const mid = notification.payload.associated_mission_id;
  const mission = await missionService.getMissionByIdOrThrow(mid);

  // Checks if mission owner is current user, so they can respond
  if (mission.owner_id !== user.uid)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);

  // Checks if mission is in a correct status to receive participations
  if (!MISSION_STATUS[mission.status].CAN_SUBMIT_PARTICIPATION)
    throw new AppError(
      messages.NOTIFICATION.RESPOND_TO_SUBMIT_PARTICIPATION
        .CANNOT_SUBMIT_PARTICIPATION,
      409,
    );

  // Gets participation
  const participation =
    await missionService.getMissionParticipationByMidAndAdventurerIdOrThrow(
      mid,
      notification.sender_id,
    );

  // Checks if that participation has actually been submitted
  if (participation.status !== MISSION_PARTICIPATION_STATUS.SUBMITTED.ID)
    throw new AppError(
      messages.NOTIFICATION.RESPOND_TO_SUBMIT_PARTICIPATION.ALREADY_REVIEWED,
      409,
    );

  // If user disputes the participation
  if (response === 'disputed')
    return disputeParticipationReview({
      notification,
      participation,
      mission,
      disputeReason,
      user,
      reportType: REPORT_TYPE.REVIEW_DISPUTE.ID,
      counterpartId: notification.sender_id,
    });

  // If user rejects participation
  if (response === 'rejected')
    return rejectParticipationReview({
      notification,
      mission,
      user,
      participation,
    });

  // If user accepts participation
  checkAcceptedResponse(response);
  return acceptParticipationReview({
    notification,
    participation,
    mission,
    user,
  });
};

// Rejects the participation that is been reviewed
const rejectParticipationReview = async ({
  notification,
  mission,
  user,
  participation,
}) => {
  // Checks that the participation can be disputed on current state
  checkParticipationTransition(
    participation,
    MISSION_PARTICIPATION_STATUS.REJECTED.ID,
    messages.NOTIFICATION.RESPOND_TO_SUBMIT_PARTICIPATION
      .CANNOT_REJECT_PARTICIPATION_STATE,
  );

  // Reject a participation needs a database transaction
  const revisionMessage = messages.NOTIFICATION.REJECT_PARTICIPATION(
    mission.title,
    user.username,
  );
  const followUpNotificationId = await withTransaction(async (client) => {
    // Updates participation status to rejected
    await missionService.updateParticipationStatusByMidAndAdventurer(
      mission.mid,
      notification.sender_id,
      MISSION_PARTICIPATION_STATUS.REJECTED.ID,
      client,
    );

    // Updates mission status, syncing it using the status of all participations
    await syncMissionCompletionStatus(mission.mid, client);

    // Updates notification status and marks it as seen
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.REJECTED.ID,
      client,
    );

    // Creates follow up notification
    return notificationModel.create(
      buildNotification({
        action: NOTIFICATION_ACTION.PARTICIPATION_REJECTION_RESPONSE.ID,
        kind: NOTIFICATION_KIND.ACTIONABLE.ID,
        message: revisionMessage,
        receiverId: notification.sender_id,
        senderId: user.uid,
        status: NOTIFICATION_STATUS.PENDING.ID,
        missionId: mission.mid,
      }),
      client,
    );
  });

  // Sends notification to user
  socketProvider.emitToUser(
    notification.sender_id,
    'mission:participation-revision',
    buildMissionEvent(
      followUpNotificationId,
      mission,
      user,
      revisionMessage,
      NOTIFICATION_ACTION.PARTICIPATION_REJECTION_RESPONSE.ID,
    ),
  );
  return {
    message:
      messages.NOTIFICATION.RESPOND_TO_SUBMIT_PARTICIPATION
        .MISSION_PARTICIPATION_REVISION_REQUESTED_SUCCESSFULLY,
  };
};

// Accepts the participation that is been reviewed
const acceptParticipationReview = async ({
  notification,
  participation,
  mission,
  user,
}) => {
  // Checks that the participation can be disputed on current state
  checkParticipationTransition(
    participation,
    MISSION_PARTICIPATION_STATUS.ACCEPTED.ID,
    messages.CANNOT_ACCEPT_PARTICIPATION_STATE,
  );

  // Gets adventurer that sent the notification
  const adventurer = await userService.getUserByUidOrThrow(
    notification.sender_id,
  );

  // Creates participation transfer on Stripe
  const transfer = await createParticipationTransfer(
    mission.mid,
    participation,
    adventurer,
  );

  // Accept a participation needs a database transaction
  const approvedMessage = messages.NOTIFICATION.ACCEPT_PARTICIPATION(
    mission.title,
    user.username,
  );
  const followUpNotificationId = await withTransaction(async (client) => {
    // Completes participation approval
    await completeParticipationApproval({
      mission,
      participation,
      adventurer,
      transfer,
      client,
    });

    // Updates notification status and marks it as read
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.ACCEPTED.ID,
      client,
    );

    // Creates notification
    return notificationModel.create(
      buildNotification({
        action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
        message: approvedMessage,
        receiverId: adventurer.uid,
        senderId: user.uid,
        missionId: mission.mid,
      }),
      client,
    );
  });

  // Sends notification
  socketProvider.emitToUser(
    adventurer.uid,
    'mission:participation-approved',
    buildMissionEvent(
      followUpNotificationId,
      mission,
      user,
      approvedMessage,
      NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
    ),
  );
  return {
    message:
      messages.NOTIFICATION.RESPOND_TO_SUBMIT_PARTICIPATION
        .MISSION_PARTICIPATION_APPROVED_SUCCESSFULLY,
  };
};

const respondToParticipationRejection = async ({
  notification,
  response,
  message: disputeReason,
  user,
}) => {
  const missionId = notification.payload.associated_mission_id;
  const mission = await missionService.getMissionByIdOrThrow(missionId);
  const participation =
    await missionService.getMissionParticipationByMidAndAdventurerIdOrThrow(
      missionId,
      user.uid,
    );
  if (participation.status !== MISSION_PARTICIPATION_STATUS.REJECTED.ID)
    throw new AppError(messages.MISSION_PARTICIPATION_ALREADY_REVIEWED, 409);

  if (response === 'disputed')
    return disputeParticipationReview({
      notification,
      participation,
      mission,
      disputeReason,
      user,
      reportType: REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID,
      counterpartId: mission.owner_id,
    });
  checkAcceptedResponse(response);
  checkParticipationTransition(
    participation,
    MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID,
    messages.CANNOT_REOPEN_PARTICIPATION_STATE,
  );

  await withTransaction(async (client) => {
    await missionService.reopenMissionParticipation(
      missionId,
      user.uid,
      client,
    );
    await missionService.syncMissionCompletionStatus(missionId, client);
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.ACCEPTED.ID,
      client,
    );
  });
  return {
    message: messages.MISSION_PARTICIPATION_REVISION_ACCEPTED_SUCCESSFULLY,
  };
};

// Disputes the participation that is been reviewed or that the applicant has rejected on their review
const disputeParticipationReview = async ({
  notification,
  participation,
  mission,
  disputeReason,
  user,
  reportType,
  counterpartId,
}) => {
  // Applicant can only dispute participations that have already been reviewed
  if (
    reportType === REPORT_TYPE.REVIEW_DISPUTE.ID &&
    Number(notification.payload?.attempt || 1) <= 1
  )
    throw new AppError(
      messages.NOTIFICATION.RESPOND_TO_SUBMIT_PARTICIPATION.REQUIRES_RETRY,
      409,
    );

  // Checks that the participation can be disputed on current state
  checkParticipationTransition(
    participation,
    MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID,
    messages.NOTIFICATION.RESPOND_TO_SUBMIT_PARTICIPATION
      .CANNOT_DISPUTE_PARTICIPATION_STATE,
  );

  // Creates dispute ticket
  const disputeMessage =
    reportType === REPORT_TYPE.REVIEW_DISPUTE.ID
      ? messages.NOTIFICATION.DISPUTE_PARTICIPATION(
          mission.title,
          user.username,
        )
      : messages.NOTIFICATION.DISPUTE_REJECTED_PARTICIPATION(
          mission.title,
          user.username,
        );
  const dispute = await disputeService.createDisputeTicket({
    senderId: user.uid,
    counterpartId,
    adventurerId: participation.adventurer_id,
    missionId: mission.mid,
    vacancyId: participation.id,
    notificationId: notification.nid,
    reportType,
    reason: disputeReason,
    systemMessage: disputeMessage,
  });

  // Sends notification to the other parts disputed
  socketProvider.emitToUser(counterpartId, 'mission:participation-disputed', {
    notificationId: dispute.followUpNotificationId,
    type: NOTIFICATION_TYPE.MISSION.ID,
    action: NOTIFICATION_ACTION.PARTICIPATION_DISPUTED.ID,
    missionId: mission.mid,
    missionTitle: mission.title,
    message: disputeMessage,
    reportId: dispute.report.rid,
  });

  // Sends the initial message of the dispute conversation
  socketProvider.emitToUser(counterpartId, 'conversation:message-received', {
    conversationId: dispute.conversation.cid,
    conversationType: 'dispute',
    messageId: dispute.initialMessage.mid,
    reportId: dispute.report.rid,
    senderId: user.uid,
  });
  socketProvider.emitToAdmins('report:created', {
    reportId: dispute.report.rid,
  });
  return {
    message:
      messages.NOTIFICATION.RESPOND_TO_SUBMIT_PARTICIPATION
        .MISSION_PARTICIPATION_DISPUTED_SUCCESSFULLY,
  };
};

const respondToMissionJoinNotification = async ({ notification, response }) => {
  const missionId = notification.payload.associated_mission_id;
  const mission = await missionService.getMissionByIdOrThrow(missionId);
  if (response === 'rejected')
    return rejectMissionJoinNotification(notification, mission);
  checkAcceptedResponse(response);

  const vacancyId = notification.payload.associated_vacancy_id;
  if (!vacancyId)
    throw new AppError(messages.NOTIFICATION_NOT_ASSOCIATED_WITH_VACANCY, 409);
  const vacancy =
    await missionService.getMissionParticipationByIdOrThrow(vacancyId);
  checkParticipationTransition(
    vacancy,
    MISSION_PARTICIPATION_STATUS.JOINED.ID,
    messages.CANNOT_JOIN_PARTICIPATION_STATE,
  );
  const adventurerId =
    mission.owner_id === notification.sender_id
      ? notification.recipient_id
      : notification.sender_id;
  const alreadyJoined =
    await missionService.getMissionParticipationByMidAndAdventurerId(
      missionId,
      adventurerId,
    );
  if (alreadyJoined) throw new AppError(messages.MISSION_ALREADY_JOINED, 409);
  const adventurer = await userService.getUserByUidOrThrow(adventurerId);
  if (!adventurer.stripe_connected_id)
    throw new AppError(messages.ADVENTURER_BANK_ACCOUNT_NOT_CONFIGURED, 403);

  const events = await withTransaction(async (client) => {
    const joinedVacancy = await missionService.joinMissionVacancy(
      missionId,
      vacancyId,
      adventurerId,
      client,
    );
    if (!joinedVacancy) throw new AppError(messages.VACANCY_NOT_JOINED, 409);
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.ACCEPTED.ID,
      client,
    );
    return createJoinResolutionNotifications(notification, mission, client);
  });
  emitNotificationEvents(events);
  return { message: 'Adventurer successfully added' };
};

const rejectMissionJoinNotification = async (notification, mission) => {
  const event = await withTransaction(async (client) => {
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.REJECTED.ID,
      client,
    );
    return createJoinNotificationEvent(notification, mission, false, client);
  });
  emitNotificationEvents([event]);
  return { message: 'Notification rejected' };
};

const createJoinResolutionNotifications = async (
  notification,
  mission,
  client,
) => {
  const vacancyId = notification.payload.associated_vacancy_id;
  const [vacancyNotifications, adventurerNotifications] = await Promise.all([
    findNotificationByActionStatusAndVacancyId(
      NOTIFICATION_ACTION.JOIN_REQUEST.ID,
      NOTIFICATION_STATUS.PENDING.ID,
      vacancyId,
      client,
    ),
    findNotificationsByActionStatusSenderAndMissionId(
      NOTIFICATION_ACTION.JOIN_REQUEST.ID,
      NOTIFICATION_STATUS.PENDING.ID,
      mission.mid,
      notification.sender_id,
      client,
    ),
  ]);
  const events = [];
  const notifications = [...vacancyNotifications, ...adventurerNotifications];
  const uniqueNotifications = [
    ...new Map(notifications.map((item) => [item.nid, item])).values(),
  ].filter((item) => item.nid !== notification.nid);
  for (const item of uniqueNotifications) {
    await resolveNotification(
      item.nid,
      NOTIFICATION_STATUS.REJECTED.ID,
      client,
    );
    events.push(
      await createJoinNotificationEvent(item, mission, false, client),
    );
  }
  events.push(
    await createJoinNotificationEvent(notification, mission, true, client),
  );
  return events;
};

const createJoinNotificationEvent = async (
  notification,
  mission,
  accepted,
  client,
) => {
  const message = accepted
    ? notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
      ? `Your invitation to join "${mission.title}" was accepted.`
      : `Your request to join "${mission.title}" was accepted. You are now part of the team.`
    : notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
      ? `Your invitation to join "${mission.title}" was rejected.`
      : `Your request to join "${mission.title}" was rejected.`;
  const notificationId = await createNotification(
    buildNotification({
      action: notification.action,
      message,
      receiverId: notification.sender_id,
      senderId: notification.recipient_id,
      missionId: mission.mid,
    }),
    client,
  );
  return {
    receiverId: notification.sender_id,
    event: 'notification:created',
    payload: {
      notificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: notification.action,
      missionId: mission.mid,
      missionTitle: mission.title,
      senderId: notification.recipient_id,
      receiverId: notification.sender_id,
      message,
    },
  };
};

const respondToVacancyMonetaryRewardEdition = async ({
  notification,
  response,
  user,
}) => {
  const mission = await missionService.getMissionByIdOrThrow(
    notification.payload.associated_mission_id,
  );
  const participation =
    await missionService.getMissionParticipationByMidAndAdventurerIdOrThrow(
      mission.mid,
      user.uid,
    );
  if (!MISSION_STATUS[mission.status].CAN_EDIT)
    throw new AppError(messages.CANNOT_EDIT_MISSION, 400);
  if (response === 'rejected')
    return rejectRewardEdition({ notification, mission, participation, user });
  checkAcceptedResponse(response);
  return acceptRewardEdition({ notification, mission, participation, user });
};

const rejectRewardEdition = async ({
  notification,
  mission,
  participation,
  user,
}) => {
  const rejectionMessage = `${user.username} rejected your new monetary reward offer for "${mission.title}": ${participation.monetary_reward} -> ${notification.payload.new_offer}`;
  const notificationId = await withTransaction(async (client) => {
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.REJECTED.ID,
      client,
    );
    return createNotification(
      buildNotification({
        action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
        message: rejectionMessage,
        receiverId: mission.owner_id,
        senderId: user.uid,
        status: NOTIFICATION_STATUS.REJECTED.ID,
        missionId: mission.mid,
        vacancyId: notification.payload.associated_vacancy_id,
      }),
      client,
    );
  });
  emitNegotiationEvent(
    mission,
    user,
    notificationId,
    rejectionMessage,
    'mission:participation-negotiation-rejected',
  );
  return { message: messages.MISSION_PARTICIPATION_DISPUTED_SUCCESSFULLY };
};

const acceptRewardEdition = async ({
  notification,
  mission,
  participation,
  user,
}) => {
  const newOffer = notification.payload.new_offer;
  const refundData = await prepareNegotiationRefunds(
    mission,
    participation,
    newOffer,
  );
  const acceptMessage = `${user.username} accepted your new monetary reward offer for "${mission.title}": ${participation.monetary_reward} -> ${newOffer}`;
  const notificationId = await withTransaction(async (client) => {
    await missionService.updateMissionParticipationReward(
      participation.id,
      newOffer,
      client,
    );
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.ACCEPTED.ID,
      client,
    );
    await persistNegotiationPaymentChanges(
      mission,
      participation,
      newOffer,
      refundData,
      client,
    );
    return createNotification(
      buildNotification({
        action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
        message: acceptMessage,
        receiverId: mission.owner_id,
        senderId: user.uid,
        status: NOTIFICATION_STATUS.ACCEPTED.ID,
        missionId: mission.mid,
        vacancyId: participation.id,
      }),
      client,
    );
  });
  emitNegotiationEvent(
    mission,
    user,
    notificationId,
    acceptMessage,
    'mission:participation-negotiation-accepted',
  );
  return {
    message: messages.MISSION_PARTICIPATION_REVISION_ACCEPTED_SUCCESSFULLY,
  };
};

const prepareNegotiationRefunds = async (mission, participation, newOffer) => {
  if (participation.monetary_reward <= newOffer) return [];
  const payments = await paymentService.getMissionPaymentsByVacancyId(
    participation.id,
  );
  let amountToRefund = (participation.monetary_reward - newOffer) * HERMYX_FEE;
  const refunds = [];
  for (const payment of payments) {
    if (amountToRefund <= 0) break;
    const amount = Math.min(
      amountToRefund,
      payment.amount_paid - payment.amount_refunded,
    );
    const refund = await paymentProvider.createRefund(
      {
        payment_intent: payment.stripe_transaction_id,
        amount: Math.round(amount * 100),
        metadata: {
          mission_id: mission.mid,
          vacancy_id: participation.id,
          reason: 'negotiation_refund',
        },
      },
      `negotiation_refund_${mission.mid}_${participation.id}_${payment.pid}`,
    );
    refunds.push({ amount, payment, refund });
    amountToRefund -= amount;
  }
  return refunds;
};

const persistNegotiationPaymentChanges = async (
  mission,
  participation,
  newOffer,
  refunds,
  client,
) => {
  if (participation.monetary_reward > newOffer) {
    await missionService.updateMissionParticipationPaymentStatus(
      participation.id,
      MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
      client,
    );
    for (const { amount, payment, refund } of refunds) {
      await paymentService.refundMissionPayment(amount, payment.pid, client);
      await paymentService.createMissionPayment(
        {
          mid: mission.mid,
          vacancy_id: participation.id,
          sender_id: HERMYX_SYSTEM_ID,
          receiver_id: mission.owner_id,
          stripe_transaction_id: refund.id,
          transaction_type: TRANSACTION_TYPE.NEGOTIATION_REFUND.ID,
          amount_paid: amount,
        },
        client,
      );
    }
    await missionService.refundMissionParticipation(
      participation.id,
      participation.monetary_reward - newOffer,
      client,
    );
    const occupied = await missionService.getOccupiedMissionParticipations(
      mission.mid,
      client,
    );
    await missionService.updateMissionPayment(
      mission.mid,
      occupied.reduce(
        (sum, vacancy) => sum + Number(vacancy.monetary_reward),
        0,
      ) * HERMYX_FEE || 0,
      client,
    );
  } else if (
    participation.payment_status ===
    MISSION_PARTICIPATION_PAYMENT_STATUS.PAID.ID
  ) {
    await missionService.updateMissionParticipationStatus(
      participation.id,
      MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
      client,
    );
    await missionService.updateMissionParticipationPaymentStatus(
      participation.id,
      MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_PAID.ID,
      client,
    );
  }
};

export const markMyNotificationAsSeen = async (notificationId, userId) => {
  const notification = await getNotificationByNidOrThrow(notificationId);
  checkNotificationRecipient(notification.recipient_id, userId);
  return markNotificationAsSeen(notificationId);
};

export const autoAcceptParticipation = async () => {
  const expiredReviews = await findExpiredParticipationReviews();
  if (expiredReviews.length === 0) return 'No notifications expired.';
  const errors = [];
  const successes = [];
  for (const notification of expiredReviews) {
    try {
      await autoAcceptParticipationReview(notification);
      successes.push(
        `${messages.MISSION_PARTICIPATION_APPROVED_SUCCESSFULLY}. Notification: ${notification.nid}.`,
      );
    } catch (error) {
      errors.push(`${error.message}. Notification: ${notification.nid}.`);
    }
  }
  return { errors, successes };
};

const autoAcceptParticipationReview = async (notification) => {
  const mission = await missionService.getMissionByIdOrThrow(
    notification.payload.associated_mission_id,
  );
  const participation =
    await missionService.getMissionParticipationByMidAndAdventurerIdOrThrow(
      mission.mid,
      notification.sender_id,
    );
  checkParticipationTransition(
    participation,
    MISSION_PARTICIPATION_STATUS.ACCEPTED.ID,
    messages.CANNOT_ACCEPT_PARTICIPATION_STATE,
  );
  const adventurer = await userService.getUserByUidOrThrow(
    notification.sender_id,
  );
  const transfer = await createParticipationTransfer(
    mission.mid,
    participation,
    adventurer,
  );
  const approvedMessage = `Your participation in "${mission.title}" was approved automatically by the system after it wasn't reviewed on time (one week).`;
  const followUpNotificationId = await withTransaction(async (client) => {
    await completeParticipationApproval({
      mission,
      participation,
      adventurer,
      transfer,
      client,
    });
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.ACCEPTED.ID,
      client,
    );
    return createNotification(
      buildNotification({
        action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
        message: approvedMessage,
        receiverId: adventurer.uid,
        senderId: HERMYX_SYSTEM_ID,
        missionId: mission.mid,
      }),
      client,
    );
  });
  socketProvider.emitToUser(
    adventurer.uid,
    'mission:participation-approved',
    buildMissionEvent(
      followUpNotificationId,
      mission,
      { uid: HERMYX_SYSTEM_ID, username: 'SYSTEM' },
      approvedMessage,
      NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
    ),
  );
};

// Completes the approval of a participation
const completeParticipationApproval = async ({
  mission,
  participation,
  adventurer,
  transfer,
  client,
}) => {
  // Updates participation status to accepted
  await missionService.updateParticipationStatusByMidAndAdventurer(
    mission.mid,
    adventurer.uid,
    MISSION_PARTICIPATION_STATUS.ACCEPTED.ID,
    client,
  );

  // If a transfer in Stripe was made, it creates the payment on database
  if (transfer) {
    // Creates payment on database
    await missionService.createMissionPayment(
      {
        mid: mission.mid,
        vacancy_id: participation.id,
        sender_id: HERMYX_SYSTEM_ID,
        receiver_id: adventurer.uid,
        stripe_transaction_id: transfer.id,
        transaction_type: TRANSACTION_TYPE.PAYOUT.ID,
        amount_paid: participation.monetary_reward,
      },
      client,
    );

    // Marks mission participation as paid out
    await missionService.updateParticipationPaymentStatusById(
      participation.id,
      MISSION_PARTICIPATION_PAYMENT_STATUS.LIQUIDATED.ID,
      client,
    );

    // User stops participating on the mission conversation, but can see the history
    await conversationService.freezeMissionConversationHistory(
      mission.mid,
      adventurer.uid,
      client,
    );
  }
  // Syncs mission completion status
  await syncMissionCompletionStatus(mission.mid, client);
};

const emitNotificationEvents = (events) => {
  for (const { receiverId, event, payload } of events)
    socketProvider.emitToUser(receiverId, event, payload);
};

const emitNegotiationEvent = (
  mission,
  user,
  notificationId,
  message,
  event,
) => {
  socketProvider.emitToUser(mission.owner_id, event, {
    notificationId,
    type: NOTIFICATION_TYPE.MISSION.ID,
    action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
    missionId: mission.mid,
    missionTitle: mission.title,
    adventurerId: user.uid,
    adventurerUsername: user.username,
    message,
  });
};

/// Data checks
const checkUid = (uid) => {
  if (!uid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Uid'));
};

const checkNid = (nid) => {
  if (!nid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Nid'));
};

const checkResponse = (response) => {
  if (!response) throw new Error(messages.GENERAL.FIELD_REQUIRED('Response'));
};

const checkUser = (user) => {
  if (!user) throw new Error(messages.GENERAL.FIELD_REQUIRED('User'));
};

/// Helper functions
// Checks that the notification recipient is the current user
const checkNotificationRecipient = (recipientId, userId) => {
  if (recipientId !== userId)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
};

// Checks that the current participation status includes the determined status as on of its valid next states
const checkParticipationTransition = (participation, status, message) => {
  if (
    !MISSION_PARTICIPATION_STATUS[
      participation.status
    ].VALID_NEXT_STATES.includes(status)
  )
    throw new AppError(message, 409);
};

// Uses a transaction for the operation received
const withTransaction = async (operation) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Sync a mission status after review a participation
const syncMissionCompletionStatus = async (mid, client) => {
  // Gets summary
  const summary = await missionService.getMissionStatusSummary(mid, client);

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
  return await missionService.updateStatusByMid(mid, nextStatus, client);
};

// Resolves notification updating it and marking it as seen
const resolveNotification = async (notificationId, status, client) => {
  await notificationModel.updateStatusByNid(notificationId, status, client);
  return notificationModel.markAsSeenByNid(notificationId, client);
};

// Builds notification object
const buildNotification = ({
  action,
  kind = NOTIFICATION_KIND.INFORMATIONAL.ID,
  status = null,
  message,
  senderId,
  receiverId,
  missionId,
  vacancyId,
}) => ({
  type: NOTIFICATION_TYPE.MISSION.ID,
  kind,
  action,
  status,
  message,
  senderId,
  receiverId,
  payload: {
    associated_mission_id: missionId,
    ...(vacancyId ? { associated_vacancy_id: vacancyId } : {}),
  },
});

// Builds mission event for that type of notification
const buildMissionEvent = (
  notificationId,
  mission,
  sender,
  message,
  action,
) => ({
  notificationId,
  type: NOTIFICATION_TYPE.MISSION.ID,
  action,
  missionId: mission.mid,
  missionTitle: mission.title,
  ownerId: sender.uid,
  ownerUsername: sender.username,
  message,
});

// Checks response options to be accepted
const checkAcceptedResponse = (response) => {
  if (response !== 'accepted' && response !== 'accept')
    throw new AppError(
      messages.NOTIFICATION.GENERAL.INVALID_RESPONSE_ACTION,
      400,
    );
};

// Creates the participation transfer on Stripe
const createParticipationTransfer = async (missionId, participation, user) => {
  if (!user.stripe_connected_id) return null;
  return paymentProvider.createTransfer(
    {
      amount: Math.round(participation.monetary_reward * 100),
      currency: 'eur',
      destination: user.stripe_connected_id,
      description: 'mission_payed',
      transfer_group: `mission_${missionId}`,
    },
    `pay_${missionId}_vac_${participation.id}`,
  );
};
