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
import { AppError, checkRequired } from '../utils/error.util.js';
import * as notificationModel from '../models/notification.model.js';
import * as disputeService from './dispute.service.js';
import * as missionService from './mission.service.js';
import * as userService from './user.service.js';
import * as conversationService from './conversation.service.js';
import * as paymentProvider from '../providers/payment.provider.js';
import * as socketProvider from '../providers/socket.provider.js';

/// Model access functions
export const createNotification = async (notificationData, client) =>
  notificationModel.create(notificationData, client);

// Get notification by nid
export const getNotificationByNid = async (nid, client) => {
  checkRequired(nid, 'Notification id');
  return await notificationModel.findByNid(nid, client);
};

const getNotificationByNidOrThrow = async (nid) => {
  const notification = await getNotificationByNid(nid);
  if (!notification)
    throw new AppError(messages.NOTIFICATION.GENERAL.NOT_FOUND, 404);
  return notification;
};

// Get notification by action status and vacancy id
export const findNotificationByActionStatusAndVacancyId = async (
  action,
  status,
  vacancyId,
  client,
) => {
  // Parameter checks
  checkRequired(action, 'Notification action');
  checkRequired(status, 'Notification status');
  checkRequired(vacancyId, 'Mission participation id');
  return await notificationModel.findByActionStatusAndMissionParticipationId(
    action,
    status,
    vacancyId,
    client,
  );
};

// Updates notification
export const updateNotification = async (notificationData, client) => {
  // Parameter checks
  checkRequired(notificationData, 'Notification data');
  return await notificationModel.update(notificationData, client);
};

// Updates notification status
export const updateNotificationStatus = async (nid, status, client) => {
  // Parameter checks
  checkRequired(nid, 'Notification id');
  checkRequired(status, 'Notification status');
  return await notificationModel.updateStatusByNid(nid, status, client);
};

// Marks notifications as seen
export const markNotificationAsSeen = async (nid, client) => {
  // Parameter checks
  checkRequired(nid, 'Notification id');
  return await notificationModel.markAsSeenByNid(nid, client);
};

// Adds associated report
export const addAssociatedReport = async (nid, rid, client) => {
  // Parameter checks
  checkRequired(nid, 'Notification id');
  checkRequired(rid, 'Report id');
  return await notificationModel.addAssociatedReport(nid, rid, client);
};

// Searches if user has pending join notifications on a vacancy
export const hasPendingJoinNotification = async (
  mid,
  uid,
  recipientId,
  vacancyId,
  client,
) => {
  checkRequired(mid, 'Mission id');
  checkRequired(uid, 'User id');
  checkRequired(recipientId, 'Notification recipient user id');
  checkRequired(vacancyId, 'Mission participation id');
  return await notificationModel.hasPendingJoinNotification(
    mid,
    uid,
    recipientId,
    vacancyId,
    client,
  );
};

// Counts participation review attempts
export const countParticipationReviewAttempts = async (
  mid,
  adventurerId,
  client,
) => {
  (checkRequired(mid, 'Mission id'),
    checkRequired(adventurerId, 'Adventurer user id'));
  return await notificationModel.countParticipationReviewAttempts(
    mid,
    adventurerId,
    client,
  );
};

/// Endpoint complex functions
// Gets current user's notifications
export const getMyNotifications = async (uid) => {
  // Parameter checks
  checkRequired(uid, 'User id');

  // Gets current user's notifications
  return await notificationModel.findByRecipientId(uid);
};

