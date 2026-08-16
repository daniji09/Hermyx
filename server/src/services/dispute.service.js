import {
  HERMYX_SYSTEM_ID,
  messages,
  MISSION_PARTICIPATION_STATUS,
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  REPORT_TYPE,
} from '@hermyx/shared';
import pool from '../config/db.config.js';
import * as conversationService from './conversation.service.js';
import * as notificationService from './notification.service.js';
import * as missionService from './mission.service.js';
import * as reportService from './report.service.js';
import { AppError, checkRequired } from '../utils/error.util.js';

// Dispute types
const DISPUTE_TYPES = new Set([
  REPORT_TYPE.REPORT_ADVENTURER.ID,
  REPORT_TYPE.REVIEW_DISPUTE.ID,
  REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID,
]);

/// Endpoint complex functions
// Get all disputes from current user
export const getMyDisputes = async (userId) => {
  checkRequired(userId, 'User id');
  return await reportService.getUserDisputes(userId);
};

// Gets current user's unread count
export const getMyDisputeUnreadCount = async (userId) => {
  checkRequired(userId, 'User id');
  return await conversationService.getUnreadMessageCountByUserId(
    userId,
    'dispute',
  );
};

// Gets dispute by rid
export const getDispute = async (reportId, userId) => {
  const dispute = await reportService.getReport(reportId);

  // Checks if dispute actually exists and is correct type
  if (
    !dispute ||
    !dispute.conversation_id ||
    !DISPUTE_TYPES.has(dispute.type)
  ) {
    throw new AppError(messages.REPORT.GENERAL.REPORT_NOT_FOUND, 404);
  }

  // Checks if user is actually participating on that conversation
  const isParticipant = await conversationService.isConversationParticipant(
    dispute.conversation_id,
    userId,
  );
  if (!isParticipant) {
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
  }

  return dispute;
};

// Helpers
// Creates a dispute ticket
export const createDisputeTicket = async ({
  senderId,
  counterpartId,
  adventurerId,
  missionId,
  vacancyId,
  notificationId,
  reportType,
  reason,
  systemMessage,
}) => {
  // Creates a dispute ticket with database transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Checks if applicant has already an active report
    const activeReport = await reportService.hasActiveReport(
      {
        senderId,
        type: reportType,
        payload: { missionId, vacancyId },
      },
      client,
    );
    if (activeReport > 0) {
      throw new AppError(
        messages.REPORT.GENERAL.APPLICANT_ALREADY_REPORTED,
        409,
      );
    }

    // Marks participation as disputed
    await missionService.updateParticipationStatusByMidAndAdventurer(
      missionId,
      adventurerId,
      MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID,
      client,
    );

    // Syncs mission status
    const missionAfterSync = await missionService.syncMissionCompletionStatus(
      missionId,
      client,
    );

    // Updates notification status
    await notificationService.updateNotificationStatus(
      notificationId,
      NOTIFICATION_STATUS.DISPUTED.ID,
      client,
    );

    // Marks notification as seem
    await notificationService.markNotificationAsSeen(notificationId, client);

    // Creates conversation
    const conversation = await conversationService.createConversation(
      'dispute',
      null,
      client,
    );

    // Creates user report
    const report = await reportService.createReport(
      {
        senderId,
        message: reason,
        type: reportType,
        payload: {
          associated_mission_id: missionId,
          associated_vacancy_id: vacancyId,
        },
        conversationId: conversation.cid,
      },
      client,
    );

    // Adds associated report to notification
    await notificationService.addAssociatedReport(
      notificationId,
      report.rid,
      client,
    );

    // Creates conversation participants
    for (const participantId of [senderId, counterpartId]) {
      await conversationService.createConversationParticipant(
        conversation.cid,
        participantId,
        client,
      );
    }

    // Creates initial system message
    await conversationService.createMessage(
      {
        conversationId: conversation.cid,
        senderId: HERMYX_SYSTEM_ID,
        content: systemMessage,
      },
      client,
    );

    // Marks that initial message as seen for all participants
    for (const participantId of [senderId, counterpartId]) {
      await conversationService.markConversationAsReadByUserId(
        conversation.cid,
        participantId,
        client,
      );
    }

    // Now adds initial conversation actual message
    const initialMessage = await conversationService.createMessage(
      { conversationId: conversation.cid, senderId, content: reason },
      client,
    );

    // Creates follow-up notification
    const followUpNotificationId = await notificationService.createNotification(
      {
        type: NOTIFICATION_TYPE.MISSION.ID,
        kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
        action: NOTIFICATION_ACTION.PARTICIPATION_DISPUTED.ID,
        status: null,
        message: systemMessage,
        senderId,
        receiverId: counterpartId,
        payload: {
          associated_mission_id: missionId,
          associated_vacancy_id: vacancyId,
          associated_report_id: report.rid,
        },
      },
      client,
    );

    await client.query('COMMIT');
    return {
      conversation,
      followUpNotificationId,
      initialMessage,
      missionAfterSync,
      report,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
