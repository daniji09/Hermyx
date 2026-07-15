//External modules
import { messages } from '@hermyx/shared';
import {
  createMission as _createMission,
  getAllMissionsInDraft as _getAllMissionsInDraft,
  getMissionById as _getMissionById,
  getMissions as _getMissions,
  getById,
  getParticipantsForDisplay,
  getParticipantsForRelease,
  updateMissionStatus,
  getByUidAndTitle,
  getMissionsFunded as _getMissionsFunded,
  updateMission,
  getMissionParticipation,
  adventurerUnjoined,
} from '../models/mission.model.js';

import {
  getById as getMissionParticipationById,
  startParticipants,
  submitParticipation as submitMissionParticipationRecord,
  getVacancyById,
  insertVacancies,
  unjoinVacancy,
  updateVacancy,
  deleteUnoccupiedVacancies,
} from '../models/mission_participation.model.js';
import { createOwnerReview } from '../models/review.model.js';
import {
  createNotification as createNotificationRecord,
  createMissionNotification as createMissionNotificationRecord,
  countParticipationReviewAttempts,
  hasPendingJoinNotification,
} from '../models/notification.model.js';
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
    /* For (const vacancy of vacanciesToNotify) {
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
    }*/

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
    await startParticipants(missionId);

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

    if (mission.status !== 'funded') {
      return res.status(409).json({
        error: messages.MISSION_NOT_ACCEPTING_ADVENTURERS,
      });
    }

    // Checks if mission is already full
    if (mission.occupied_vacancies === mission.total_vacancies)
      return res.status(409).json({
        error: messages.MISSION_FILLED,
      });

    // Checks if user has already joined that mission
    const alreadyJoined = await getMissionParticipationById(mid, uid);
    if (alreadyJoined) {
      return res.status(409).json({ error: messages.MISSION_ALREADY_JOINED });
    }
    // Checks if vacancy exists
    const vacancy = await getVacancyById(mid, vacancyId);
    if (!vacancy)
      return res.status(404).json({ error: messages.VACANCY_NOT_FOUND });
    if (vacancy.adventurer_id !== null) {
      return res.status(409).json({ error: messages.MISSION_FILLED });
    }

    const ownerId = mission.owner_id;
    const pendingRequest = await hasPendingJoinNotification(
      mid,
      uid,
      ownerId,
      vacancyId,
    );
    if (pendingRequest) {
      return res.status(409).json({
        error: 'You already sent a join request for this mission.',
      });
    }

    const action = mission.owner_id === uid ? 'mission_invite' : 'join_request';
    const notificationId = await createNotificationRecord({
      missionId: mid,
      senderId: uid,
      receiverId: ownerId,
      type: 'invitation',
      action,
      message,
      payload: { vacancyId: vacancyId },
    });

    emitToUser(ownerId, 'notification:created', {
      notificationId,
      missionId: mid,
      vacancyId: vacancyId,
      missionTitle: mission.title,
      senderId: uid,
      senderUsername: req.user.username,
      receiverId: ownerId,
      type: 'invitation',
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

export const submitMissionParticipation = async (req, res) => {
  const { mid } = req.params;
  const adventurerId = req.user.uid;

  try {
    const mission = await getById(mid);
    if (!mission) {
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });
    }

    if (mission.status !== 'in_progress') {
      return res.status(400).json({
        error: messages.MISSION_NOT_IN_PROGRESS,
      });
    }

    const participation = await getMissionParticipationById(mid, adventurerId);
    if (!participation) {
      return res.status(403).json({
        error: messages.MISSION_PARTICIPATION_REQUIRED,
      });
    }

    if (participation.status !== 'in_progress') {
      return res.status(409).json({
        error: messages.MISSION_PART_ALREADY_SUBMITTED,
      });
    }

    const updatedParticipation = await submitMissionParticipationRecord(
      mid,
      adventurerId,
    );

    if (!updatedParticipation) {
      return res
        .status(409)
        .json({ error: messages.MISSION_PART_ALREADY_SUBMITTED });
    }

    const attempts =
      (await countParticipationReviewAttempts(mid, adventurerId)) + 1;
    const missionCompletionMessage = `The participation in "${mission.title}" was submitted by ${req.user.username}.`;
    const notificationId = await createMissionNotificationRecord({
      missionId: Number(mid),
      senderId: adventurerId,
      receiverId: mission.owner_id,
      kind: 'actionable',
      action: 'participation_review',
      payload: { attempt: attempts },
      status: 'pending',
      message: missionCompletionMessage,
    });

    emitToUser(mission.owner_id, 'mission:participation-submitted', {
      notificationId,
      type: 'mission',
      missionId: Number(mid),
      missionTitle: mission.title,
      adventurerId,
      adventurerUsername: req.user.username,
      message: missionCompletionMessage,
    });

    return res.status(200).json({
      message: messages.MISSION_PART_SUBMITTED_SUCCESSFULLY,
      participation: updatedParticipation,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};

export const reviewAdventurer = async (req, res) => {
  const { mid, adventurerId } = req.params;
  const { rating, comment } = req.body;
  const ownerId = req.user.uid;

  try {
    const result = await createOwnerReview({
      missionId: mid,
      adventurerId,
      ownerId,
      rating,
      comment,
    });

    if (result.error === 'participation_not_found') {
      return res.status(404).json({
        error: messages.MISSION_REVIEW_PARTICIPATION_REQUIRED,
      });
    }

    if (result.error === 'not_owner') {
      return res.status(403).json({
        error: messages.MISSION_REVIEW_NOT_ALLOWED,
      });
    }

    if (result.error === 'mission_not_completed') {
      return res.status(409).json({
        error: messages.MISSION_REVIEW_COMPLETED_REQUIRED,
      });
    }

    if (result.error === 'already_reviewed') {
      return res.status(409).json({
        error: messages.MISSION_REVIEW_ALREADY_EXISTS,
      });
    }

    return res.status(201).json({
      message: messages.MISSION_REVIEW_CREATED_SUCCESSFULLY,
      review: result.review,
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

// Sends a join request to the mission owner instead of joining immediately
export const cancelMission = async (req, res) => {
  const { mid } = req.params;
  const uid = req.user.uid;

  try {
    // Mission is searched
    const mission = await getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSIONS_NOT_FOUND });

    // Checks if mission was created by the current user
    if (mission.owner_id !== uid)
      return res.status(403).json({ error: messages.CANNOT_DELETE_MISSION });

    // If mission has to be "deleted", it will be
    if (mission.status === 'opened' || mission.status === 'pending_payment') {
      await updateMissionStatus(mid, 'deleted');
    }
    // If mission has to be cancelled, it will be
    else if (
      mission.status === 'in_progress' ||
      mission.status === 'in_dispute' ||
      mission.status === 'reopened'
    ) {
      await updateMissionStatus(mid, 'cancelled'); // TODO: primero a cancelling pero eso depende de lo de stripe
      // TODO: pagar a todos los aventureros
    }
    // Otherwise, mission can't be deleted or cancelled
    else
      return res.status(400).json({
        errors: {
          general: [messages.CANNOT_DELETE_MISSION_STATE],
        },
      });

    /* TODO: enviar notificación a todos los aventureros de que la misión ha sido cancelada
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