// Marks all current user's unseen notifications are seen
export const markMyNotificationsAsSeen = async (uid) => {
  // Parameter checks
  checkRequired(uid, 'User id');

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
  checkRequired(nid, 'Notification id');
  checkRequired(response, 'Notification response');
  checkRequired(user, 'Current user');

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
    return await respondToParticipationReview(responseData);

  // Participation rejection notification
  if (
    notification.action ===
    NOTIFICATION_ACTION.PARTICIPATION_REJECTION_RESPONSE.ID
  )
    return await respondToParticipationRejection(responseData);

  // Mission join notification
  if (
    notification.action === NOTIFICATION_ACTION.JOIN_REQUEST.ID ||
    notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
  )
    return await respondToMissionJoinNotification(responseData);

  // Mission monetary reward edit notification
  if (notification.action === NOTIFICATION_ACTION.MISSION_EDIT.ID)
    return await respondToVacancyMonetaryRewardEdition(responseData);

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
    return await disputeParticipationReview({
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
    return await rejectParticipationReview({
      notification,
      mission,
      user,
      participation,
    });

  // If user accepts participation
  checkAcceptedResponse(response);
  return await acceptParticipationReview({
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
    return await notificationModel.create(
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
  isAutomatic = false,
}) => {
  // Gets adventurer that sent the notification
  const adventurer = await userService.getUserByUidOrThrow(
    notification.sender_id,
  );

  // Checks that the adventurer has configured their account
  if (!adventurer.stripe_connected_id)
    throw new AppError(messages.ADVENTURER_BANK_ACCOUNT_NOT_CONFIGURED, 403);

  // Checks that the participation can be disputed on current state
  checkParticipationTransition(
    participation,
    MISSION_PARTICIPATION_STATUS.ACCEPTED.ID,
    messages.CANNOT_ACCEPT_PARTICIPATION_STATE,
  );

  // Creates payment and modifies database
  let successfulPayment = false;
  try {
    // Updates participation status to accepted
    await missionService.updateParticipationStatusByMidAndAdventurer(
      mission.mid,
      adventurer.uid,
      MISSION_PARTICIPATION_STATUS.ACCEPTED.ID,
    );

    // Creates participation transfer on Stripe outside of database transaction but in its own try
    const transfer = await createParticipationTransfer(
      mission.mid,
      participation,
      adventurer,
    );
    // Accept a participation needs a database transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
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

      // If everything is ok, marks participation as released
      // Updates participation status to accepted
      await missionService.updateParticipationStatusByMidAndAdventurer(
        mission.mid,
        adventurer.uid,
        MISSION_PARTICIPATION_STATUS.RELEASED.ID,
        client,
      );
      await client.query('COMMIT');
      successfulPayment = true;
    } catch (dbError) {
      await client.query('ROLLBACK');
      // If db fails but transfer was correct, a log should be created to fix that inconsistency as soon as possible
      console.error(
        `FATAL DB ERROR: Transfer ${transfer.id} sent to ${adventurer.uid} after participation accepted but DB failed`,
        dbError,
      );
    } finally {
      client.release();
    }
  } catch (stripeError) {
    // If a Stripe payment fails error should be saved in a log to fix it as soon as possible
    console.error(
      `Stripe Error when paying out vacancy ${participation.id} due to participation accepted:`,
      stripeError.message,
    );
  }

  // Notification is created outside the main transaction, because it always has to been send, even if monetary transaction fails
  const approvedMessage = isAutomatic
    ? messages.NOTIFICATION.ACCEPT_PARTICIPATION.AUTOMATIC(mission.title)
    : successfulPayment
      ? messages.NOTIFICATION.ACCEPT_PARTICIPATION.SUCCESSFUL(
          mission.title,
          user.username,
        )
      : messages.NOTIFICATION.ACCEPT_PARTICIPATION.ISSUED(
          mission.title,
          user.username,
        );
  const followUpNotificationId = await withTransaction(async (client) => {
    await notificationModel.create(
      buildNotification({
        action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
        message: approvedMessage,
        receiverId: adventurer.uid,
        senderId: isAutomatic ? HERMYX_SYSTEM_ID : user.uid,
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
        .ACCEPTED_SUCCESSFULLY,
  };
};

// Completes the approval of a participation
const completeParticipationApproval = async ({
  mission,
  participation,
  adventurer,
  transfer,
  client,
}) => {
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

// Responds to participation rejection by applicant
const respondToParticipationRejection = async ({
  notification,
  response,
  message: disputeReason,
  user,
}) => {
  // Gets mission information
  const mid = notification.payload.associated_mission_id;
  const mission = await missionService.getMissionByIdOrThrow(mid);

  // Gets participation
  const participation =
    await missionService.getMissionParticipationByMidAndAdventurerIdOrThrow(
      mid,
      user.uid,
    );
  if (participation.status !== MISSION_PARTICIPATION_STATUS.REJECTED.ID)
    throw new AppError(
      messages.NOTIFICATION.RESPOND_TO_PARTICIPATION_REJECTION.ALREADY_REVIEWED,
      409,
    );

  // If user disputes the rejection
  if (response === 'disputed')
    return await disputeParticipationReview({
      notification,
      participation,
      mission,
      disputeReason,
      user,
      reportType: REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID,
      counterpartId: mission.owner_id,
    });

  // If user accepts the rejection
  checkAcceptedResponse(response);

  // Checks if mission can be in progress by status again
  checkParticipationTransition(
    participation,
    MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID,
    messages.CANNOT_REOPEN_PARTICIPATION_STATE,
  );

  // Reopens participation, syncs mission and responds to notification, all in a database transaction
  await withTransaction(async (client) => {
    // Participation is in progress again
    await missionService.updateParticipationStatusByMidAndAdventurer(
      mid,
      user.uid,
      MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID,
      client,
    );

    // Syncs mission state
    await syncMissionCompletionStatus(mid, client);

    // Resolves notification
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.ACCEPTED.ID,
      client,
    );
  });
  return {
    message:
      messages.NOTIFICATION.RESPOND_TO_PARTICIPATION_REJECTION
        .ACCEPTED_SUCCESSFULLY,
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

// Responds to mission join notification, can be done by adventurer or applicant
const respondToMissionJoinNotification = async ({ notification, response }) => {
  // Gets mission info
  const mid = notification.payload.associated_mission_id;
  const mission = await missionService.getMissionByIdOrThrow(mid);

  // If join is rejected
  if (response === 'rejected')
    return await rejectMissionJoinNotification(notification, mission);

  // If join is accepted
  checkAcceptedResponse(response);

  // Gets participation info
  const vacancyId = notification.payload.associated_vacancy_id;
  if (!vacancyId)
    throw new AppError(
      messages.NOTIFICATION.GENERAL.NOT_ASSOCIATED_WITH_VACANCY,
      409,
    );
  const vacancy =
    await missionService.getMissionParticipationByIdOrThrow(vacancyId);

  // Checks if vacancy can be joined
  checkParticipationTransition(
    vacancy,
    MISSION_PARTICIPATION_STATUS.JOINED.ID,
    messages.CANNOT_JOIN_PARTICIPATION_STATE,
  );

  // Check if adventurer has already joined the mission
  const adventurerId =
    mission.owner_id === notification.sender_id
      ? notification.recipient_id
      : notification.sender_id;
  const alreadyJoined =
    await missionService.getMissionParticipationByMidAndAdventurerId(
      mid,
      adventurerId,
    );
  if (alreadyJoined)
    throw new AppError(messages.MISSION.JOIN.ALREADY_JOINED, 409);

  // Gets adventurer info
  const adventurer = await userService.getUserByUidOrThrow(adventurerId);
  if (!adventurer.stripe_connected_id)
    throw new AppError(
      messages.MISSION.JOIN.ADVENTURER_BANK_ACCOUNT_NOT_CONFIGURED,
      403,
    );

  // Finally, joins mission in a transaction
  const events = await withTransaction(async (client) => {
    // Updates participation to joined
    const joinedVacancy =
      await missionService.updateParticipationAdventurerAndStatus(
        vacancyId,
        adventurerId,
        MISSION_PARTICIPATION_STATUS.JOINED.ID,
        client,
      );
    if (!joinedVacancy) throw new AppError(messages.MISSION.JOIN.FAILED, 409);

    // Updates mission occupied vacancies
    await missionService.updateOccupiedVacancies(mid, 1, client);

    // Adds participant into mission conversation
    await conversationService.createMissionConversationParticipant(
      mid,
      adventurerId,
      client,
    );

    // Marks notification as accepted and seen
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.ACCEPTED.ID,
      client,
    );

    // Sends follow-up notification
    return await createJoinResolutionNotifications(
      notification,
      mission,
      client,
    );
  });

  // Sends follow up notification
  emitNotificationEvents(events);
  return { message: 'Adventurer successfully added' };
};

// Rejects join mission request
const rejectMissionJoinNotification = async (notification, mission) => {
  // Rejects join notification and sends follow-up notification, so database transaction is needed
  const event = await withTransaction(async (client) => {
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.REJECTED.ID,
      client,
    );
    return await createJoinNotificationEvent(
      notification,
      mission,
      false,
      client,
    );
  });
  // Sends notification
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
    notificationModel.findByActionStatusAndMissionParticipationId(
      NOTIFICATION_ACTION.JOIN_REQUEST.ID,
      NOTIFICATION_STATUS.PENDING.ID,
      vacancyId,
      client,
    ),
    notificationModel.findByActionStatusSenderAndMission(
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

// Creates join request follow-up notification
const createJoinNotificationEvent = async (
  notification,
  mission,
  accepted,
  client,
) => {
  // Chooses correct message
  const message = accepted
    ? notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
      ? messages.NOTIFICATION.JOIN_MISSION_DECISION.INVITATION.ACCEPTED(
          mission.title,
        )
      : messages.NOTIFICATION.JOIN_MISSION_DECISION.REQUEST.ACCEPTED(
          mission.title,
        )
    : notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
      ? messages.NOTIFICATION.JOIN_MISSION_DECISION.INVITATION.REJECTED(
          mission.title,
        )
      : messages.NOTIFICATION.JOIN_MISSION_DECISION.REQUEST.REJECTED(
          mission.title,
        );

  // Creates notification
  const notificationId = await notificationModel.create(
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

// Responds to vacancy monetary reward edition
const respondToVacancyMonetaryRewardEdition = async ({
  notification,
  response,
  user,
}) => {
  // Gets mission information
  const mission = await missionService.getMissionByIdOrThrow(
    notification.payload.associated_mission_id,
  );

  // Gets participation information
  const participation =
    await missionService.getMissionParticipationByMidAndAdventurerIdOrThrow(
      mission.mid,
      user.uid,
    );

  // Checks if mission can actually be edited by status
  if (!MISSION_STATUS[mission.status].CAN_EDIT)
    throw new AppError(messages.MISSION.EDIT.CANNOT_EDIT_MISSION, 409);

  // Rejects the new monetary reward offer
  if (response === 'rejected')
    return await rejectRewardEdition({
      notification,
      mission,
      participation,
      user,
    });

  // Accepts the new monetary reward offer
  checkAcceptedResponse(response);
  return await acceptRewardEdition({
    notification,
    mission,
    participation,
    user,
  });
};

// Rejects new monetary reward offer
const rejectRewardEdition = async ({
  notification,
  mission,
  participation,
  user,
}) => {
  const rejectionMessage =
    messages.NOTIFICATION.MONETARY_REWARD_EDITION.REJECTED(
      user.username,
      mission.title,
      participation.monetary_reward,
      notification.payload.new_offer,
    );

  // Database transaction for rejection
  const notificationId = await withTransaction(async (client) => {
    // Rejects notification and marks it as seen
    await resolveNotification(
      notification.nid,
      NOTIFICATION_STATUS.REJECTED.ID,
      client,
    );

    // Creates follow up notification
    return await notificationModel.create(
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

  // Sends follow up notification
  emitNegotiationEvent(
    mission,
    user,
    notificationId,
    rejectionMessage,
    'mission:participation-negotiation-rejected',
  );
  return {
    message:
      messages.NOTIFICATION.RESPOND_TO_NEW_MONETARY_REWARD_OFFER
        .REJECTED_SUCCESSFULLY,
  };
};

// Accepts new monetary reward offer
const acceptRewardEdition = async ({
  notification,
  mission,
  participation,
  user,
}) => {
  // Prepares refunds if necessary
  const newOffer = notification.payload.new_offer;

  // Creates payment and modifies database
  let successfulRefund = false;
  try {
    // If the new offer is lower than the reward, a refund is needed
    if (participation.monetary_reward > newOffer)
      // Updates participation payment status to partially refunded
      await missionService.updateMissionParticipationPaymentStatus(
        participation.id,
        MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
      );

    const refundData = await prepareNegotiationRefunds(
      mission,
      participation,
      newOffer,
    );

    // Accept a participation needs a database transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Updates participation reward
      await missionService.updateMissionParticipationReward(
        participation.id,
        newOffer,
        client,
      );

      // Accepts notification and marks it as seen
      await resolveNotification(
        notification.nid,
        NOTIFICATION_STATUS.ACCEPTED.ID,
        client,
      );

      // Ends reward edition process
      await persistNegotiationPaymentChanges(
        mission,
        participation,
        newOffer,
        refundData,
        client,
      );
      await client.query('COMMIT');
      successfulRefund = true;
    } catch (dbError) {
      await client.query('ROLLBACK');
      // If db fails but transfer was correct, a log should be created to fix that inconsistency as soon as possible
      console.error(
        `FATAL DB ERROR: a refund from ${participation.adventurer} after monetary reward lowered but DB failed`,
        dbError,
      );
    } finally {
      client.release();
    }
  } catch (stripeError) {
    // If a Stripe payment fails error should be saved in a log to fix it as soon as possible
    console.error(
      `Stripe Error when paying out vacancy ${participation.id} due to monetary reward lowered:`,
      stripeError.message,
    );
  }
  const acceptMessage = successfulRefund
    ? messages.NOTIFICATION.MONETARY_REWARD_EDITION.ACCEPTED.SUCCESSFUL(
        user.username,
        mission.title,
        participation.monetary_reward,
        newOffer,
      )
    : messages.NOTIFICATION.MONETARY_REWARD_EDITION.ACCEPTED.ISSUED(
        user.username,
        mission.title,
        participation.monetary_reward,
        newOffer,
      );
  // Creates follow up notification
  const followUpNotificationId = await withTransaction(async (client) => {
    await notificationModel.create(
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

  // Sends follow-up notification
  emitNegotiationEvent(
    mission,
    user,
    followUpNotificationId,
    acceptMessage,
    'mission:participation-negotiation-accepted',
  );
  return {
    message:
      messages.NOTIFICATION.RESPOND_TO_NEW_MONETARY_REWARD_OFFER
        .ACCEPTED_SUCCESSFULLY,
  };
};

// Prepares negotiation refunds on Stripe if necessary
const prepareNegotiationRefunds = async (mission, participation, newOffer) => {
  if (participation.monetary_reward <= newOffer) return [];

  // Gets mission payments
  const payments = await missionService.getMissionPaymentsByVacancyId(
    participation.id,
  );

  // Amount to refund
  let amountToRefund = participation.monetary_reward - newOffer;
  const refunds = [];

  // Makes refunds of every necessary payment
  for (const payment of payments) {
    if (amountToRefund <= 0) break;
    const amount = Math.min(
      amountToRefund,
      payment.amount_paid - payment.amount_refunded,
    );

    // Creates refund on Stripe
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
      `negotiation_refund_${mission.mid}_${participation.id}_${Date.now()}`,
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
  // If the new offer is lower than the reward, a refund is needed
  if (participation.monetary_reward > newOffer) {
    // Updates participation payment status to partially refunded
    await missionService.updateMissionParticipationPaymentStatus(
      participation.id,
      MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
      client,
    );

    // For every Stripe refund
    for (const { amount, payment, refund } of refunds) {
      // Updates payment refunded amount
      await missionService.refundMissionPayment(amount, payment.pid, client);

      // Creates refund payment
      await missionService.createMissionPayment(
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

    // Updates participation status and amount paid
    await missionService.refundMissionParticipation(
      participation.id,
      participation.monetary_reward - newOffer,
      client,
    );

    // Gets all occupied participations
    const occupied = await missionService.getOccupiedMissionParticipations(
      mission.mid,
      client,
    );

    // So mission payment can be correctly updated
    await missionService.updateMissionPayment(
      mission.mid,
      occupied.reduce(
        (sum, vacancy) => sum + Number(vacancy.monetary_reward),
        0,
      ) * HERMYX_FEE || 0,
      client,
    );
  }

  // If the new offer is higher than the reward
  else if (
    participation.payment_status ===
    MISSION_PARTICIPATION_PAYMENT_STATUS.PAID.ID
  ) {
    // Updates participation status to rejected
    await missionService.updateParticipationStatusByMidAndAdventurer(
      mission.mid,
      participation.adventurer_id,
      MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
      client,
    );

    // Updates participant payment status
    await missionService.updateMissionParticipationPaymentStatus(
      participation.id,
      MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_PAID.ID,
      client,
    );
  }
};

// Marks notification as seem
export const markMyNotificationAsSeen = async (nid, userId) => {
  // Gets notifications
  const notification = await getNotificationByNidOrThrow(nid);

  // Checks if notification recipient is current user, so is authorized to respond it
  checkNotificationRecipient(notification.recipient_id, userId);

  // Marks it as seen
  return await notificationModel.markAsSeenByNid(nid);
};

export const autoAcceptParticipation = async () => {
  // Gets expired participations
  const expiredReviews =
    await notificationModel.findExpiredParticipationReviews();
  if (expiredReviews.length === 0) return 'No notifications expired.';

  // Accepts them all
  const errors = [];
  const successes = [];
  for (const notification of expiredReviews) {
    try {
      // Gets notification info
      const mission = await missionService.getMissionByIdOrThrow(
        notification.payload.associated_mission_id,
      );
      const participation =
        await missionService.getMissionParticipationByMidAndAdventurerIdOrThrow(
          mission.mid,
          notification.sender_id,
        );
      const user = await userService.getUserByUidOrThrow(HERMYX_SYSTEM_ID);
      // Accepts notification
      await acceptParticipationReview({
        notification,
        participation,
        mission,
        user,
        isAutomatic: true,
      });
      successes.push(
        `${messages.NOTIFICATION.RESPOND_TO_SUBMIT_PARTICIPATION.ACCEPTED_SUCCESSFULLY}. Notification: ${notification.nid}.`,
      );
    } catch (error) {
      errors.push(`${error.message}. Notification: ${notification.nid}.`);
    }
  }
  return { errors, successes };
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

// Checks response options to be accepted
const checkAcceptedResponse = (response) => {
  if (response !== 'accepted' && response !== 'accept')
    throw new AppError(
      messages.NOTIFICATION.GENERAL.INVALID_RESPONSE_ACTION,
      400,
    );
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

// Emits notifications
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
