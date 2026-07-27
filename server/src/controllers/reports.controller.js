import { messages } from '@hermyx/shared';
import {
  getById,
  syncMissionCompletionStatus,
} from '../models/mission.model.js';
import { getById as getUserById } from './../models/app_user.model.js';
import {
  approveParticipation,
  getVacancyById,
  markVacancyAsPaidOut,
  releaseParticipation,
  reopenParticipation,
} from './../models/mission_participation.model.js';
import {
  checkActiveReport,
  closeReport,
  createReport,
  getReports as getAllReports,
  getReportById,
} from '../models/report.model.js';
import { REPORT_TYPE } from '@hermyx/shared/utils/reports.utils.js';
import { createNotification } from '../models/notification.model.js';
import { emitToUser } from './../services/socket.service.js';
import {
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_TYPE,
} from '@hermyx/shared/utils/notifications.utils.js';
import {
  MISSION_LIFE_CYCLE,
  VACANCY_LIFE_CYCLE,
} from '@hermyx/shared/utils/missions.utils.js';
import { createTransfer } from '../services/payment.service.js';
import { createMissionPayment } from '../models/mission_payment.model.js';
import {
  HERMYX_TRANSACTION_ID,
  TRANSACTION_TYPE,
} from '@hermyx/shared/utils/payment.utils.js';

