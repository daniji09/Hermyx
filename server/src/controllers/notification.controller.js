import { messages } from '@hermyx/shared';
import {
  createNotification as _createNotification,
  createMissionNotification,
  findById,
  getByRecipientId,
  hasPendingJoinNotification,
  markAsSeen,
  updateNotificationStatus,
} from '../models/notification.model.js';
import { getById as getUserById } from '../models/app_user.model.js';
import {
  getById,
  syncMissionCompletionStatus,
} from '../models/mission.model.js';
import {
  approveParticipation,
  disputeParticipation,
  getById as getMissionParticipationById,
  getVacancyById,
  joinVacancy,
  reopenParticipation,
  requestParticipationRevision,
} from '../models/mission_participation.model.js';
import { emitToUser } from '../services/socket.service.js';
import {
  MISSIONS_LIFE_CYCLE,
  VACANCY_LIFE_CYCLE,
} from '@hermyx/shared/utils/missions.lifecycle.js';

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await getByRecipientId(req.user.uid);
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
};

export const markMyNotificationAsSeen = async (req, res) => {
  const { notificationId } = req.params;

  try {
    const notification = await findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipient_id !== req.user.uid) {
      return res.status(403).json({
        error: 'You do not have permission to update this notification.',
      });
    }

    const updatedNotification = await markAsSeen(notificationId);
    return res.status(200).json({ notification: updatedNotification });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
};

