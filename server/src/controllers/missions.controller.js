//External modules
import { messages } from '@hermyx/shared';
import {
  createMission as _createMission,
  getAllMissionsInDraft as _getAllMissionsInDraft,
  getMissionById as _getMissionById,
  deleteMission as _deleteMission,
  getMissions as _getMissions,
  getById,
  getParticipantsForDisplay,
  getParticipantsForRelease,
  updateMissionStatus,
  getByUidAndTitle,
  closeMission as _closeMission,
  getMissionsFunded as _getMissionsFunded,
  updateMission,
  getMissionParticipation,
  adventurerUnjoined,
} from '../models/mission.model.js';

import {
  deleteUnoccupiedVacancies,
  getById as getMissionParticipationById,
  getVacancy,
  insertVacancies,
  unjoinVacancy,
  updateVacancy,
} from '../models/mission_participation.model.js';
import {
  createInvitation as createInvitationRecord,
  hasPendingInvitation,
} from '../models/invitation.model.js';
import { emitToUser } from '../services/socket.service.js';
import {
  createPaymentIntentNew,
  createRefund,
} from '../services/payment.service.js';

export const getMissionById = async (req, res) => {
  try {
    // Gets the id
    const { id } = req.params;
    const uid = req.user.uid;

    // Searches mission by id
    const [mission, participants] = await Promise.all([
      _getMissionById(id, uid),
      getParticipantsForDisplay(id),
    ]);

    // Returns success or error
    if (!mission) {
      return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
    }

    return res.status(200).json({
      mission: {
        ...mission,
        participants,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

export const getMissions = async (req, res) => {
  const { title } = req.query;
  const pagination = req.pagination;

  try {
    // Gets all missions filtering what is needed
    const { rows: missions, totalCount } = await _getMissions({
      title,
      pagination,
    });

    const totalItems = parseInt(totalCount);

    if (missions) {
      const totalPages = Math.ceil(totalItems / pagination.limit);
      const hasMore = pagination.page < totalPages;

      // Pagination object is built
      return res.status(200).json({
        missions,
        pagination: {
          currentPage: pagination.page,
          totalPages: totalPages,
          totalItems: totalItems,
          hasMore: hasMore,
        },
      });
    } else
      return res.status(404).json({
        errors: { general: [messages.MISSIONS_NOT_FOUND] },
      });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

export const getAllMissionsInDraft = async (req, res) => {
  try {
    const missions = await _getAllMissionsInDraft();
    res.status(200).json({ data: missions });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

export const getMissionsFunded = async (req, res) => {
  const { title } = req.query;
  const pagination = req.pagination;
  const excludeOwnerId = title ? req.user?.uid : undefined;

  try {
    // Gets all missions filtering what is needed
    const { rows: missions, totalCount } = await _getMissionsFunded({
      title,
      pagination,
      excludeOwnerId,
    });

    const totalItems = parseInt(totalCount);

    if (missions) {
      const totalPages = Math.ceil(totalItems / pagination.limit);
      const hasMore = pagination.page < totalPages;

      // Pagination object is built
      return res.status(200).json({
        missions,
        pagination: {
          currentPage: pagination.page,
          totalPages: totalPages,
          totalItems: totalItems,
          hasMore: hasMore,
        },
      });
    } else
      return res.status(404).json({
        errors: { general: [messages.MISSIONS_NOT_FOUND] },
      });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

/*Check whether the user wants to save the creation or create a new mission. 
Depending on that, the fields are checked or not, and the status is updated accordingly.*/
export const createMission = async (req, res) => {
  try {
    const { uid } = req.user;

    const {
      title,
      description,
      vacancies,
      vacanciesData,
      latitude,
      longitude,
      isDraft,
    } = req.body;

    const missionData = {
      title: title || 'Mission not titled',
      description: description || 'No description',
      vacancies: vacancies || 0,
      vacanciesData: vacanciesData || '',
      totalPayment:
        vacanciesData.reduce(
          (sum, vacancy) => sum + Number(vacancy.reward),
          0,
        ) || 0,
      latitude: latitude || null,
      longitude: longitude || null,
      status: isDraft ? 'draft' : 'pending_payment',
      ownerId: uid,
    };

    // Checks if user has a mission already with the same title
    const { hasDuplicate } = await getByUidAndTitle(uid, title);

    if (hasDuplicate)
      return res.status(400).json({
        errors: { general: [messages.MISSION_SAME_TITLE] },
      });

    const newMission = await _createMission(missionData);

    return res.status(201).json({ mission: newMission });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

export const editMission = async (req, res) => {
  try {
    const { uid } = req.user;
    const mission = req.body;

    // Updates new payment
    mission.totalPayment =
      mission.vacanciesData.reduce(
        (sum, vacancy) => sum + Number(vacancy.reward),
        0,
      ) || 0;

    // Gets current mission info
    const currentMission = await _getMissionById(mission.mid);

    // Checks if user has a mission already with the same title and different id
    const { hasDuplicate } = await getByUidAndTitle(
      uid,
      mission.title,
      mission.mid,
    );

    if (hasDuplicate)
      return res.status(400).json({
        errors: { general: [messages.MISSION_SAME_TITLE] },
      });

    // Updates each vacancy of the mission, first, new and existing vacancies are selected
    const newVacancies = mission.vacanciesData.filter(
      (v) => typeof v.id === 'string',
    );
    const existingVacancies = mission.vacanciesData.filter(
      (v) => typeof v.id === 'number',
    );

    // Id array including existing vacancies that stayed
    const existingIds = existingVacancies.map((v) => v.id);

    // New mission info can delete existing vacancies only in opened state
    if (currentMission.status !== 'opened') {
      const originalVacancies = await getMissionParticipation(mission.mid);
      if (existingIds.length < originalVacancies) {
        return res.status(400).json({
          errors: {
            general: [messages.CANNOT_DELETE_EXISTING_VACANCIES],
          },
        });
      }
    }

    // Updates mission
    const updatedMission = await updateMission(mission);

    // First operation, deleting vacancies that are not occupied
    await deleteUnoccupiedVacancies(mission.mid, existingIds);

    // After that, updating existing vacancies
    const updatePromises = existingVacancies.map((vacancy) =>
      updateVacancy(mission.mid, vacancy),
    );
    const updateResults = await Promise.all(updatePromises);
    const vacanciesToNotify = updateResults.filter(
      (res) => res !== undefined && res.adventurer_id !== null,
    );

    // TODO: cuando las notificaciones estén hechas cambiar esto, que esta con invitaciones.
    // La notificación será distinta si se cambia el dinero estando en progreso o cambiando otras en otros estados
    for (const vacancy of vacanciesToNotify) {
      const invitationId = await createInvitationRecord({
        missionId: mission.mid,
        vacancyId: vacancy.id,
        senderId: uid,
        receiverId: vacancy.adventurer_id,
        type: 'adventurer_to_applicant',
        message: 'Your vacant has been modified!',
      });
      emitToUser(mission.owner_id, 'invitation:updated', {
        invitationId,
        missionId: mission.mid,
        vacancyId: vacancy.id,
        missionTitle: mission.title,
        senderId: uid,
        senderUsername: req.user.username,
        receiverId: vacancy.adventurer_id,
        type: 'adventurer_to_applicant',
        message: 'Your vacant has been modified!',
      });
    }

    // Lastly, inserting new vacancies
    await insertVacancies(mission.mid, newVacancies);
    /*TODO: transacciones bancarias (y realmente mejorar las cosas de arriba porque los bucles tienen que 
    estar fuera, pero bueno, eso es de transacciones de bd)
    // Now, checks monetary reward differences, for a possible payment
    if (currentMission.total_payment < mission.totalPayment) {
      const extraAmount = mission.totalPayment - currentMission.total_payment;

      const pi = await createPaymentIntentNew(
        {
          amount: Math.round(extraAmount * 100),
          currency: 'eur',
          customer: req.user.stripe_customer_id,
          automatic_payment_methods: { enabled: true },
          metadata: {
            missionId: mission.mid,
            ownerId: req.user.uid,
            action: 'edit_extra_charge',
          },
        },
        `edit_extra_${mission.mid}_${Date.now()}`,
      );

      return res.status(200).json({
        mission: updatedMission,
        requiresExtraPayment: true,
        clientSecret: pi.client_secret,
        paymentIntentId: pi.id,
      });
    } else if (currentMission.total_payment > mission.totalPayment) {
      const amountToRefund = Math.round(
        Math.abs(currentMission.total_payment - mission.totalPayment) * 100,
      );

      const refund = await createRefund(
        {
          payment_intent: currentMission.stripe_pi_id,
          amount: amountToRefund,
          reason: 'requested_by_customer',
        },
        `refund_edit_${mission.mid}_${Date.now()}`,
      );
      console.log(refund);
      return res.status(200).json({
        mission: updatedMission,
        refunded_amount: refund.amount * 100,
      });
    }
*/
    return res.status(200).json({ mission: updatedMission });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

/*Verify that the owner of the mission is the one deleting it and that at least one person is assigned to close the mission.*/
export const start = async (req, res) => {
  const { missionId } = req.params;
  const userId = req.user.uid;

  try {
    const mission = await getById(missionId);
    if (!mission) {
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });
    }

    if (mission.owner_id !== userId) {
      return res.status(403).json({ error: messages.UNAUTHORIZED_ERROR });
    }

    const currentParticipants = (await getParticipantsForRelease(missionId))
      .length;

    if (currentParticipants === 0) {
      return res
        .status(400)
        .json({ error: messages.START_WITHOUT_ADVENTURERS });
    }

    await updateMissionStatus(missionId, 'in_progress');

    return res.status(200).json({
      status: 'in_progress',
      participants: currentParticipants,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Sends a join request to the mission owner instead of joining immediately
export const joinMission = async (req, res) => {
  const { mid } = req.params;
  const uid = req.user.uid;
  const message = req.body?.message?.trim() || '';
  const vacancyId = req.body?.vacancyId;

  try {
    // Mission is searched
    const mission = await getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission was created by the current user
    if (mission.owner_id === uid)
      return res.status(403).json({ error: messages.JOIN_OWN_MISSION });

    // Checks if mission is already full
    if (mission.occupied_vacancies === mission.total_vacancies)
      return res.status(409).json({
        error: messages.MISSION_FILLED,
      });

    // Checks if user has already joined that mission
    const alreadyJoined = await getMissionParticipationById(mid, uid);
    if (alreadyJoined >= 1)
      return res.status(409).json({ error: messages.MISSION_ALREADY_JOINED });

    // Checks if vacancy exists
    const vacancyExists = await getVacancy(mid, vacancyId);
    if (vacancyExists < 1)
      return res.status(404).json({ error: messages.VACANCY_NOT_FOUND });

    const ownerId = mission.owner_id;
    const pendingRequest = await hasPendingInvitation(mid, uid, ownerId);
    if (pendingRequest) {
      return res.status(409).json({
        error: 'You already sent a join request for this mission.',
      });
    }

    const invitationId = await createInvitationRecord({
      missionId: mid,
      vacancyId: vacancyId,
      senderId: uid,
      receiverId: ownerId,
      type: 'adventurer_to_applicant',
      message,
    });

    emitToUser(ownerId, 'invitation:created', {
      invitationId,
      missionId: mid,
      vacancyId: vacancyId,
      missionTitle: mission.title,
      senderId: uid,
      senderUsername: req.user.username,
      receiverId: ownerId,
      type: 'adventurer_to_applicant',
      message,
    });

    return res.status(201).json({
      message: 'Join request sent successfully',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Sends a join request to the mission owner instead of joining immediately
export const unjoinMission = async (req, res) => {
  const { mid } = req.params;
  const uid = req.user.uid;
  const vacancyId = req.body?.vacancyId;
  console.log(mid, uid, vacancyId);
  try {
    // Mission is searched
    const mission = await getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission is opened, so unjoin can be done
    if (mission.status === 'in_progress') {
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_UNJOIN_IN_PROGRESS_MISSION],
        },
      });
    }

    // Checks if user has actually joined that mission
    const alreadyJoined = await getMissionParticipationById(mid, uid);
    if (alreadyJoined < 1)
      return res
        .status(409)
        .json({ error: messages.VACANCY_NOT_JOINED_BY_USER });

    // Unjoin is done
    await unjoinVacancy(mid, vacancyId);

    // Mission info is update
    await adventurerUnjoined(mid);

    /* TODO: enviar notificación al creador de la misión para informarle que ha perdido un participante
    Const invitationId = await createInvitationRecord({
      missionId: mid,
      vacancyId: vacancyId,
      senderId: uid,
      receiverId: ownerId,
      type: 'adventurer_to_applicant',
      message,
    });

    emitToUser(ownerId, 'invitation:created', {
      invitationId,
      missionId: mid,
      vacancyId: vacancyId,
      missionTitle: mission.title,
      senderId: uid,
      senderUsername: req.user.username,
      receiverId: ownerId,
      type: 'adventurer_to_applicant',
      message,
    });*/

    return res.status(200).json({});
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

// Closes a mission
export const closeMission = async (req, res) => {
  const { mid } = req.params;
  const userId = req.user.uid;

  try {
    const mission = await getById(mid);
    if (!mission) {
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });
    }

    if (mission.owner_id !== userId) {
      return res.status(403).json({ error: messages.UNAUTHORIZED_ERROR });
    }

    const updatedMission = await _closeMission(mid);

    return res.status(200).json({
      mission: updatedMission,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

/*
Export const updateMission = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, vacancies, reward, difficulty, isDraft } =
      req.body;

    const updateData = {
      title: title || 'Mission not titled',
      publication_date: Date.now(),
      description: description || '',
      vacancies: vacancies || 0,
      reward: reward || 0,
      difficulty: difficulty || 0,
      status: isDraft ? 'draft' : 'pending_payment',
    };

    const updatedMission = await _updateMission(id, updateData);

    if (!updatedMission) {
      return res.status(404).json({ error: 'Mission not found' });
    } else {
      return res.status(200).json({
        data: updatedMission,
        message: 'Mission updated successfully',
      });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error updating mission' });
  }
};*/

export const deleteMission = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMission = await _deleteMission(id);
    if (!deletedMission) {
      return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
    } else {
      res.status(200).json({
        data: deletedMission,
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};
