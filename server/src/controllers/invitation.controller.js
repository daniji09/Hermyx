import {
  createInvitation as _createInvitation,
  findByIid,
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
} from '../models/mission.model.js';
import {
  addParticipant,
  getById as getMissionParticipationById,
} from '../models/mission_participation.model.js';
import { emitToUser } from '../services/socket.service.js';

export const getMyInvitations = async (req, res) => {
  try {
    const invitations = await getByRecipientId(req.user.uid);
    return res.status(200).json({ invitations });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
};

export const markMyInvitationAsSeen = async (req, res) => {
  const { invitationId } = req.params;

  try {
    const invitation = await findByIid(invitationId);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.recipient_id !== req.user.uid) {
      return res.status(403).json({
        error: 'You do not have permission to update this invitation.',
      });
    }

    const updatedInvitation = await markAsSeen(invitationId);
    return res.status(200).json({ invitation: updatedInvitation });
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

    const type =
      mission.owner_id === senderId
        ? 'applicant_to_adventurer'
        : 'adventurer_to_applicant';

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

    const adventurerId =
      type === 'adventurer_to_applicant' ? senderId : receiverId;

    if (mission.total_vacancies <= mission.occupied_vacancies) {
      return res.status(409).json({ error: 'There are no vacancies available' });
    }

    const alreadyJoined = await getMissionParticipationById(
      missionId,
      adventurerId,
    );
    if (alreadyJoined >= 1) {
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

    const newInvitationId = await _createInvitation(invitationData);

    emitToUser(receiverId, 'invitation:created', {
      invitationId: newInvitationId,
      missionId,
      missionTitle: mission.title,
      senderId,
      senderUsername: req.user.username,
      receiverId,
      type,
      message,
    });

    return res.status(201).json(newInvitationId);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
};

/*Receive invitationId and the response (accepted or rejected). The invitation must exist, the recipient must be logged in, and the mission must be pending. 
If rejected, simply update the status. If not, check that there is a vacancy. If there is, add it to the list and update the status of the invitation.*/
export const respondToInvitation = async (req, res) => {
  const { invitationId } = req.params;
  const { response } = req.body;

  const userId = req.user.uid;

  try {
    const invitation = await findByIid(invitationId);

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

    if (response === 'rejected') {
      await updateInvitationStatus(invitationId, 'rejected');
      await markAsSeen(invitationId);
      return res.status(200).json({ message: 'Invitation rejected' });
    } else if (response === 'accepted' || response === 'accept') {
      const missionId = invitation.associated_mission_id;
      const adventurerId =
        invitation.type === 'adventurer_to_applicant'
          ? invitation.sender_id
          : invitation.recipient_id;

      const [mission, participants] = await Promise.all([
        getById(missionId),
        getParticipantsForRelease(missionId),
      ]);

      if (mission.total_vacancies <= participants.length) {
        return res
          .status(409)
          .json({ error: 'There are no vacancies available' });
      }

      const alreadyJoined = await getMissionParticipationById(
        missionId,
        adventurerId,
      );
      if (alreadyJoined >= 1) {
        return res
          .status(409)
          .json({ error: 'Adventurer already joined this mission' });
      }

      await addParticipant(missionId, adventurerId);
      await adventurerJoined(missionId);

      await updateInvitationStatus(invitationId, 'accepted');
      await markAsSeen(invitationId);

      return res.status(200).json({ message: 'Adventurer successfully added' });
    } else {
      return res.status(400).json({ error: 'Invalid response action' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error processing the request' });
  }
};