// Receives missionId, senderId and receiverId, prepares the data, and creates a notification.
export const createNotification = async (req, res) => {
  const { missionId, receiverId, vacancyId, message } = req.body;
  const senderId = req.user.uid;

  if (senderId === receiverId) {
    return res.status(400).json({ error: "You can't invite yourself" });
  }

  try {
    const [mission, receiver, vacancy] = await Promise.all([
      getById(missionId),
      getUserById(receiverId),
      getVacancyById(missionId, vacancyId),
    ]);

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    if (!vacancy) {
      return res.status(404).json({ error: messages.VACANCY_NOT_FOUND });
    }

    if (vacancy.adventurer_id !== null) {
      return res
        .status(409)
        .json({ error: 'This vacancy is already occupied.' });
    }

    if (!MISSIONS_LIFE_CYCLE[mission.status].CAN_ACCEPT_ADVENTURERS) {
      return res.status(409).json({
        error: messages.MISSION_NOT_ACCEPTING_ADVENTURERS,
      });
    }

    const type = 'invitation';
    const action =
      mission.owner_id === senderId ? 'mission_invite' : 'join_request';

    const hasPending = await hasPendingJoinNotification(
      missionId,
      senderId,
      receiverId,
      vacancyId,
    );

    if (hasPending) {
      return res.status(409).json({
        error: 'There is already a pending notification for this user.',
      });
    }

    const adventurerId = mission.owner_id === senderId ? receiverId : senderId;

    if (mission.total_vacancies <= mission.occupied_vacancies) {
      return res
        .status(409)
        .json({ error: 'There are no vacancies available' });
    }

    const alreadyJoined = await getMissionParticipationById(
      missionId,
      adventurerId,
    );
    if (alreadyJoined) {
      return res
        .status(409)
        .json({ error: 'Adventurer already joined this mission' });
    }

    const notificationData = {
      missionId,
      senderId,
      receiverId,
      type,
      action,
      message,
      payload: { vacancyId: vacancyId },
    };

    const newNotificationId = await _createNotification(notificationData);

    emitToUser(receiverId, 'notification:created', {
      notificationId: newNotificationId,
      missionId,
      vacancyId,
      missionTitle: mission.title,
      senderId,
      senderUsername: req.user.username,
      receiverId,
      type,
      message,
    });

    return res.status(201).json(newNotificationId);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
};

const respondToParticipationReview = async ({
  notification,
  response,
  userId,
  username,
  notificationId,
  res,
}) => {
  const missionId = notification.associated_mission_id;
  const mission = await getById(missionId);

  if (!mission) {
    return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
  }

  if (mission.owner_id !== userId) {
    return res.status(403).json({ error: messages.UNAUTHORIZED_ERROR });
  }

  if (!MISSIONS_LIFE_CYCLE[mission.status].ADVENTURERS_CAN_SUBMIT) {
    return res.status(409).json({ error: messages.MISSION_NOT_IN_PROGRESS });
  }

  const participation = await getMissionParticipationById(
    missionId,
    notification.sender_id,
  );

  if (!participation) {
    return res
      .status(404)
      .json({ error: messages.MISSION_PARTICIPATION_NOT_FOUND });
  }

  if (participation.status !== VACANCY_LIFE_CYCLE.SUBMITTED.ID) {
    return res
      .status(409)
      .json({ error: messages.MISSION_PARTICIPATION_ALREADY_REVIEWED });
  }

  if (response === 'disputed') {
    const attempt = Number(notification.payload?.attempt || 1);
    if (attempt <= 1) {
      return res.status(409).json({
        error: messages.MISSION_PARTICIPATION_DISPUTE_REQUIRES_RETRY,
      });
    }

    // Checks if vacancy can be in dispute by states
    if (
      !VACANCY_LIFE_CYCLE[participation.status].VALID_NEXT_STATES.includes(
        VACANCY_LIFE_CYCLE.IN_DISPUTE.ID,
      )
    )
      return res
        .status(400)
        .json({ error: messages.CANNOT_DISPUTE_PARTICIPATION_STATE });

    await disputeParticipation(missionId, notification.sender_id);
    await syncMissionCompletionStatus(missionId);
    await updateNotificationStatus(notificationId, 'disputed');
    await markAsSeen(notificationId);

    const disputeMessage = `Your participation in "${mission.title}" was disputed by ${username}.`;
    const followUpNotificationId = await createMissionNotification({
      missionId,
      senderId: userId,
      receiverId: notification.sender_id,
      kind: 'informational',
      action: 'participation_disputed',
      message: disputeMessage,
    });

    emitToUser(notification.sender_id, 'mission:participation-disputed', {
      notificationId: followUpNotificationId,
      type: 'mission',
      action: 'participation_disputed',
      missionId,
      missionTitle: mission.title,
      ownerId: userId,
      ownerUsername: username,
      message: disputeMessage,
    });

    return res.status(200).json({
      message: messages.MISSION_PARTICIPATION_DISPUTED_SUCCESSFULLY,
    });
  }

  if (response === 'rejected') {
    // Checks if vacancy can be rejected by states
    if (
      !VACANCY_LIFE_CYCLE[participation.status].VALID_NEXT_STATES.includes(
        VACANCY_LIFE_CYCLE.REJECTED.ID,
      )
    )
      return res
        .status(400)
        .json({ error: messages.CANNOT_REJECT_PARTICIPATION_STATE });

    await requestParticipationRevision(missionId, notification.sender_id);
    await syncMissionCompletionStatus(missionId);
    await updateNotificationStatus(notificationId, 'rejected');
    await markAsSeen(notificationId);

    const revisionMessage = `Your participation in "${mission.title}" was rejected by ${username}. Please accept the revision or open a dispute.`;
    const followUpNotificationId = await createMissionNotification({
      missionId,
      senderId: userId,
      receiverId: notification.sender_id,
      kind: 'actionable',
      action: 'participation_rejection_response',
      status: 'pending',
      message: revisionMessage,
    });

    emitToUser(notification.sender_id, 'mission:participation-revision', {
      notificationId: followUpNotificationId,
      type: 'mission',
      action: 'participation_rejection_response',
      missionId,
      missionTitle: mission.title,
      ownerId: userId,
      ownerUsername: username,
      message: revisionMessage,
    });

    return res.status(200).json({
      message: messages.MISSION_PARTICIPATION_REVISION_REQUESTED_SUCCESSFULLY,
    });
  }
  // Checks if vacancy can be accepted by states
  if (
    !VACANCY_LIFE_CYCLE[participation.status].VALID_NEXT_STATES.includes(
      VACANCY_LIFE_CYCLE.ACCEPTED.ID,
    )
  )
    return res
      .status(400)
      .json({ error: messages.CANNOT_ACCEPT_PARTICIPATION_STATE });

  await approveParticipation(missionId, notification.sender_id);
  await syncMissionCompletionStatus(missionId);
  await updateNotificationStatus(notificationId, 'accepted');
  await markAsSeen(notificationId);

  const approvedMessage = `Your participation in "${mission.title}" was approved by ${username}.`;
  const followUpNotificationId = await createMissionNotification({
    missionId,
    senderId: userId,
    receiverId: notification.sender_id,
    kind: 'informational',
    action: 'participation_approved',
    message: approvedMessage,
  });

  emitToUser(notification.sender_id, 'mission:participation-approved', {
    notificationId: followUpNotificationId,
    type: 'mission',
    action: 'participation_approved',
    missionId,
    missionTitle: mission.title,
    ownerId: userId,
    ownerUsername: username,
    message: approvedMessage,
  });

  return res.status(200).json({
    message: messages.MISSION_PARTICIPATION_APPROVED_SUCCESSFULLY,
  });
};

const respondToParticipationRejection = async ({
  notification,
  response,
  userId,
  username,
  notificationId,
  res,
}) => {
  const missionId = notification.associated_mission_id;
  const mission = await getById(missionId);

  if (!mission) {
    return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
  }

  const participation = await getMissionParticipationById(missionId, userId);

  if (!participation) {
    return res
      .status(404)
      .json({ error: messages.MISSION_PARTICIPATION_NOT_FOUND });
  }

  if (participation !== VACANCY_LIFE_CYCLE.REJECTED.ID) {
    return res
      .status(409)
      .json({ error: messages.MISSION_PARTICIPATION_ALREADY_REVIEWED });
  }

  if (response === 'disputed') {
    // Checks if vacancy can be in dispute by states
    if (
      !VACANCY_LIFE_CYCLE[participation.status].VALID_NEXT_STATES.includes(
        VACANCY_LIFE_CYCLE.IN_DISPUTE.ID,
      )
    )
      return res
        .status(400)
        .json({ error: messages.CANNOT_DISPUTE_PARTICIPATION_STATE });
    await disputeParticipation(missionId, userId);
    const missionAfterSync = await syncMissionCompletionStatus(missionId);
    await updateNotificationStatus(notificationId, 'disputed');
    await markAsSeen(notificationId);

    const disputeMessage = `${username} opened a dispute for "${mission.title}".`;
    const followUpNotificationId = await createMissionNotification({
      missionId,
      senderId: userId,
      receiverId: mission.owner_id,
      kind: 'informational',
      action: 'participation_disputed',
      message: disputeMessage,
    });

    emitToUser(mission.owner_id, 'mission:participation-disputed', {
      notificationId: followUpNotificationId,
      type: 'mission',
      action: 'participation_disputed',
      missionId,
      missionTitle: mission.title,
      adventurerId: userId,
      adventurerUsername: username,
      missionStatus: missionAfterSync?.status,
      message: disputeMessage,
    });

    return res.status(200).json({
      message: messages.MISSION_PARTICIPATION_DISPUTED_SUCCESSFULLY,
    });
  }

  if (response !== 'accepted' && response !== 'accept') {
    return res.status(400).json({ error: 'Invalid response action' });
  }

  // Checks if vacancy can be in progress by states
  if (
    !VACANCY_LIFE_CYCLE[participation.status].VALID_NEXT_STATES.includes(
      VACANCY_LIFE_CYCLE.IN_PROGRESS.ID,
    )
  )
    return res
      .status(400)
      .json({ error: messages.CANNOT_REOPEN_PARTICIPATION_STATE });

  await reopenParticipation(missionId, userId);
  await syncMissionCompletionStatus(missionId);
  await updateNotificationStatus(notificationId, 'accepted');
  await markAsSeen(notificationId);

  return res.status(200).json({
    message: messages.MISSION_PARTICIPATION_REVISION_ACCEPTED_SUCCESSFULLY,
  });
};

const respondToMissionJoinNotification = async ({
  notification,
  response,
  notificationId,
  res,
}) => {
  const missionId = notification.associated_mission_id;
  const mission = await getById(missionId);

  if (!mission) {
    return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
  }

  if (response === 'rejected') {
    await updateNotificationStatus(notificationId, 'rejected');
    await markAsSeen(notificationId);

    const rejectionMessage =
      notification.action === 'mission_invite'
        ? `Your invitation to join "${mission.title}" was rejected.`
        : `Your request to join "${mission.title}" was rejected.`;
    const followUpNotificationId = await createMissionNotification({
      missionId,
      senderId: notification.recipient_id,
      receiverId: notification.sender_id,
      kind: 'informational',
      action: notification.action,
      message: rejectionMessage,
    });

    emitToUser(notification.sender_id, 'notification:created', {
      notificationId: followUpNotificationId,
      type: 'mission',
      kind: 'informational',
      action: notification.action,
      missionId,
      missionTitle: mission.title,
      senderId: notification.recipient_id,
      receiverId: notification.sender_id,
      message: rejectionMessage,
    });

    return res.status(200).json({ message: 'Notification rejected' });
  }

  if (response !== 'accepted' && response !== 'accept') {
    return res.status(400).json({ error: 'Invalid response action' });
  }

  const vacancyId = notification.payload.vacancyId;

  if (!vacancyId) {
    return res.status(409).json({
      error: 'This notification is not associated with a mission vacancy.',
    });
  }

  const vacancy = getVacancyById(missionId, vacancyId);
  // Checks if vacancy can be joined by states
  if (
    !VACANCY_LIFE_CYCLE[vacancy.status].VALID_NEXT_STATES.includes(
      VACANCY_LIFE_CYCLE.JOINED.ID,
    )
  )
    return res
      .status(400)
      .json({ error: messages.CANNOT_JOIN_PARTICIPATION_STATE });

  const adventurerId =
    mission.owner_id === notification.sender_id
      ? notification.recipient_id
      : notification.sender_id;

  const alreadyJoined = await getMissionParticipationById(
    missionId,
    adventurerId,
  );
  if (alreadyJoined) {
    return res
      .status(409)
      .json({ error: 'Adventurer already joined this mission' });
  }

  // Joins vacancy
  const join_vacancy = await joinVacancy(
    missionId,
    notification.payload.vacancyId,
    adventurerId,
  );
  if (join_vacancy < 1)
    return res.status(409).json({ error: messages.VACANCY_NOT_JOINED });

  // If everything is ok, joins mission
  /* Const adventurer_joined = await adventurerJoined(missionId);
  if (adventurer_joined < 1)
    return res.status(409).json({ error: messages.MISSION_NOT_JOINED });*/

  await updateNotificationStatus(notificationId, 'accepted');
  await markAsSeen(notificationId);

  const acceptanceMessage =
    notification.action === 'mission_invite'
      ? `Your invitation to join "${mission.title}" was accepted.`
      : `Your request to join "${mission.title}" was accepted. You are now part of the team.`;
  const followUpNotificationId = await createMissionNotification({
    missionId,
    senderId: notification.recipient_id,
    receiverId: notification.sender_id,
    kind: 'informational',
    action: notification.action,
    message: acceptanceMessage,
  });

  emitToUser(notification.sender_id, 'notification:created', {
    notificationId: followUpNotificationId,
    type: 'mission',
    kind: 'informational',
    action: notification.action,
    missionId,
    missionTitle: mission.title,
    senderId: notification.recipient_id,
    receiverId: notification.sender_id,
    message: acceptanceMessage,
  });

  return res.status(200).json({ message: 'Adventurer successfully added' });
};

/*Receives a notification id and response. Business behavior is selected by action.*/
export const respondToNotification = async (req, res) => {
  const { notificationId } = req.params;
  const { response } = req.body;

  const userId = req.user.uid;

  try {
    const notification = await findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.recipient_id !== userId) {
      return res.status(403).json({
        error: 'You do not have permission to respond to this notification.',
      });
    }

    if (notification.status !== 'pending') {
      return res.status(400).json({
        error: `This notification has already been ${notification.status}.`,
      });
    }

    if (notification.action === 'participation_review') {
      return await respondToParticipationReview({
        notification,
        response,
        userId,
        username: req.user.username,
        notificationId,
        res,
      });
    }

    if (notification.action === 'participation_rejection_response') {
      return await respondToParticipationRejection({
        notification,
        response,
        userId,
        username: req.user.username,
        notificationId,
        res,
      });
    }

    if (
      notification.action === 'join_request' ||
      notification.action === 'mission_invite'
    ) {
      return await respondToMissionJoinNotification({
        notification,
        response,
        notificationId,
        res,
      });
    }

    return res.status(400).json({ error: 'Invalid notification action' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error processing the request' });
  }
};
