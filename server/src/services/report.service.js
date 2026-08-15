import {
  HERMYX_SYSTEM_ID,
  messages,
  MISSION_PARTICIPATION_STATUS,
  MISSION_STATUS,
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_TYPE,
  REPORT_DECISION,
  REPORT_STATUS,
  REPORT_TYPE,
  TRANSACTION_TYPE,
} from '@hermyx/shared';
import pool from '../config/db.config.js';
import * as reportModel from '../models/report.model.js';
import * as conversationService from './conversation.service.js';
import * as missionService from './mission.service.js';
import * as notificationService from './notification.service.js';
import * as userService from './user.service.js';
import { createTransfer } from '../providers/payment.provider.js';
import { emitToAdmins, emitToUser } from '../providers/socket.provider.js';
import { AppError, checkRequired } from '../utils/error.util.js';

/// Model access functions
const getReportByRidOrThrow = async (reportId) => {
  const report = await reportModel.findById(reportId);
  if (!report) throw new AppError(messages.REPORT_NOT_FOUND, 404);
  return report;
};

const getMissionOrThrow = async (missionId) => {
  return missionService.getMissionByIdOrThrow(missionId);
};

const getVacancyOrThrow = async (missionId, vacancyId) => {
  const vacancy =
    await missionService.getMissionParticipationByIdOrThrow(vacancyId);
  if (vacancy.mid !== missionId) {
    throw new AppError(messages.VACANCY_NOT_IN_MISSION, 409);
  }
  return vacancy;
};

const getUserOrThrow = async (userId) => {
  return userService.getUserByUidOrThrow(userId);
};

const assertReportCanBeResolved = (report) => {
  if (report.status === REPORT_STATUS.ANSWERED.ID) {
    throw new AppError(messages.REPORT_ALREADY_ANSWERED, 409);
  }
  if (!REPORT_TYPE[report.type].CAN_BE_REJECTED_ACCEPTED) {
    throw new AppError(messages.INCORRECT_ANSWER_FOR_REPORT, 409);
  }
};

const getDisputeResolutionContext = async (reportId) => {
  const report = await getReportByRidOrThrow(reportId);
  assertReportCanBeResolved(report);

  const missionId = report.payload.associated_mission_id;
  const vacancyId = report.payload.associated_vacancy_id;
  const mission = await getMissionOrThrow(missionId);
  if (mission.status === MISSION_STATUS.REPORTED.ID) {
    throw new AppError(messages.MISSION_CLOSED_BY_REPORT, 409);
  }

  const vacancy = await getVacancyOrThrow(missionId, vacancyId);
  if (vacancy.status !== MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID) {
    throw new AppError(messages.VACANCY_NOT_DISPUTED, 409);
  }

  const adventurer = await getUserOrThrow(vacancy.adventurer_id);
  return { adventurer, mission, report, vacancy };
};

export const getUserDisputes = async (userId) =>
  reportModel.findDisputesByUserId(userId);

export const hasActiveReport = async (reportData, client) =>
  reportModel.checkActiveReport(reportData, client);

export const createUserReport = async (reportData, client) =>
  reportModel.create(reportData, client);

/// Complex endpoint functions
// Get report by rid
export const getReport = async (rid) => {
  checkRequired(rid, 'Report id');
  return await getReportByRidOrThrow(rid);
};

// Get all reports filtered and paginated
export const getReports = async ({ pagination, filters, userId }) => {
  // Parameter checks
  checkRequired(userId, 'User id');

  // Finds reports paginated and filtered
  const { rows: reports, totalCount } = await reportModel.findAll({
    pagination,
    filters,
    userId,
  });
  const totalItems = parseInt(totalCount);
  const totalPages = pagination ? Math.ceil(totalItems / pagination.limit) : 1;
  if (reports && pagination) {
    return {
      reports,
      pagination: pagination
        ? {
            currentPage: pagination.page,
            totalPages,
            totalItems,
            hasMore: pagination.page < totalPages,
          }
        : undefined,
    };
  } else if (reports && !pagination) {
    return { reports };
  } else
    throw new AppError(
      messages.REPORT.GENERAL.REPORTS_NOT_FOUND,
      404,
      'general',
    );
};

