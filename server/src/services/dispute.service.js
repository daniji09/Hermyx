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
import { createDisputeConversation } from '../models/conversation.model.js';
import {
  addConversationParticipant,
  isConversationParticipant,
  markConversationAsReadByUserId,
} from '../models/conversation-participant.model.js';
import {
  createMessage,
  getUnreadMessageCountByUserId,
} from '../models/conversation-message.model.js';
import {
  addAssociatedReport,
  createNotification,
  markAsSeen,
  updateNotificationStatus,
} from '../models/notification.model.js';
import { disputeParticipation } from '../models/mission-participation.model.js';
import { syncMissionCompletionStatus } from '../models/mission.model.js';
import {
  checkActiveReport,
  createReport,
  getDisputesByUserId,
  getReportById,
} from '../models/report.model.js';
import { getActiveAdmin } from '../models/user.model.js';
import { AppError } from '../utils/error.util.js';

const DISPUTE_TYPES = new Set([
  REPORT_TYPE.REVIEW_DISPUTE.ID,
  REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID,
]);

export const getMyDisputes = async (userId) => getDisputesByUserId(userId);

export const getMyDisputeUnreadCount = async (userId) =>
  getUnreadMessageCountByUserId(userId, 'dispute');

export const getDispute = async (reportId, userId) => {
  const dispute = await getReportById(reportId);
  if (!dispute || !DISPUTE_TYPES.has(dispute.type)) {
    throw new AppError(messages.REPORT_NOT_FOUND, 404);
  }

  const isParticipant = await isConversationParticipant(
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

    const activeReport = await checkActiveReport(
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

    const admin = await getActiveAdmin(client);
    if (!admin) {
      throw new AppError(
        'An active administrator is required for disputes.',
        409,
      );
    }

    await disputeParticipation(missionId, adventurerId, client);
    const missionAfterSync = await syncMissionCompletionStatus(
      missionId,
      client,
    );
    await updateNotificationStatus(
      notificationId,
      NOTIFICATION_STATUS.DISPUTED.ID,
      client,
    );
    await markAsSeen(notificationId, client);

    const conversation = await createDisputeConversation(client);
    const report = await createReport(
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
    await addAssociatedReport(notificationId, report.rid, client);

    for (const participantId of [senderId, counterpartId, admin.uid]) {
      await addConversationParticipant(conversation.cid, participantId, client);
    }

    await createMessage({
      conversationId: conversation.cid,
      senderId: HERMYX_SYSTEM_ID,
      content: systemMessage,
      database: client,
    });

    for (const participantId of [senderId, counterpartId, admin.uid]) {
      await markConversationAsReadByUserId(
        conversation.cid,
        participantId,
        client,
      );
    }

    const initialMessage = await createMessage({
      conversationId: conversation.cid,
      senderId,
      content: reason,
      database: client,
    });

    const followUpNotificationId = await createNotification(
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
