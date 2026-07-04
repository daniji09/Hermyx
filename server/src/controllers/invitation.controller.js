import { messages } from '@hermyx/shared';
import {
  createInvitation as _createInvitation,
  createMissionNotification,
  findById,
  getByRecipientId,
  hasPendingInvitation,
  markAsSeen,
  updateInvitationStatus,
} from '../models/invitation.model.js';
import { getById as getUserById } from '../models/app_user.model.js';
import {
  adventurerJoined,
  getById,
  getParticipantsForRelease,
  updateStatus as updateMissionStatus,
} from '../models/mission.model.js';
import {
  addParticipant,
  approveParticipation,
  getById as getMissionParticipationById,
  rejectParticipation,
} from '../models/mission_participation.model.js';
import { emitToUser } from '../services/socket.service.js';

export const getMyInvitations = async (req, res) => {
  try {
    const notifications = await getByRecipientId(req.user.uid);
    return res.status(200).json({ notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
};

export const markMyInvitationAsSeen = async (req, res) => {
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

//Receives missionId, senderId and receiverId, prepares the data, and create it in the model.
export const createInvitation = async (req, res) => {
  const { missionId, receiverId, message } = req.body;
  const senderId = req.user.uid;

  if (senderId === receiverId) {
    return res.status(400).json({ error: "You can't invite yourself" });
  }

  try {
    const [mission, receiver] = await Promise.all([
      getById(missionId),
      getUserById(receiverId),
    ]);

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    if (mission.status !== 'funded') {
      return res.status(409).json({
        error: messages.MISSION_NOT_ACCEPTING_ADVENTURERS,
      });
    }

    const type = 'invitation';

    const hasPending = await hasPendingInvitation(
      missionId,
      senderId,
      receiverId,
    );

    if (hasPending) {
      return res.status(409).json({
        error: 'There is already a pending invitation for this user.',
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

    const invitationData = {
      missionId,
      senderId,
      receiverId,
      type,
      message,
    };

    const newNotificationId = await _createInvitation(invitationData);

    emitToUser(receiverId, 'invitation:created', {
      notificationId: newNotificationId,
      missionId,
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

/*Receive invitationId and the response (accepted or rejected). The invitation must exist, the recipient must be logged in, and the mission must be pending. 
If rejected, simply update the status. If not, check that there is a vacancy. If there is, add it to the list and update the status of the invitation.*/
export const respondToInvitation = async (req, res) => {
  const { notificationId } = req.params;
  const { response } = req.body;

  const userId = req.user.uid;

  try {
    const invitation = await findById(notificationId);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.recipient_id !== userId) {
      return res.status(403).json({
        error: 'You do not have permission to respond to this invitation.',
      });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({
        error: `This invitation has already been ${invitation.status}.`,
      });
    }

    if (invitation.type === 'mission') {
      const missionId = invitation.associated_mission_id;
      const mission = await getById(missionId);

      if (!mission) {
        return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
      }

      if (mission.owner_id !== userId) {
        return res.status(403).json({
          error: messages.UNAUTHORIZED_ERROR,
        });
      }

      if (mission.status !== 'in_progress') {
        return res.status(409).json({
          error: messages.MISSION_NOT_IN_PROGRESS,
        });
      }

      const participation = await getMissionParticipationById(
        missionId,
        invitation.sender_id,
      );

      if (!participation) {
        return res.status(404).json({
          error: messages.MISSION_PARTICIPATION_NOT_FOUND,
        });
      }

      if (participation.status !== 'submitted') {
        return res.status(409).json({
          error: messages.MISSION_PARTICIPATION_ALREADY_REVIEWED,
        });
      }

      if (response === 'rejected') {
        await rejectParticipation(missionId, invitation.sender_id);
        await updateMissionStatus(missionId, 'in_dispute');
      } else {
        await approveParticipation(missionId, invitation.sender_id);
      }

      await updateInvitationStatus(notificationId, response);
      await markAsSeen(notificationId);

      const missionNotificationMessage =
        response === 'rejected'
          ? `Your participation in "${mission.title}" was rejected by ${req.user.username}. The mission is now in dispute.`
          : `Your participation in "${mission.title}" was approved by ${req.user.username}.`;

      const followUpNotificationId = await createMissionNotification({
        missionId,
        senderId: userId,
        receiverId: invitation.sender_id,
        message: missionNotificationMessage,
      });

      emitToUser(
        invitation.sender_id,
        response === 'rejected'
          ? 'mission:participation-rejected'
          : 'mission:participation-approved',
        {
          notificationId: followUpNotificationId,
          type: 'mission',
          missionId,
          missionTitle: mission.title,
          ownerId: userId,
          ownerUsername: req.user.username,
          message: missionNotificationMessage,
        },
      );

      return res.status(200).json({
        message:
          response === 'rejected'
            ? messages.MISSION_PARTICIPATION_REJECTED_SUCCESSFULLY
            : messages.MISSION_PARTICIPATION_APPROVED_SUCCESSFULLY,
      });
    }

    if (response === 'rejected') {
      await updateInvitationStatus(notificationId, 'rejected');
      await markAsSeen(notificationId);
      return res.status(200).json({ message: 'Invitation rejected' });
    } else if (response === 'accepted' || response === 'accept') {
      const missionId = invitation.associated_mission_id;

      const [mission, participants] = await Promise.all([
        getById(missionId),
        getParticipantsForRelease(missionId),
      ]);

      const adventurerId =
        mission.owner_id === invitation.sender_id
          ? invitation.recipient_id
          : invitation.sender_id;

      if (mission.status !== 'funded') {
        return res.status(409).json({
          error: messages.MISSION_NOT_ACCEPTING_ADVENTURERS,
        });
      }

      if (mission.total_vacancies <= participants.length) {
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

      await addParticipant(missionId, adventurerId);
      await adventurerJoined(missionId);

      await updateInvitationStatus(notificationId, 'accepted');
      await markAsSeen(notificationId);

      return res.status(200).json({ message: 'Adventurer successfully added' });
    } else {
      return res.status(400).json({ error: 'Invalid response action' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error processing the request' });
  }
};
