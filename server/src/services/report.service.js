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
import {
  findByMid as getMissionById,
  syncMissionCompletionStatus,
} from '../models/mission.model.js';
import { findByUid as getUserById } from '../models/user.model.js';
import {
  approveParticipation,
  findById as getVacancyById,
  markVacancyAsPaidOut,
  releaseParticipation,
  reopenParticipation,
} from '../models/mission-participation.model.js';
import {
  checkActiveReport,
  closeReport,
  createReport,
  getReportById,
  getReports as getReportsFromModel,
} from '../models/report.model.js';
import { createNotification } from './notification.service.js';
import { createMissionPayment } from '../models/mission-payment.model.js';
import { getActiveConversationParticipantIds } from '../models/conversation-participant.model.js';
import { createTransfer } from '../providers/payment.provider.js';
import { emitToUser } from '../providers/socket.provider.js';
import { AppError } from '../utils/error.util.js';

const getReportOrThrow = async (reportId) => {
  const report = await getReportById(reportId);
  if (!report) throw new AppError(messages.REPORT_NOT_FOUND, 404);
  return report;
};

const getMissionOrThrow = async (missionId) => {
  const mission = await getMissionById(missionId);
  if (!mission) throw new AppError(messages.MISSION_NOT_FOUND, 404);
  return mission;
};

const getVacancyOrThrow = async (missionId, vacancyId) => {
  const vacancy = await getVacancyById(vacancyId);
  if (!vacancy) throw new AppError(messages.VACANCY_NOT_FOUND, 404);
  if (vacancy.mid !== missionId) {
    throw new AppError(messages.VACANCY_NOT_IN_MISSION, 409);
  }
  return vacancy;
};

