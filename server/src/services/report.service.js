import {
  HERMYX_SYSTEM_ID,
  messages,
  MISSION_PARTICIPATION_PAYMENT_STATUS,
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
import * as paymentProvider from '../providers/payment.provider.js';
import { emitToAdmins, emitToUser } from '../providers/socket.provider.js';
import { AppError, checkRequired } from '../utils/error.util.js';

/// Model access functions
const getReportByRidOrThrow = async (reportId) => {
  const report = await reportModel.findById(reportId);
  if (!report)
    throw new AppError(messages.REPORT.GENERAL.REPORT_NOT_FOUND, 404);
  return report;
};

// Gets reports by uid
export const getUserDisputes = async (userId) => {
  checkRequired(userId, 'User id');
  return await reportModel.findDisputesByUserId(userId);
};

// Checks active reports of a specified type
export const hasActiveReport = async (reportData, client) => {
  checkRequired(reportData, 'Report data');
  return await reportModel.checkActiveReport(reportData, client);
};

// Creates report
export const createReport = async (reportData, client) => {
  checkRequired(reportData, 'Report data');
  return await reportModel.create(reportData, client);
};

// Gets all active disputes of user
export const getActiveDisputesByUid = async (uid, client) => {
  checkRequired(uid, 'User id');
  return await reportModel.findAllActiveDisputesByUid(uid, client);
};

// Updates status checking current one
export const updateStatusIfCurrent = async (rid, status, client) => {
  checkRequired(rid, 'Report id');
  checkRequired(status, 'Report status');
  return await reportModel.updateStatusIfCurrent(rid, status, client);
};

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

// Reports adventurer
export const reportAdventurer = async ({
  message,
  missionId,
  sender,
  vacancyId,
}) => {
  // Parameter checks
  checkRequired(message, 'Report message');
  checkRequired(missionId, 'Mission id');
  checkRequired(sender, 'Sender user');
  checkRequired(vacancyId, 'Mission participation id');

  // Gets mission info
  const mission = await missionService.getMissionByIdOrThrow(missionId);

  // Checks if report sender is mission owner
  if (mission.owner_id !== sender.uid) {
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
  }

  // Gets vacancy info
  const vacancy =
    await missionService.getMissionParticipationByIdOrThrow(vacancyId);
  if (vacancy.mid !== missionId) {
    throw new AppError(messages.MISSION.GENERAL.VACANCY_NOT_IN_MISSION, 409);
  }

  // Gets adventurer reported info
  const adventurer = await userService.getUserByUidOrThrow(
    vacancy.adventurer_id,
  );
  const notificationMessage = messages.NOTIFICATION.REPORT_ADVENTURER(
    mission.title,
  );
  const systemMessage = messages.CONVERSATION.REPORT_ADVENTURER(
    adventurer.username,
    vacancy.title,
    mission.title,
  );
  const client = await pool.connect();
  let conversation;
  let initialMessage;
  let report;
  let notificationId;

  // All report operations need a transaction
  try {
    await client.query('BEGIN');
    // Creates dispute conversation
    conversation = await conversationService.createConversation(
      'dispute',
      null,
      client,
    );

    // Creates report
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
      messages.REPORT.REPORT_ADVENTURER.ACTIVE_REPORT,
      client,
    );

    // Marks participation as disputed
    await missionService.updateParticipationStatusByMidAndAdventurer(
      missionId,
      adventurer.uid,
      MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID,
      client,
    );

    // Syncs mission
    await missionService.syncMissionCompletionStatus(missionId, client);

    // Creates conversation between reporter and reported
    const participantIds = [sender.uid, adventurer.uid];
    for (const participantId of participantIds) {
      await conversationService.createConversationParticipant(
        conversation.cid,
        participantId,
        client,
      );
    }

    // Creates initial message on conversation (system)
    await conversationService.createMessage(
      {
        conversationId: conversation.cid,
        senderId: HERMYX_SYSTEM_ID,
        content: systemMessage,
      },
      client,
    );

    // Marks conversation as read for both participants (so only one notification appears at first)
    for (const participantId of participantIds) {
      await conversationService.markConversationAsReadByUserId(
        conversation.cid,
        participantId,
        client,
      );
    }

    // Creates report message on conversation (actual report)
    initialMessage = await conversationService.createMessage(
      {
        conversationId: conversation.cid,
        senderId: sender.uid,
        content: message,
      },
      client,
    );

    // Creates notification to adventurer
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
  // Send notification to adventurer
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

  // Creates immediately the dispute conversation to the adventurer
  emitToUser(adventurer.uid, 'conversation:message-received', {
    conversationId: conversation.cid,
    conversationType: 'dispute',
    messageId: initialMessage.mid,
    reportId: report.rid,
    senderId: sender.uid,
  });

  // Creates immediately the report to the admins
  emitToAdmins('report:created', { reportId: report.rid });

  return report;
};

// Report user
export const reportUser = async ({ message, senderId, userId }) => {
  // Parameter check
  checkRequired(userId, 'User id');
  checkRequired(senderId, 'Sender id');
  checkRequired(message, 'Message');

  // Checks if user exists
  await userService.getUserByUidOrThrow(userId);
  // Creates user report with transaction
  return await createReportTransaction(
    {
      senderId,
      message,
      type: REPORT_TYPE.REPORT_PROFILE.ID,
      lookupPayload: { userId },
      payload: { associated_user_id: userId },
    },
    messages.REPORT.REPORT_USER.ACTIVE_REPORT,
  );
};

// Report mission
export const reportMission = async ({ message, mid, senderId }) => {
  // Check parameter
  checkRequired(mid, 'Mission id');
  checkRequired(senderId, 'Sender id');
  checkRequired(message, 'Message');

  // Get mission information
  const mission = await missionService.getMissionByIdOrThrow(mid);
  // Check if sender is not mission owner
  if (mission.owner_id === senderId) {
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
  }

  // Checks if mission has already been reported
  if (mission.status === MISSION_STATUS.REPORTED.ID) {
    throw new AppError(messages.REPORT.REPORT_MISSION.CLOSED_BY_REPORT, 409);
  }

  // Creates report with transaction
  return await createReportTransaction(
    {
      senderId,
      message,
      type: REPORT_TYPE.REPORT_MISSION.ID,
      lookupPayload: { mid },
      payload: { associated_mission_id: mid },
    },
    messages.REPORT.REPORT_MISSION.ACTIVE_REPORT,
  );
};

// Creates a standard report (user or mission) with a transaction
const createReportTransaction = async (reportData, activeReportMessage) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Creates report if not active
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

// Creates report if not active
const createReportIfNotActive = async (
  { senderId, message, type, lookupPayload, payload, conversationId },
  activeReportMessage,
  client,
) => {
  // Check active report
  const activeReport = await reportModel.checkActiveReport(
    { senderId, type, payload: lookupPayload },
    client,
  );
  if (activeReport > 0) throw new AppError(activeReportMessage, 409);

  // And, if theres no other, creates it
  return reportModel.create(
    { senderId, message, type, payload, conversationId },
    client,
  );
};

// Closes report and associated conversation in db
export const closeReportAndConversation = async (
  reportId,
  decision,
  reason,
  adminId,
  client,
) => {
  // Closes report
  const report = await reportModel.close(
    reportId,
    decision,
    reason,
    adminId,
    client,
  );
  if (!report)
    throw new AppError(messages.REPORT.GENERAL.REPORT_NOT_FOUND, 404);

  // Closes associated conversation
  const participantIds = await closeAssociatedConversation(report, client);
  return { participantIds: participantIds || [], report };
};

// Accepts adventurer work
export const acceptAdventurersWork = async ({ adminId, reason, reportId }) => {
  // Parameter check
  checkRequired(adminId, 'Admin user id');
  checkRequired(reason, 'Resolution reason');
  checkRequired(reportId, 'Report id');

  // Gets adventurer, mission, vacancy and report info and basic checks
  const { adventurer, mission, report, vacancy } =
    await getDisputeResolutionContext(reportId);
  let closedReport,
    participantIds,
    successfulPayment = true;

  // Early transaction is made ensuring this admins is answering the report without another one doing the same at the same
  // Time, causing two payments or some inconsistency
  const earlyClient = await pool.connect();
  try {
    await earlyClient.query('BEGIN');

    // Report is updated if it is possible, so is like a block
    const reportLocked = await reportModel.updateStatusIfCurrent(
      reportId,
      REPORT_STATUS.ANSWERED.ID,
      earlyClient,
    );
    if (!reportLocked)
      throw new AppError(messages.REPORT.GENERAL.BEING_ANSWERED, 409);

    // Participation is updated
    await missionService.updateParticipationStatusByMidAndAdventurer(
      mission.mid,
      adventurer.uid,
      MISSION_PARTICIPATION_STATUS.ACCEPTED.ID,
      earlyClient,
    );

    await earlyClient.query('COMMIT');
  } catch (error) {
    await earlyClient.query('ROLLBACK');
    throw error;
  } finally {
    earlyClient.release();
  }

  // Creates Stripe transfer in its own try and with idempotency key
  try {
    let transfer;
    if (adventurer.stripe_connected_id) {
      transfer = await paymentProvider.createTransfer(
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

    // Then makes database changes on its own database transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Creates payment on db
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
        // Marks vacancy as liquidated
        await missionService.updateParticipationPaymentStatusById(
          vacancy.id,
          MISSION_PARTICIPATION_PAYMENT_STATUS.LIQUIDATED.ID,
          client,
        );

        // Participation status is changed to release
        const participation =
          await missionService.updateParticipationStatusByMidAndAdventurer(
            mission.mid,
            adventurer.uid,
            MISSION_PARTICIPATION_STATUS.RELEASED.ID,
            client,
          );

        // User stops participating on the mission conversation, but can see the history
        if (participation)
          await conversationService.freezeMissionConversationHistory(
            mission.mid,
            adventurer.uid,
            client,
          );
      }
      // Mission completion status is synced
      await missionService.syncMissionCompletionStatus(mission.mid, client);

      // Closes report and associated conversation on db
      ({ report: closedReport, participantIds } =
        await closeReportAndConversation(
          reportId,
          REPORT_DECISION.ACCEPT_ADVENTURERS_WORK.ID,
          reason,
          adminId,
          client,
        ));
      await client.query('COMMIT');
      successfulPayment = true;
    } catch (dbError) {
      await client.query('ROLLBACK');
      // If db fails but transfer was correct, a log should be created to fix that inconsistency as soon as possible
      console.error(
        `FATAL DB ERROR: Transfer ${transfer.id} sent to ${adventurer.uid} after an admin accepted adventurer's work but DB failed`,
        dbError,
      );
    } finally {
      client.release();
    }
  } catch (stripeError) {
    // Report is updated to sent status only if Stripe has failed
    await reportModel.updateStatusIfCurrent(reportId, REPORT_STATUS.SENT.ID);
    // If a Stripe payment fails, for doesn't end, error should be saved in a log to fix it as soon as possible
    console.error(
      `Stripe Error while paying out vacancy ${vacancy.id}  after an admin accepted adventurer's:`,
      stripeError.message,
    );
  }

  const adventurerMessage = successfulPayment
    ? messages.NOTIFICATION.ADVENTURER_WORK_ACCEPTED.TO_ADVENTURER.SUCCESSFUL(
        mission.title,
      )
    : messages.NOTIFICATION.ADVENTURER_WORK_ACCEPTED.TO_ADVENTURER.ISSUED(
        mission.title,
      );
  const applicantMessage =
    messages.NOTIFICATION.ADVENTURER_WORK_ACCEPTED.TO_APPLICANT(
      vacancy.title || vacancy.id,
      adventurer.username,
      mission.title,
    );
  let adventurerNotificationId, applicantNotificationId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Creates adventurer notification
    adventurerNotificationId = await notificationService.createNotification(
      buildResolutionNotification(
        adventurer.uid,
        mission.mid,
        adventurerMessage,
        NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
      ),
      client,
    );

    // Creates applicant notification
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

  // Send notifications and conversation closure
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

// Rejects adventurer work
export const rejectAdventurersWork = async ({ adminId, reason, reportId }) => {
  // Parameter check
  checkRequired(adminId, 'Admin user id');
  checkRequired(reason, 'Resolution reason');
  checkRequired(reportId, 'Report id');

  // Gets adventurer, mission, vacancy and report info and basic checks
  const { adventurer, mission, vacancy } =
    await getDisputeResolutionContext(reportId);

  // All changes are made in a database transaction
  const client = await pool.connect();
  let closedReport;
  let participantIds;
  let adventurerNotificationId;
  let applicantNotificationId;
  const adventurerMessage =
    messages.NOTIFICATION.ADVENTURER_WORK_REJECTED.TO_ADVENTURER(mission.title);
  const applicantMessage =
    messages.NOTIFICATION.ADVENTURER_WORK_REJECTED.TO_APPLICANT(
      vacancy.title || vacancy.id,
      adventurer.username,
      mission.title,
    );
  try {
    await client.query('BEGIN');
    // Report is updated if it is possible, so is like a block
    const reportLocked = await reportModel.updateStatusIfCurrent(
      reportId,
      REPORT_STATUS.ANSWERED.ID,
      client,
    );
    if (!reportLocked)
      throw new AppError(messages.REPORT.GENERAL.BEING_ANSWERED, 409);

    // First, status is changed to in progress again
    await missionService.updateParticipationStatusByMidAndAdventurer(
      mission.mid,
      adventurer.uid,
      MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID,
      client,
    );

    // Mission status is synced
    await missionService.syncMissionCompletionStatus(mission.mid, client);

    // Report and associated conversation is closed
    ({ report: closedReport, participantIds } =
      await closeReportAndConversation(
        reportId,
        REPORT_DECISION.REJECT_ADVENTURERS_WORK.ID,
        reason,
        adminId,
        client,
      ));

    // Adventurer follow-up notification is created
    adventurerNotificationId = await notificationService.createNotification(
      buildResolutionNotification(
        adventurer.uid,
        mission.mid,
        adventurerMessage,
        NOTIFICATION_ACTION.PARTICIPATION_REJECTED.ID,
      ),
      client,
    );

    // Applicant follow-up notification is created
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

  // Notifications are sent and conversation is closed
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

// Dismisses report
export const dismiss = async ({ adminId, reason, reportId }) => {
  // Parameter check
  checkRequired(adminId, 'Admin user id');
  checkRequired(reason, 'Resolution reason');
  checkRequired(reportId, 'Report id');

  // Gets report info
  const report = await getReportByRidOrThrow(reportId);

  // Checks if report has already been answered
  if (report.status === REPORT_STATUS.ANSWERED.ID) {
    throw new AppError(messages.REPORT.GENERAL.ALREADY_ANSWERED, 409);
  }

  // Checks if this type of report can be dismissed
  if (!REPORT_TYPE[report.type].CAN_BE_DISMISSED) {
    throw new AppError(messages.REPORT.GENERAL.INCORRECT_ANSWER, 409);
  }

  let notificationData;
  let notificationEvent;
  if (report.type === REPORT_TYPE.REPORT_ADVENTURER.ID) {
    // Gets mission info
    const mission = await missionService.getMissionByIdOrThrow(
      report.payload.associated_mission_id,
    );

    // Gets vacancy info
    const vacancy = await missionService.getMissionParticipationByIdOrThrow(
      report.payload.associated_vacancy_id,
    );
    if (vacancy.mid !== mission.mid) {
      throw new AppError(messages.MISSION.GENERAL.VACANCY_NOT_IN_MISSION, 409);
    }

    // Gets adventurer info
    const adventurer = await userService.getUserByUidOrThrow(
      vacancy.adventurer_id,
    );

    // Creates notification data
    const message = messages.NOTIFICATION.DISMISS.REPORT_ADVENTURER(
      adventurer.username,
      mission.title,
    );
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

  // Closes report and sends notification in a transaction
  const client = await pool.connect();
  let closedReport;
  let participantIds;
  let notificationId;
  try {
    await client.query('BEGIN');
    // Report is updated if it is possible, so is like a block
    const reportLocked = await reportModel.updateStatusIfCurrent(
      reportId,
      REPORT_STATUS.ANSWERED.ID,
      client,
    );
    if (!reportLocked)
      throw new AppError(messages.REPORT.GENERAL.BEING_ANSWERED, 409);

    // Closes report and associated conversation on db
    ({ report: closedReport, participantIds } =
      await closeReportAndConversation(
        reportId,
        REPORT_DECISION.DISMISS.ID,
        reason,
        adminId,
        client,
      ));

    // Sends follow-up notification to applicant if necessary
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

  // Sends conversation closed and notification if necessary
  emitConversationClosed(participantIds, closedReport);
  if (notificationEvent)
    emitToUser(report.sender_id, 'dispute:dismissed', {
      notificationId,
      ...notificationEvent,
    });

  return closedReport;
};

/// Helper functions
// Asserts if a report can be resolved
const assertReportCanBeResolved = (report) => {
  if (report.status === REPORT_STATUS.ANSWERED.ID) {
    throw new AppError(messages.REPORT.GENERAL.ALREADY_ANSWERED, 409);
  }
  if (!REPORT_TYPE[report.type].CAN_BE_REJECTED_ACCEPTED) {
    throw new AppError(messages.REPORT.GENERAL.INCORRECT_ANSWER, 409);
  }
};

// Gets dispute resolution context
const getDisputeResolutionContext = async (reportId) => {
  // Gets context and checks if it can be resolved
  const report = await getReportByRidOrThrow(reportId);
  assertReportCanBeResolved(report);

  // Gets mission, vacancy and adventurer info
  const missionId = report.payload.associated_mission_id;
  const vacancyId = report.payload.associated_vacancy_id;
  const mission = await missionService.getMissionByIdOrThrow(missionId);
  if (mission.status === MISSION_STATUS.REPORTED.ID) {
    throw new AppError(messages.REPORT.REPORT_MISSION.CLOSED_BY_REPORT, 409);
  }

  const vacancy =
    await missionService.getMissionParticipationByIdOrThrow(vacancyId);
  if (vacancy.mid !== missionId) {
    throw new AppError(messages.MISSION.GENERAL.VACANCY_NOT_IN_MISSION, 409);
  }
  if (vacancy.status !== MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID) {
    throw new AppError(messages.REPORT.GENERAL.VACANCY_NOT_DISPUTED, 409);
  }

  const adventurer = await userService.getUserByUidOrThrow(
    vacancy.adventurer_id,
  );
  return { adventurer, mission, report, vacancy };
};

// Builds resolution notification
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

// Emits conversation closed
export const emitConversationClosed = (participantIds, report) => {
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

// Closes associated conversation
const closeAssociatedConversation = async (report, client) => {
  // If there is an active conversation associated, closes it
  if (report.conversation_id) {
    const participantIds =
      await conversationService.getActiveConversationParticipantIds(
        report.conversation_id,
        client,
      );
    await conversationService.closeConversation(report.conversation_id, client);
    return participantIds;
  }
};
