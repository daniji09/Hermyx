import {
  createInvitation as _createInvitation,
  findByIid,
  updateInvitationStatus,
} from '../models/invitation.model.js';
import {
  adventurerJoined,
  getById,
  getParticipantsForRelease,
} from '../models/mission.model.js';
import {
  addParticipant,
  getById as getMissionParticipationById,
} from '../models/mission_participation.model.js';

//Receives missionId, senderId and receiverId, prepares the data, and create it in the model.
export const createInvitation = async (req, res) => {
  const { missionId, receiverId } = req.body;
  const senderId = req.user.uid;

  if (senderId === receiverId) {
    return res.status(400).json({ error: "You can't invite yourself" });
  }

  try {
    const mission = await getById(missionId);

    if (!mission) {
      return res.status(404).json({ error: 'Mission not found' });
    }

    const type =
      mission.owner_id === senderId
        ? 'applicant_to_adventurer'
        : 'adventurer_to_applicant';

    const invitationData = {
      missionId,
      senderId,
      receiverId,
      type,
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
      return res.status(200).json({ message: 'Invitation rejected' });
    } else if (response === 'accepted' || response === 'accept') {
      const missionId = invitation.associated_mission_id;

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
        invitation.recipient_id,
      );
      if (alreadyJoined >= 1) {
        return res
          .status(409)
          .json({ error: 'Adventurer already joined this mission' });
      }

      await addParticipant(missionId, invitation.recipient_id);
      await adventurerJoined(missionId);

      await updateInvitationStatus(invitationId, 'accepted');

      return res.status(200).json({ message: 'Adventurer successfully added' });
    } else {
      return res.status(400).json({ error: 'Invalid response action' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error processing the request' });
  }
};