const getUserOrThrow = async (userId) => {
  const user = await getUserById(userId);
  if (!user) throw new AppError(messages.USER_NOT_FOUND, 404);
  return user;
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
  const report = await getReportOrThrow(reportId);
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

export const getReport = async (reportId) => getReportOrThrow(reportId);

export const getReports = async ({ pagination, filters, userId }) => {
  const { rows: reports, totalCount } = await getReportsFromModel({
    pagination,
    filters,
    userId,
  });
  const totalItems = parseInt(totalCount);
  const totalPages = pagination ? Math.ceil(totalItems / pagination.limit) : 1;

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
  const activeReport = await checkActiveReport({
    senderId: sender.uid,
    type: REPORT_TYPE.REPORT_ADVENTURER.ID,
    payload: { missionId, vacancyId },
  });
  if (activeReport > 0) {
    throw new AppError(messages.ADVENTURER_ALREADY_REPORTED, 409);
  }

  const report = await createReport({
    senderId: sender.uid,
    message,
    type: REPORT_TYPE.REPORT_ADVENTURER.ID,
    payload: {
      associated_mission_id: missionId,
      associated_vacancy_id: vacancyId,
    },
  });
  const notificationMessage = `You have been reported by the applicant of the ${mission.title} mission.`;
  const notificationId = await createNotification({
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
  });
  emitToUser(adventurer.uid, 'mission:edited', {
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

  return report;
};

export const reportUser = async ({ message, senderId, userId }) => {
  await getUserOrThrow(userId);
  const activeReport = await checkActiveReport({
    senderId,
    type: REPORT_TYPE.REPORT_PROFILE.ID,
    payload: { userId },
  });
  if (activeReport > 0) {
    throw new AppError(messages.USER_ALREADY_REPORTED, 409);
  }
  return createReport({
    senderId,
    message,
    type: REPORT_TYPE.REPORT_PROFILE.ID,
    payload: { associated_user_id: userId },
  });
};

export const reportMission = async ({ message, missionId, senderId }) => {
  const mission = await getMissionOrThrow(missionId);
  if (mission.owner_id === senderId) {
    throw new AppError(messages.UNAUTHORIZED_ERROR, 403);
  }
  if (mission.status === MISSION_STATUS.REPORTED.ID) {
    throw new AppError(messages.MISSION_CLOSED_BY_REPORT, 409);
  }

  const activeReport = await checkActiveReport({
    senderId,
    type: REPORT_TYPE.REPORT_MISSION.ID,
    payload: { missionId },
  });
  if (activeReport > 0) {
    throw new AppError(messages.MISSION_ALREADY_REPORTED, 409);
  }
  return createReport({
    senderId,
    message,
    type: REPORT_TYPE.REPORT_MISSION.ID,
    payload: { associated_mission_id: missionId },
  });
};

export const closeReportAndConversation = async (...args) => {
  const report = await closeReport(...args);
  if (!report) throw new AppError(messages.REPORT_NOT_FOUND, 404);

  if (report.conversation_id) {
    const participantIds = await getActiveConversationParticipantIds(
      report.conversation_id,
    );
    for (const participantId of participantIds) {
      emitToUser(participantId, 'conversation:closed', {
        conversationId: report.conversation_id,
        closedAt: new Date().toISOString(),
        reportId: report.rid,
      });
    }
  }
  return report;
};

export const acceptAdventurersWork = async ({ adminId, reason, reportId }) => {
  const { adventurer, mission, report, vacancy } =
    await getDisputeResolutionContext(reportId);

  await approveParticipation(mission.mid, adventurer.uid);
  if (adventurer.stripe_connected_id) {
    const transfer = await createTransfer(
      {
        amount: Math.round(vacancy.monetary_reward * 100),
        currency: 'eur',
        destination: adventurer.stripe_connected_id,
        description: 'mission_payed',
        transfer_group: `mission_${mission.mid}`,
      },
      `pay_${mission.mid}_vac_${vacancy.id}`,
    );
    await createMissionPayment({
      mid: mission.mid,
      vacancy_id: vacancy.id,
      sender_id: HERMYX_SYSTEM_ID,
      receiver_id: adventurer.uid,
      stripe_transaction_id: transfer.id,
      transaction_type: TRANSACTION_TYPE.PAYOUT.ID,
      amount_paid: vacancy.monetary_reward,
    });
    await markVacancyAsPaidOut(vacancy.id);
    await releaseParticipation(mission.mid, adventurer.uid);
  }

  await syncMissionCompletionStatus(mission.mid);
  const closedReport = await closeReportAndConversation(
    reportId,
    REPORT_DECISION.ACCEPT_ADVENTURERS_WORK.ID,
    reason,
    adminId,
  );

  const adventurerMessage = `Your participation in "${mission.title}" was approved by the administration after resolving the dispute. Reward is being payed to you!`;
  const adventurerNotificationId = await createNotification({
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
    status: null,
    message: adventurerMessage,
    senderId: HERMYX_SYSTEM_ID,
    receiverId: adventurer.uid,
    payload: { associated_mission_id: mission.mid },
  });
  emitToUser(adventurer.uid, 'mission:participation-approved-dispute', {
    notificationId: adventurerNotificationId,
    missionId: mission.mid,
    missionTitle: mission.title,
    message: adventurerMessage,
  });

  const applicantMessage = `Participation ${vacancy.title} disputed by ${adventurer.username} in mission ${mission.title} was accepted by the administration. Reward is being payed to the adventurer.`;
  const applicantNotificationId = await createNotification({
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
    status: null,
    message: applicantMessage,
    senderId: HERMYX_SYSTEM_ID,
    receiverId: mission.owner_id,
    payload: { associated_mission_id: mission.mid },
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

  await reopenParticipation(mission.mid, adventurer.uid);
  await syncMissionCompletionStatus(mission.mid);
  const closedReport = await closeReportAndConversation(
    reportId,
    REPORT_DECISION.REJECT_ADVENTURERS_WORK.ID,
    reason,
    adminId,
  );

  const adventurerMessage = `Your participation in "${mission.title}" was rejected by the administration after resolving the dispute. The vacancy is in progress again.`;
  const adventurerNotificationId = await createNotification({
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: NOTIFICATION_ACTION.PARTICIPATION_REJECTED.ID,
    status: null,
    message: adventurerMessage,
    senderId: HERMYX_SYSTEM_ID,
    receiverId: adventurer.uid,
    payload: { associated_mission_id: mission.mid },
  });
  emitToUser(adventurer.uid, 'mission:participation-rejected-dispute', {
    notificationId: adventurerNotificationId,
    missionId: mission.mid,
    missionTitle: mission.title,
    message: adventurerMessage,
  });

  const applicantMessage = `Participation ${vacancy.title} disputed by ${adventurer.username} in mission ${mission.title} was rejected by the administration. The vacancy is in progress again.`;
  const applicantNotificationId = await createNotification({
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: NOTIFICATION_ACTION.PARTICIPATION_REJECTED.ID,
    status: null,
    message: applicantMessage,
    senderId: HERMYX_SYSTEM_ID,
    receiverId: mission.owner_id,
    payload: { associated_mission_id: mission.mid },
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
  const report = await getReportOrThrow(reportId);
  if (report.status === REPORT_STATUS.ANSWERED.ID) {
    throw new AppError(messages.REPORT_ALREADY_ANSWERED, 409);
  }
  if (!REPORT_TYPE[report.type].CAN_BE_DISMISSED) {
    throw new AppError(messages.INCORRECT_ANSWER_FOR_REPORT, 409);
  }

  const closedReport = await closeReportAndConversation(
    reportId,
    REPORT_DECISION.DISMISS.ID,
    reason,
    adminId,
  );

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
    const notificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.REPORT_DISMISSED.ID,
      status: null,
      message,
      senderId: HERMYX_SYSTEM_ID,
      receiverId: report.sender_id,
      payload: { associated_mission_id: mission.mid },
    });
    emitToUser(report.sender_id, 'dispute:dismissed', {
      notificationId,
      missionId: mission.mid,
      missionTitle: mission.title,
      message,
    });
  }

  return closedReport;
};
