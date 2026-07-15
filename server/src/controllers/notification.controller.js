import { messages } from '@hermyx/shared';
import {
  createNotification,
  findById,
  getByRecipientId,
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
  markVacancyAsPaidOut,
  releaseParticipation,
  reopenParticipation,
  requestParticipationRevision,
  updateVacancyMonetaryReward,
} from '../models/mission_participation.model.js';
import { emitToUser } from '../services/socket.service.js';
import {
  MISSION_LIFE_CYCLE,
  VACANCY_LIFE_CYCLE,
} from '@hermyx/shared/utils/missions.utils.js';
import {
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
} from '@hermyx/shared/utils/notifications.utils.js';
import { createTransfer } from '../services/payment.service.js';

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

const respondToParticipationReview = async ({
  notification,
  response,
  userId,
  username,
  notificationId,
  res,
}) => {
  const missionId = notification.payload.associated_mission_id;
  const mission = await getById(missionId);

  if (!mission) {
    return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
  }

  if (mission.owner_id !== userId) {
    return res.status(403).json({ error: messages.UNAUTHORIZED_ERROR });
  }

  if (!MISSION_LIFE_CYCLE[mission.status].ADVENTURERS_CAN_SUBMIT) {
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
    await updateNotificationStatus(
      notificationId,
      NOTIFICATION_STATUS.DISPUTED.ID,
    );
    await markAsSeen(notificationId);

    const disputeMessage = `Your participation in "${mission.title}" was disputed by ${username}.`;
    const followUpNotificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_DISPUTED.ID,
      status: null,
      message: disputeMessage,
      senderId: userId,
      receiverId: notification.sender_id,
      payload: { associated_mission_id: missionId },
    });

    emitToUser(notification.sender_id, 'mission:participation-disputed', {
      notificationId: followUpNotificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_DISPUTED.ID,
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
    await updateNotificationStatus(
      notificationId,
      NOTIFICATION_STATUS.REJECTED.ID,
    );
    await markAsSeen(notificationId);

    const revisionMessage = `Your participation in "${mission.title}" was rejected by ${username}. Please accept the revision or open a dispute.`;
    const followUpNotificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.ACTIONABLE.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_REJECTION_RESPONSE.ID,
      status: NOTIFICATION_STATUS.PENDING.ID,
      message: revisionMessage,
      senderId: userId,
      receiverId: notification.sender_id,
      payload: { associated_mission_id: missionId },
    });

    emitToUser(notification.sender_id, 'mission:participation-revision', {
      notificationId: followUpNotificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_REJECTION_RESPONSE.ID,
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
  // Reward is payed
  const adventurer = await getUserById(notification.sender_id);
  if (adventurer.stripe_connected_id) {
    const transferData = {
      amount: Math.round(participation.monetary_reward * 100),
      currency: 'eur',
      destination: adventurer.stripe_connected_id,
      description: `mission_payed`,
      transfer_group: `mission_${missionId}`,
    };

    const idempotencyKey = `pay_${missionId}_vac_${participation.id}`;
    await createTransfer(transferData, idempotencyKey);

    await markVacancyAsPaidOut(participation.id);
    await releaseParticipation(missionId, notification.sender_id);
  }

  await updateNotificationStatus(
    notificationId,
    NOTIFICATION_STATUS.ACCEPTED.ID,
  );
  await markAsSeen(notificationId);

  const approvedMessage = `Your participation in "${mission.title}" was approved by ${username}.`;
  const followUpNotificationId = await createNotification({
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
    status: null,
    message: approvedMessage,
    senderId: userId,
    receiverId: notification.sender_id,
    payload: { associated_mission_id: missionId },
  });

  emitToUser(notification.sender_id, 'mission:participation-approved', {
    notificationId: followUpNotificationId,
    type: NOTIFICATION_TYPE.MISSION.ID,
    action: NOTIFICATION_ACTION.PARTICIPATION_APPROVED.ID,
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
  const missionId = notification.payload.associated_mission_id;
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

  if (participation.status !== VACANCY_LIFE_CYCLE.REJECTED.ID) {
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
    await updateNotificationStatus(
      notificationId,
      NOTIFICATION_STATUS.DISPUTED.ID,
    );
    await markAsSeen(notificationId);

    const disputeMessage = `${username} opened a dispute for "${mission.title}".`;
    const followUpNotificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_DISPUTED.ID,
      status: null,
      message: disputeMessage,
      senderId: userId,
      receiverId: mission.owner_id,
      payload: { associated_mission_id: missionId },
    });

    emitToUser(mission.owner_id, 'mission:participation-disputed', {
      notificationId: followUpNotificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_DISPUTED.ID,
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
    return res.status(400).json({ error: messages.INVALID_RESPONSE_ACTION });
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
  await updateNotificationStatus(
    notificationId,
    NOTIFICATION_STATUS.ACCEPTED.ID,
  );
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
  const missionId = notification.payload.associated_mission_id;
  const mission = await getById(missionId);

  if (!mission) {
    return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
  }

  if (response === 'rejected') {
    await updateNotificationStatus(
      notificationId,
      NOTIFICATION_STATUS.REJECTED.ID,
    );
    await markAsSeen(notificationId);

    const rejectionMessage =
      notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
        ? `Your invitation to join "${mission.title}" was rejected.`
        : `Your request to join "${mission.title}" was rejected.`;
    const followUpNotificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: notification.action,
      status: null,
      message: rejectionMessage,
      senderId: notification.recipient_id,
      receiverId: notification.sender_id,
      payload: { associated_mission_id: missionId },
    });

    emitToUser(notification.sender_id, 'notification:created', {
      notificationId: followUpNotificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
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
    return res.status(400).json({ error: messages.INVALID_RESPONSE_ACTION });
  }

  const vacancyId = notification.payload.associated_vacancy_id;

  if (!vacancyId) {
    return res.status(409).json({
      error: messages.NOTIFICATION_NOT_ASSOCIATED_WITH_VACANCY,
    });
  }

  const vacancy = await getVacancyById(missionId, vacancyId);
  console.log(vacancy);
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
    return res.status(409).json({ error: messages.MISSION_ALREADY_JOINED });
  }

  // Joins vacancy
  const join_vacancy = await joinVacancy(
    missionId,
    notification.payload.associated_vacancy_id,
    adventurerId,
  );
  if (join_vacancy < 1)
    return res.status(409).json({ error: messages.VACANCY_NOT_JOINED });

  await updateNotificationStatus(
    notificationId,
    NOTIFICATION_STATUS.ACCEPTED.ID,
  );
  await markAsSeen(notificationId);

  const acceptanceMessage =
    notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
      ? `Your invitation to join "${mission.title}" was accepted.`
      : `Your request to join "${mission.title}" was accepted. You are now part of the team.`;
  const followUpNotificationId = await createNotification({
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: notification.action,
    status: null,
    message: acceptanceMessage,
    senderId: notification.recipient_id,
    receiverId: notification.sender_id,
    payload: { associated_mission_id: missionId },
  });

  emitToUser(notification.sender_id, 'notification:created', {
    notificationId: followUpNotificationId,
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: notification.action,
    missionId,
    missionTitle: mission.title,
    senderId: notification.recipient_id,
    receiverId: notification.sender_id,
    message: acceptanceMessage,
  });

  return res.status(200).json({ message: 'Adventurer successfully added' });
};

const respondToVacancyMonetaryRewardEdition = async ({
  notification,
  response,
  userId,
  username,
  notificationId,
  res,
}) => {
  const missionId = notification.payload.associated_mission_id;
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

  // Checks that mission is in a editable status
  if (!MISSION_LIFE_CYCLE[mission.status].CAN_EDIT)
    return res.status(400).json({
      errors: { general: [messages.CANNOT_EDIT_MISSION] },
    });

  if (response === 'rejected') {
    await updateNotificationStatus(
      notificationId,
      NOTIFICATION_STATUS.REJECTED.ID,
    );
    await markAsSeen(notificationId);

    const rejectionMessage = `${username} rejected your new monetary reward offer for "${mission.title}": ${participation.monetary_reward}€ -> ${notification.payload.new_offer}€.`;
    const followUpNotificationId = await createNotification({
      type: NOTIFICATION_TYPE.MISSION.ID,
      kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
      action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
      status: NOTIFICATION_STATUS.REJECTED.ID,
      message: rejectionMessage,
      senderId: userId,
      receiverId: mission.owner_id,
      payload: {
        associated_mission_id: missionId,
        associated_vacancy_id: notification.payload.associated_vacancy_id,
      },
    });

    emitToUser(mission.owner_id, 'mission:participation-negotiation-rejected', {
      notificationId: followUpNotificationId,
      type: NOTIFICATION_TYPE.MISSION.ID,
      action: NOTIFICATION_ACTION.PARTICIPATION_DISPUTED.ID,
      missionId,
      missionTitle: mission.title,
      adventurerId: userId,
      adventurerUsername: username,
      message: rejectionMessage,
    });

    return res.status(200).json({
      message: messages.MISSION_PARTICIPATION_DISPUTED_SUCCESSFULLY,
    });
  }

  if (response !== 'accepted' && response !== 'accept') {
    return res.status(400).json({ error: messages.INVALID_RESPONSE_ACTION });
  }

  await updateVacancyMonetaryReward(
    notification.payload.associated_vacancy_id,
    notification.payload.new_offer,
  );
  await updateNotificationStatus(
    notificationId,
    NOTIFICATION_STATUS.ACCEPTED.ID,
  );
  await markAsSeen(notificationId);

  /*
  // Monetary change affects mission, if new offer is lower, a refund is made
  if (participation.monetary_reward > notification.payload.new_offer) {
  }
*/
  const acceptMessage = `${username} accepted your new monetary reward offer for "${mission.title}": ${participation.monetary_reward}€ -> ${notification.payload.new_offer}€.`;
  const followUpNotificationId = await createNotification({
    type: NOTIFICATION_TYPE.MISSION.ID,
    kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
    action: NOTIFICATION_ACTION.MISSION_EDIT.ID,
    status: NOTIFICATION_STATUS.ACCEPTED.ID,
    message: acceptMessage,
    senderId: userId,
    receiverId: mission.owner_id,
    payload: {
      associated_mission_id: missionId,
      associated_vacancy_id: notification.payload.associated_vacancy_id,
    },
  });

  emitToUser(mission.owner_id, 'mission:participation-negotiation-accepted', {
    notificationId: followUpNotificationId,
    type: NOTIFICATION_TYPE.MISSION.ID,
    action: NOTIFICATION_ACTION.PARTICIPATION_DISPUTED.ID,
    missionId,
    missionTitle: mission.title,
    adventurerId: userId,
    adventurerUsername: username,
    message: acceptMessage,
  });

  return res.status(200).json({
    message: messages.MISSION_PARTICIPATION_REVISION_ACCEPTED_SUCCESSFULLY,
  });
};

/*Receives a notification id and response. Business behavior is selected by action.*/
export const respondToNotification = async (req, res) => {
  const { notificationId } = req.params;
  const { response } = req.body;

  const userId = req.user.uid;

  try {
    const notification = await findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: messages.NOTIFICATION_NOT_FOUND });
    }

    if (notification.recipient_id !== userId) {
      return res.status(403).json({
        error: messages.UNAUTHORIZED_ERROR,
      });
    }

    if (notification.status !== NOTIFICATION_STATUS.PENDING.ID) {
      return res.status(400).json({
        error: messages.NOTIFICATION_NOT_PENDING(notification.status),
      });
    }

    if (notification.action === NOTIFICATION_ACTION.PARTICIPATION_REVIEW.ID) {
      return await respondToParticipationReview({
        notification,
        response,
        userId,
        username: req.user.username,
        notificationId,
        res,
      });
    }

    if (
      notification.action ===
      NOTIFICATION_ACTION.PARTICIPATION_REJECTION_RESPONSE.ID
    ) {
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
      notification.action === NOTIFICATION_ACTION.JOIN_REQUEST.ID ||
      notification.action === NOTIFICATION_ACTION.MISSION_INVITE.ID
    ) {
      return await respondToMissionJoinNotification({
        notification,
        response,
        notificationId,
        res,
      });
    }

    if (notification.action === NOTIFICATION_ACTION.MISSION_EDIT.ID) {
      return await respondToVacancyMonetaryRewardEdition({
        notification,
        response,
        userId,
        username: req.user.username,
        notificationId,
        res,
      });
    }

    return res
      .status(400)
      .json({ error: messages.INVALID_NOTIFICATION_ACTION });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};