export const reportAdventurer = async ({
  message,
  missionId,
  sender,
  vacancyId,
}) => {
  const mission = await getMissionOrThrow(missionId);
  if (mission.owner_id !== sender.uid) {
    throw new AppError(messages.UNAUTHORIZED_ERROR, 403);
  }

  const vacancy = await getVacancyOrThrow(missionId, vacancyId);
  const adventurer = await getUserOrThrow(vacancy.adventurer_id);
  const notificationMessage = `You have been reported by the applicant of the ${mission.title} mission. You can respond in the dispute conversation.`;
  const systemMessage = `A dispute was opened after ${adventurer.username} was reported for the vacancy "${vacancy.title}" in "${mission.title}".`;
  const client = await pool.connect();
  let conversation;
  let initialMessage;
  let report;
  let notificationId;
  try {
    await client.query('BEGIN');
    conversation = await conversationService.createDisputeConversation(client);
    report = await createReportIfNotActive(
      {
        senderId: sender.uid,
        message,
        type: REPORT_TYPE.REPORT_ADVENTURER.ID,
        lookupPayload: { missionId, vacancyId },
        payload: {
          associated_mission_id: missionId,
          associated_vacancy_id: vacancyId,
        },
        conversationId: conversation.cid,
      },
      messages.ADVENTURER_ALREADY_REPORTED,
      client,
    );

    const participantIds = [sender.uid, adventurer.uid];
    for (const participantId of participantIds) {
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
    for (const participantId of participantIds) {
      await conversationService.markConversationAsReadByUserId(
        conversation.cid,
        participantId,
        client,
      );
    }
    initialMessage = await conversationService.createMessage(
      {
        conversationId: conversation.cid,
        senderId: sender.uid,
        content: message,
      },
      client,
    );

    notificationId = await notificationService.createNotification(
      {
        type: NOTIFICATION_TYPE.REPORT.ID,
        kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
        action: NOTIFICATION_ACTION.ADVENTURER_REPORT.ID,
        status: null,
        message: notificationMessage,
        senderId: sender.uid,
        receiverId: adventurer.uid,
        payload: {
          associated_mission_id: missionId,
          associated_vacancy_id: vacancyId,
          associated_report_id: report.rid,
        },
      },
      client,
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  emitToUser(adventurer.uid, 'notification:created', {
    notificationId,
    missionId,
    vacancyId,
    missionTitle: mission.title,
    senderId: sender.uid,
    senderUsername: sender.username,
    receiverId: adventurer.uid,
    type: NOTIFICATION_TYPE.REPORT.ID,
    message: notificationMessage,
  });
  emitToUser(adventurer.uid, 'conversation:message-received', {
    conversationId: conversation.cid,
    conversationType: 'dispute',
    messageId: initialMessage.mid,
    reportId: report.rid,
    senderId: sender.uid,
  });
  emitToAdmins('report:created', { reportId: report.rid });

  return report;
};

export const reportUser = async ({ message, senderId, userId }) => {
  await getUserOrThrow(userId);
  return createReportTransaction(
    {
      senderId,
      message,
      type: REPORT_TYPE.REPORT_PROFILE.ID,
      lookupPayload: { userId },
      payload: { associated_user_id: userId },
    },
    messages.USER_ALREADY_REPORTED,
  );
};

export const reportMission = async ({ message, missionId, senderId }) => {
  const mission = await getMissionOrThrow(missionId);
  if (mission.owner_id === senderId) {
    throw new AppError(messages.UNAUTHORIZED_ERROR, 403);
  }
  if (mission.status === MISSION_STATUS.REPORTED.ID) {
    throw new AppError(messages.MISSION_CLOSED_BY_REPORT, 409);
  }

  return createReportTransaction(
    {
      senderId,
      message,
      type: REPORT_TYPE.REPORT_MISSION.ID,
      lookupPayload: { missionId },
      payload: { associated_mission_id: missionId },
    },
    messages.MISSION_ALREADY_REPORTED,
  );
};

const createReportTransaction = async (reportData, activeReportMessage) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const report = await createReportIfNotActive(
      reportData,
      activeReportMessage,
      client,
    );
    await client.query('COMMIT');
    return report;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const createReportIfNotActive = async (
  { senderId, message, type, lookupPayload, payload, conversationId },
  activeReportMessage,
  client,
) => {
  const activeReport = await reportModel.checkActiveReport(
    { senderId, type, payload: lookupPayload },
    client,
  );
  if (activeReport > 0) throw new AppError(activeReportMessage, 409);
  return reportModel.create(
    { senderId, message, type, payload, conversationId },
    client,
  );
};

const closeReportAndConversationInternal = async (
  reportId,
  decision,
  reason,
  adminId,
  client,
) => {
  const report = await reportModel.close(
    reportId,
    decision,
    reason,
    adminId,
    client,
  );
  if (!report) throw new AppError(messages.REPORT_NOT_FOUND, 404);

  if (report.conversation_id) {
    const participantIds =
      await conversationService.getActiveConversationParticipantIds(
        report.conversation_id,
        client,
      );
    await conversationService.closeConversation(report.conversation_id, client);
    return { participantIds, report };
  }
  return { participantIds: [], report };
};

export const closeReportAndConversation = async (
  reportId,
  decision,
  reason,
  adminId,
) => {
  const client = await pool.connect();
  let result;
  try {
    await client.query('BEGIN');
    result = await closeReportAndConversationInternal(
      reportId,
      decision,
      reason,
      adminId,
      client,
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  emitConversationClosed(result.participantIds, result.report);
  return result.report;
};

export const acceptAdventurersWork = async ({ adminId, reason, reportId }) => {
  const { adventurer, mission, report, vacancy } =
    await getDisputeResolutionContext(reportId);
  let transfer;
  if (adventurer.stripe_connected_id) {
    transfer = await createTransfer(
      {
        amount: Math.round(vacancy.monetary_reward * 100),
        currency: 'eur',
        destination: adventurer.stripe_connected_id,
        description: 'mission_payed',
        transfer_group: `mission_${mission.mid}`,
      },
      `pay_${mission.mid}_vac_${vacancy.id}`,
    );
  }
  const adventurerMessage = `Your participation in "${mission.title}" was approved by the administration after resolving the dispute. Reward is being payed to you!`;
  const applicantMessage = `Participation ${vacancy.title} disputed by ${adventurer.username} in mission ${mission.title} was accepted by the administration. Reward is being payed to the adventurer.`;
  const client = await pool.connect();
  let adventurerNotificationId;
  let applicantNotificationId;
  let closedReport;
  let participantIds;
  try {
    await client.query('BEGIN');
    await missionService.approveMissionParticipation(
      mission.mid,
      adventurer.uid,
      client,
    );
    if (transfer) {
      await missionService.createMissionPayment(
        {
          mid: mission.mid,
          vacancy_id: vacancy.id,
          sender_id: HERMYX_SYSTEM_ID,
          receiver_id: adventurer.uid,
          stripe_transaction_id: transfer.id,
          transaction_type: TRANSACTION_TYPE.PAYOUT.ID,
          amount_paid: vacancy.monetary_reward,
        },
        client,
      );
      await missionService.updateParticipationPaymentStatusById(
        vacancy.id,
        client,
      );
      await missionService.releaseMissionParticipation(
        mission.mid,
        adventurer.uid,
        client,
      );
    }
    await missionService.syncMissionCompletionStatus(mission.mid, client);
    ({ report: closedReport, participantIds } =
      await closeReportAndConversationInternal(
        reportId,
        REPORT_DECISION.ACCEPT_ADVENTURERS_WORK.ID,
        reason,
        adminId,
        client,
      ));
    adventurerNotificationId = await notificationService.createNotification(
      buildResolutionNotification(
        adventurer.uid,
        mission.mid,
        adventurerMessage,
        NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
      ),
      client,
    );
    applicantNotificationId = await notificationService.createNotification(
      buildResolutionNotification(
        mission.owner_id,
        mission.mid,
        applicantMessage,
        NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
      ),
      client,
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  emitConversationClosed(participantIds, closedReport);
  emitToUser(adventurer.uid, 'mission:participation-approved-dispute', {
    notificationId: adventurerNotificationId,
    missionId: mission.mid,
    missionTitle: mission.title,
    message: adventurerMessage,
  });

  emitToUser(mission.owner_id, 'mission:participation-approved-dispute', {
    notificationId: applicantNotificationId,
    missionId: mission.mid,
    missionTitle: mission.title,
    message: applicantMessage,
  });

  return { report: closedReport, previousReport: report };
};

export const rejectAdventurersWork = async ({ adminId, reason, reportId }) => {
  const { adventurer, mission, vacancy } =
    await getDisputeResolutionContext(reportId);
  const adventurerMessage = `Your participation in "${mission.title}" was rejected by the administration after resolving the dispute. The vacancy is in progress again.`;
  const applicantMessage = `Participation ${vacancy.title} disputed by ${adventurer.username} in mission ${mission.title} was rejected by the administration. The vacancy is in progress again.`;
  const client = await pool.connect();
  let closedReport;
  let participantIds;
  let adventurerNotificationId;
  let applicantNotificationId;
  try {
    await client.query('BEGIN');
    await missionService.reopenMissionParticipation(
      mission.mid,
      adventurer.uid,
      client,
    );
    await missionService.syncMissionCompletionStatus(mission.mid, client);
    ({ report: closedReport, participantIds } =
      await closeReportAndConversationInternal(
        reportId,
        REPORT_DECISION.REJECT_ADVENTURERS_WORK.ID,
        reason,
        adminId,
        client,
      ));
    adventurerNotificationId = await notificationService.createNotification(
      buildResolutionNotification(
        adventurer.uid,
        mission.mid,
        adventurerMessage,
        NOTIFICATION_ACTION.PARTICIPATION_REJECTED.ID,
      ),
      client,
    );
    applicantNotificationId = await notificationService.createNotification(
      buildResolutionNotification(
        mission.owner_id,
        mission.mid,
        applicantMessage,
        NOTIFICATION_ACTION.PARTICIPATION_REJECTED.ID,
      ),
      client,
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  emitConversationClosed(participantIds, closedReport);
  emitToUser(adventurer.uid, 'mission:participation-rejected-dispute', {
    notificationId: adventurerNotificationId,
    missionId: mission.mid,
    missionTitle: mission.title,
    message: adventurerMessage,
  });

  emitToUser(mission.owner_id, 'mission:participation-rejected-dispute', {
    notificationId: applicantNotificationId,
    missionId: mission.mid,
    missionTitle: mission.title,
    message: applicantMessage,
  });

  return closedReport;
};

export const dismiss = async ({ adminId, reason, reportId }) => {
  const report = await getReportByRidOrThrow(reportId);
  if (report.status === REPORT_STATUS.ANSWERED.ID) {
    throw new AppError(messages.REPORT_ALREADY_ANSWERED, 409);
  }
  if (!REPORT_TYPE[report.type].CAN_BE_DISMISSED) {
    throw new AppError(messages.INCORRECT_ANSWER_FOR_REPORT, 409);
  }

  let notificationData;
  let notificationEvent;
  if (report.type === REPORT_TYPE.REPORT_ADVENTURER.ID) {
    const mission = await getMissionOrThrow(
      report.payload.associated_mission_id,
    );
    const vacancy = await getVacancyOrThrow(
      mission.mid,
      report.payload.associated_vacancy_id,
    );
    const adventurer = await getUserOrThrow(vacancy.adventurer_id);
    const message = `Your report on adventurer ${adventurer.username} from mission ${mission.title} has been dismissed, so they will not be kicked out.`;
    notificationData = {
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.REPORT_DISMISSED.ID,
      status: null,
      message,
      senderId: HERMYX_SYSTEM_ID,
      receiverId: report.sender_id,
      payload: { associated_mission_id: mission.mid },
    };
    notificationEvent = {
      missionId: mission.mid,
      missionTitle: mission.title,
      message,
    };
  }

  const client = await pool.connect();
  let closedReport;
  let participantIds;
  let notificationId;
  try {
    await client.query('BEGIN');
    ({ report: closedReport, participantIds } =
      await closeReportAndConversationInternal(
        reportId,
        REPORT_DECISION.DISMISS.ID,
        reason,
        adminId,
        client,
      ));
    if (notificationData)
      notificationId = await notificationService.createNotification(
        notificationData,
        client,
      );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  emitConversationClosed(participantIds, closedReport);
  if (notificationEvent)
    emitToUser(report.sender_id, 'dispute:dismissed', {
      notificationId,
      ...notificationEvent,
    });

  return closedReport;
};

const buildResolutionNotification = (
  receiverId,
  missionId,
  message,
  action,
) => ({
  type: NOTIFICATION_TYPE.MISSION.ID,
  kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
  action,
  status: null,
  message,
  senderId: HERMYX_SYSTEM_ID,
  receiverId,
  payload: { associated_mission_id: missionId },
});

const emitConversationClosed = (participantIds, report) => {
  if (!report?.conversation_id) return;
  emitToAdmins('report:updated', { reportId: report.rid });
  const closedAt = new Date().toISOString();
  for (const participantId of participantIds) {
    emitToUser(participantId, 'conversation:closed', {
      conversationId: report.conversation_id,
      closedAt,
      reportId: report.rid,
    });
  }
};
