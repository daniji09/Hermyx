import { messages } from '@hermyx/shared';
import { getById } from '../models/mission.model.js';
import { getById as getUserById } from './../models/app_user.model.js';
import { getVacancyById } from './../models/mission_participation.model.js';
import { checkActiveReport, createReport } from '../models/report.model.js';
import { REPORT_TYPE } from '@hermyx/shared/utils/reports.utils.js';
import { createNotification } from '../models/notification.model.js';
import { emitToUser } from './../services/socket.service.js';
import {
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_TYPE,
} from '@hermyx/shared/utils/notifications.utils.js';
import { MISSION_LIFE_CYCLE } from '@hermyx/shared/utils/missions.utils.js';

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
