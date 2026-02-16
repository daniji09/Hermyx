import {
  createInvitation as _createInvitation,
  findByIid,
  updateInvitationStatus,
} from '../models/invitation.model';
import missionModel from '../models/mission.model';
import { addParticipant } from '../models/mission_participation.model';

//Receives missionId, senderId and receiverId, prepares the data, and create it in the model.
const createInvitation = async (req, res) => {
  const { missionId, senderId, receiverId } = req.body;

  if (senderId === receiverId) {
    return res.status(400).json({ error: "You can't invite yourself" });
  }

  try {
    const invitationData = {
      missionId,
      senderId,
      receiverId,
    };

    const newInvitationId = await _createInvitation(invitationData);

    return res.status(201).json(newInvitationId);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Database error' });
  }
};

/*Receive invitationId and the response (accepted or rejected). The invitation must exist, the recipient must be logged in, and the mission must be pending. 
If rejected, simply update the status. If not, check that there is a vacancy. If there is, add it to the list and update the status of the invitation.*/
const respondToInvitation = async (req, res) => {
  const { invitationId } = req.params;
  const { response } = req.body;

  const userId = req.user.uid;

  try {
    const invitation = await findByIid(invitationId);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.receiver_id !== userId) {
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
      return res.status(200).json({ message: 'Invitation rejected' });
    } else if (response === 'accept') {
      const missionId = invitation.associated_mission_id;

      const [mission, participants] = await Promise.all([
        missionModel.getById(missionId),
        missionModel.getParticipantsForRelease(missionId),
      ]);

      if (mission.vacancies <= participants.length) {
        return res
          .status(409)
          .json({ error: 'There are no vacancies available' });
      }

      await addParticipant(missionId, invitation.receiver_id);

      await updateInvitationStatus(invitationId, 'accepted');

      return res
        .status(200)
        .json({ message: 'Adventurer successfully added ' });
    } else {
      return res.status(400).json({ error: 'Invalid response action' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error processing the request' });
  }
};

export default {
  createInvitation,
  respondToInvitation,
};