/// GET
// Get report by id
export const getReport = async (req, res) => {
  const { id } = req.params;

  try {
    // Gets all reports filtering what is needed
    const report = await getReportById(id);
    if (report) {
      // Pagination object is built
      return res.status(200).json({ report });
    } else
      return res.status(404).json({
        errors: { general: [messages.REPORT_NOT_FOUND] },
      });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Get all reports
export const getReports = async (req, res) => {
  const pagination = req.pagination;
  const { sortByDate, status, type } = req.query;
  const filters = { sortByDate, status, type };

  try {
    // Gets all reports filtering what is needed
    const { rows: reports, totalCount } = await getAllReports({
      pagination,
      filters,
    });

    const totalItems = parseInt(totalCount);

    if (reports) {
      const totalPages = Math.ceil(totalItems / pagination.limit);
      const hasMore = pagination.page < totalPages;

      // Pagination object is built
      return res.status(200).json({
        reports,
        pagination: {
          currentPage: pagination.page,
          totalPages: totalPages,
          totalItems: totalItems,
          hasMore: hasMore,
        },
      });
    } else
      return res.status(404).json({
        errors: { general: [messages.REPORTS_NOT_FOUND] },
      });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

/// POST
// Dispute an adventurer
export const disputeAdventurer = async (req, res) => {
  const { message, mid, vacancyId } = req.body;
  const userId = req.user.uid;
  try {
    // Gets mission
    const mission = await getById(mid);
    if (!mission)
      return res
        .status(404)
        .json({ errors: { general: [messages.MISSION_NOT_FOUND] } });
    if (mission.owner_id !== userId)
      return res
        .status(403)
        .json({ errors: { general: [messages.UNAUTHORIZED_ERROR] } });

    // Gets vacancy
    const vacancy = await getVacancyById(mid, vacancyId);
    if (!mission)
      return res
        .status(404)
        .json({ errors: { general: [messages.VACANCY_NOT_FOUND] } });
    if (vacancy.mid !== mid)
      return res
        .status(400)
        .json({ errors: { general: [messages.VACANCY_NOT_IN_MISSION] } });

    // Gets adventurer
    const adventurer = await getUserById(vacancy.adventurer_id);
    if (!adventurer)
      return res
        .status(404)
        .json({ errors: { general: [messages.USER_NOT_FOUND] } });

    // Searches for active report by the same applicant to the same adventurer
    const activeReport = await checkActiveReport({
      senderId: userId,
      type: REPORT_TYPE.REPORT_ADVENTURER.ID,
      payload: {
        missionId: mid,
        vacancyId,
      },
    });
    if (activeReport > 0)
      return res
        .status(409)
        .json({ errors: { general: [messages.ADVENTURER_ALREADY_REPORTED] } });

    // Creates report
    const report = await createReport({
      senderId: userId,
      message,
      type: REPORT_TYPE.REPORT_ADVENTURER.ID,
      payload: {
        associated_mission_id: mid,
        associated_vacancy_id: vacancyId,
      },
    });

    // Notifies the adventurer
    const notificationMessage = `You have been reported by the applicant of the ${mission.title} mission.`;
    const notificationId = await createNotification({
      type: NOTIFICATION_TYPE.REPORT.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.ADVENTURER_REPORT.ID,
      status: null,
      message: notificationMessage,
      senderId: userId,
      receiverId: vacancy.adventurer_id,
      payload: {
        associated_mission_id: mission.mid,
        associated_vacancy_id: vacancyId,
        associated_report_id: report.rid,
      },
    });
    emitToUser(vacancy.adventurer_id, 'mission:edited', {
      notificationId,
      missionId: mission.mid,
      vacancyId: vacancyId,
      missionTitle: mission.title,
      senderId: userId,
      senderUsername: req.user.username,
      receiverId: vacancy.adventurer_id,
      type: NOTIFICATION_TYPE.REPORT.ID,
      message: notificationMessage,
    });

    return res.status(200).json({});
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Report a user
export const reportUser = async (req, res) => {
  const { message, uid } = req.body;
  const userId = req.user.uid;
  try {
    // Gets user
    const user = await getUserById(uid);
    if (!user)
      return res
        .status(404)
        .json({ errors: { general: [messages.USER_NOT_FOUND] } });

    // Searches for active report by the same user to the same user
    const activeReport = await checkActiveReport({
      senderId: userId,
      type: REPORT_TYPE.REPORT_PROFILE.ID,
      payload: {
        userId: uid,
      },
    });
    if (activeReport > 0)
      return res
        .status(409)
        .json({ errors: { general: [messages.USER_ALREADY_REPORTED] } });

    // Creates report
    await createReport({
      senderId: userId,
      message,
      type: REPORT_TYPE.REPORT_PROFILE.ID,
      payload: {
        associated_user_id: uid,
      },
    });

    return res.status(200).json({});
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Report a mission
export const reportMission = async (req, res) => {
  const { message, mid } = req.body;
  const userId = req.user.uid;
  try {
    // Gets mission
    const mission = await getById(mid);
    if (!mission)
      return res
        .status(404)
        .json({ errors: { general: [messages.MISSION_NOT_FOUND] } });
    if (mission.owner_id === userId)
      return res
        .status(403)
        .json({ errors: { general: [messages.UNAUTHORIZED_ERROR] } });

    // Checks it has not been already successfully reported
    if (mission.status === MISSION_LIFE_CYCLE.REPORTED.ID)
      return res
        .status(409)
        .json({ errors: { general: [messages.MISSION_CLOSED_BY_REPORT] } });

    // Searches for active report by the same user to the same mission
    const activeReport = await checkActiveReport({
      senderId: userId,
      type: REPORT_TYPE.REPORT_MISSION.ID,
      payload: {
        missionId: mid,
      },
    });
    if (activeReport > 0)
      return res
        .status(409)
        .json({ errors: { general: [messages.MISSION_ALREADY_REPORTED] } });

    // Creates report
    await createReport({
      senderId: userId,
      message,
      type: REPORT_TYPE.REPORT_MISSION.ID,
      payload: {
        associated_mission_id: mid,
      },
    });

    return res.status(200).json({});
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Accept adventurer's work
export const acceptAdventurersWork = async (req, res) => {
  const { rid } = req.params;
  const userId = req.user.uid;

  try {
    // Gets report
    const report = await getReportById(rid);
    if (!report)
      return res
        .status(404)
        .json({ errors: { general: [messages.REPORT_NOT_FOUND] } });

    // Gets mission
    const mission = await getById(report.payload.associated_mission_id);
    if (!mission)
      return res
        .status(404)
        .json({ errors: { general: [messages.MISSION_NOT_FOUND] } });

    // Checks it has not been already successfully reported
    if (mission.status === MISSION_LIFE_CYCLE.REPORTED.ID)
      return res
        .status(409)
        .json({ errors: { general: [messages.MISSION_CLOSED_BY_REPORT] } });

    // Gets vacancy
    const vacancy = await getVacancyById(
      report.payload.associated_mission_id,
      report.payload.associated_vacancy_id,
    );
    if (!vacancy)
      return res
        .status(404)
        .json({ errors: { general: [messages.VACANCY_NOT_FOUND] } });

    // Checks vacancy is in mission
    if (vacancy.mid !== report.payload.associated_mission_id)
      return res.status(409).json({ error: messages.VACANCY_NOT_IN_MISSION });

    // Checks if vacancy is disputed
    if (vacancy.status !== VACANCY_LIFE_CYCLE.IN_DISPUTE.ID)
      return res.status(409).json({ error: messages.VACANCY_NOT_DISPUTED });

    // Work is accepted
    await approveParticipation(
      report.payload.associated_mission_id,
      vacancy.adventurer_id,
    );

    // Reward is payed
    const adventurer = await getUserById(vacancy.adventurer_id);
    if (!adventurer)
      return res
        .status(404)
        .json({ errors: { general: [messages.USER_NOT_FOUND] } });
    if (adventurer.stripe_connected_id) {
      const transferData = {
        amount: Math.round(vacancy.monetary_reward * 100),
        currency: 'eur',
        destination: adventurer.stripe_connected_id,
        description: `mission_payed`,
        transfer_group: `mission_${report.payload.associated_mission_id}`,
      };

      const idempotencyKey = `pay_${report.payload.associated_mission_id}_vac_${report.payload.associated_vacancy_id}`;
      const transfer = await createTransfer(transferData, idempotencyKey);

      // Adds mission payment
      await createMissionPayment({
        mid: report.payload.associated_mission_id,
        vacancy_id: report.payload.associated_vacancy_id,
        sender_id: HERMYX_TRANSACTION_ID,
        receiver_id: adventurer.uid,
        stripe_transaction_id: transfer.id,
        transaction_type: TRANSACTION_TYPE.PAYOUT.ID,
        amount_paid: vacancy.monetary_reward,
      });

      await markVacancyAsPaidOut(report.payload.associated_vacancy_id);
      await releaseParticipation(
        report.payload.associated_mission_id,
        vacancy.adventurer_id,
      );
    }

    // Mission state is synced
    await syncMissionCompletionStatus(report.payload.associated_mission_id);

    // Report is closed
    const reportClosed = await closeReport(rid);
    if (!reportClosed)
      return res.status(404).json({ error: messages.REPORT_NOT_FOUND });

    // Adventurer and applicant are informed
    const approvedMessage = `Your participation in "${mission.title}" was approved by the administration after resolving the dispute. Reward is being payed to you!`;
    const followUpNotificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
      status: null,
      message: approvedMessage,
      senderId: HERMYX_TRANSACTION_ID,
      receiverId: vacancy.adventurer_id,
      payload: { associated_mission_id: report.payload.associated_mission_id },
    });

    emitToUser(
      vacancy.adventurer_id,
      'mission:participation-approved-dispute',
      {
        notificationId: followUpNotificationId,
        type: NOTIFICATION_TYPE.MISSION.ID,
        action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
        missionId: report.payload.associated_mission_id,
        missionTitle: mission.title,
        ownerId: userId,
        ownerUsername: adventurer.username,
        message: approvedMessage,
      },
    );

    const approvedApplicantMessage = `Participation ${vacancy.title} disputed by ${adventurer.username} in mission ${mission.title} was accepted by the administration after they disputed your review. Reward is being payed to the adventurer.`;
    const followUpNotificationApplicantId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
      status: null,
      message: approvedApplicantMessage,
      senderId: HERMYX_TRANSACTION_ID,
      receiverId: mission.owner_id,
      payload: { associated_mission_id: report.payload.associated_mission_id },
    });

    emitToUser(
      vacancy.adventurer_id,
      'mission:participation-approved-dispute',
      {
        notificationId: followUpNotificationApplicantId,
        type: NOTIFICATION_TYPE.MISSION.ID,
        action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
        missionId: report.payload.associated_mission_id,
        missionTitle: mission.title,
        ownerId: userId,
        ownerUsername: adventurer.username,
        message: approvedApplicantMessage,
      },
    );

    return res.status(200).json({});
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Accept adventurer's work
export const rejectAdventurersWork = async (req, res) => {
  const { rid } = req.params;
  const userId = req.user.uid;

  try {
    // Gets report
    const report = await getReportById(rid);
    if (!report)
      return res
        .status(404)
        .json({ errors: { general: [messages.REPORT_NOT_FOUND] } });

    // Gets mission
    const mission = await getById(report.payload.associated_mission_id);
    if (!mission)
      return res
        .status(404)
        .json({ errors: { general: [messages.MISSION_NOT_FOUND] } });

    // Checks it has not been already successfully reported
    if (mission.status === MISSION_LIFE_CYCLE.REPORTED.ID)
      return res
        .status(409)
        .json({ errors: { general: [messages.MISSION_CLOSED_BY_REPORT] } });

    // Gets vacancy
    const vacancy = await getVacancyById(
      report.payload.associated_mission_id,
      report.payload.associated_vacancy_id,
    );
    if (!vacancy)
      return res
        .status(404)
        .json({ errors: { general: [messages.VACANCY_NOT_FOUND] } });

    // Checks vacancy is in mission
    if (vacancy.mid !== report.payload.associated_mission_id)
      return res.status(409).json({ error: messages.VACANCY_NOT_IN_MISSION });

    // Checks if vacancy is disputed
    if (vacancy.status !== VACANCY_LIFE_CYCLE.IN_DISPUTE.ID)
      return res.status(409).json({ error: messages.VACANCY_NOT_DISPUTED });

    const adventurer = await getUserById(vacancy.adventurer_id);
    if (!adventurer)
      return res
        .status(404)
        .json({ errors: { general: [messages.USER_NOT_FOUND] } });

    // Work is rejected
    await reopenParticipation(
      report.payload.associated_mission_id,
      vacancy.adventurer_id,
    );

    // Mission state is synced
    await syncMissionCompletionStatus(report.payload.associated_mission_id);

    // Report is closed
    const reportClosed = await closeReport(rid);
    if (!reportClosed)
      return res.status(404).json({ error: messages.REPORT_NOT_FOUND });

    // Adventurer and applicant are informed
    const rejectedMessage = `Your participation in "${mission.title}" was rejected by the administration after resolving the dispute. Now this vacancy is in progress again, so be sure to accomplish your applicant's goals for your work!`;
    const followUpNotificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_REJECTED.ID,
      status: null,
      message: rejectedMessage,
      senderId: HERMYX_TRANSACTION_ID,
      receiverId: vacancy.adventurer_id,
      payload: { associated_mission_id: report.payload.associated_mission_id },
    });

    emitToUser(
      vacancy.adventurer_id,
      'mission:participation-rejected-dispute',
      {
        notificationId: followUpNotificationId,
        type: NOTIFICATION_TYPE.MISSION.ID,
        action: NOTIFICATION_ACTION.PARTICIPATION_REJECTED.ID,
        missionId: report.payload.associated_mission_id,
        missionTitle: mission.title,
        ownerId: userId,
        ownerUsername: adventurer.username,
        message: rejectedMessage,
      },
    );

    const rejectedApplicantMessage = `Participation ${vacancy.title} disputed by ${adventurer.username} in mission ${mission.title} was rejected by the administration after they disputed your review. Now this vacancy is in progress again, so be sure to guide your adventurer again.`;
    const followUpNotificationApplicantId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_REJECTED.ID,
      status: null,
      message: rejectedApplicantMessage,
      senderId: HERMYX_TRANSACTION_ID,
      receiverId: mission.owner_id,
      payload: { associated_mission_id: report.payload.associated_mission_id },
    });

    emitToUser(
      vacancy.adventurer_id,
      'mission:participation-rejected-dispute',
      {
        notificationId: followUpNotificationApplicantId,
        type: NOTIFICATION_TYPE.MISSION.ID,
        action: NOTIFICATION_ACTION.PARTICIPATION_REJECTED.ID,
        missionId: report.payload.associated_mission_id,
        missionTitle: mission.title,
        ownerId: userId,
        ownerUsername: adventurer.username,
        message: rejectedApplicantMessage,
      },
    );

    return res.status(200).json({});
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};
