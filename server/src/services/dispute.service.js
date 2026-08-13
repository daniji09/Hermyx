import {
  HERMYX_SYSTEM_ID,
  messages,
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
import * as userService from './user.service.js';
import { AppError } from '../utils/error.util.js';

const DISPUTE_TYPES = new Set([
  REPORT_TYPE.REVIEW_DISPUTE.ID,
  REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID,
]);

export const getMyDisputes = async (userId) =>
  reportService.getUserDisputes(userId);

export const getMyDisputeUnreadCount = async (userId) =>
  conversationService.getUnreadMessageCountByUserId(userId, 'dispute');

export const getDispute = async (reportId, userId) => {
  const dispute = await reportService.getReport(reportId);
  if (!dispute || !DISPUTE_TYPES.has(dispute.type)) {
    throw new AppError(messages.REPORT_NOT_FOUND, 404);
  }

  const isParticipant = await conversationService.isConversationParticipant(
    dispute.conversation_id,
    userId,
  );
  if (!isParticipant) {
    throw new AppError(messages.UNAUTHORIZED_ERROR, 403);
  }

  return dispute;
};

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
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const activeReport = await reportService.hasActiveReport(
      {
        senderId,
        type: reportType,
        payload: { missionId, vacancyId },
      },
      client,
    );
    if (activeReport > 0) {
      throw new AppError(messages.APPLICANT_ALREADY_REPORTED, 409);
    }

    const admin = await userService.getActiveAdmin(client);
    if (!admin) {
      throw new AppError(
        'An active administrator is required for disputes.',
        409,
      );
    }

    await missionService.disputeMissionParticipation(
      missionId,
      adventurerId,
      client,
    );
    const missionAfterSync = await missionService.syncMissionCompletionStatus(
      missionId,
      client,
    );
    await notificationService.updateNotificationStatus(
      notificationId,
      NOTIFICATION_STATUS.DISPUTED.ID,
      client,
    );
    await notificationService.markNotificationAsSeen(notificationId, client);

    const conversation =
      await conversationService.createDisputeConversation(client);
    const report = await reportService.createUserReport(
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
    await notificationService.addAssociatedReport(
      notificationId,
      report.rid,
      client,
    );

    for (const participantId of [senderId, counterpartId, admin.uid]) {
      await conversationService.createConversationParticipant(
        conversation.cid,
        participantId,
        client,
      );
    }

    await conversationService.createMessage(
      {
        conversationId: conversation.cid,
        senderId: HERMYX_SYSTEM_ID,
        content: systemMessage,
      },
      client,
    );

    for (const participantId of [senderId, counterpartId, admin.uid]) {
      await conversationService.markConversationAsReadByUserId(
        conversation.cid,
        participantId,
        client,
      );
    }

    const initialMessage = await conversationService.createMessage(
      { conversationId: conversation.cid, senderId, content: reason },
      client,
    );

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
      adminId: admin.uid,
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
