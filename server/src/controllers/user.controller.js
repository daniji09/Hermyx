// External modules
import {
  messages,
  MISSION_STATUS,
  MISSION_PARTICIPATION_STATUS,
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_TYPE,
  HERMYX_FEE,
  HERMYX_SYSTEM_ID,
  TRANSACTION_TYPE,
  MISSION_PARTICIPATION_PAYMENT_STATUS,
  USER_STATUS,
  REPORT_DECISION,
  REPORT_STATUS,
} from '@hermyx/shared';
import {
  findByEmail,
  findByUsername,
  anonymize as _anonymize,
  deanonymize,
  findByUid,
  ban,
  unban,
} from '../models/user.model.js';
import {
  getUserActiveMissions,
  updateOccupiedVacancies,
  updateMissionPayment,
  updateStatus,
} from '../models/mission.model.js';
import {
  deleteFirebaseUser,
  disableUser,
  enableUser,
  revokeTokens,
} from '../providers/auth.provider.js';
import {
  createRefund,
  createTransfer,
  rejectAccount,
} from '../providers/payment.provider.js';
import {
  findAllOccupied,
  markVacancyAsPaidOut,
  refundBannedVacancy,
  unjoinParticipant,
  updatePaymentStatus,
} from '../models/mission-participation.model.js';
import { create } from '../models/notification.model.js';
import { emitToUser } from '../providers/socket.provider.js';
import { getReportById } from '../models/report.model.js';
import { closeReportAndConversation } from '../services/report.service.js';
import {
  createMissionPayment,
  getMissionPaymentsByVacancy,
  refundFromPayment,
} from '../models/mission-payment.model.js';
import * as userService from '../services/user.service.js';

/// Controller functions
// Search users by username partial match
export const searchUsersByUsername = async (req, res, next) => {
  try {
    const username = req.query.username;
    const pagination = req.pagination;
    const { users, pagination: paginationData } =
      await userService.searchUserByUsername(
        username,
        req.user.uid,
        pagination,
      );
    return res.status(200).json({ users, pagination: paginationData });
  } catch (error) {
    next(error);
  }
};

// Gets current user information
export const getMe = async (req, res, next) => {
  try {
    // Authentication middleware already searched user by their firebaseUid,
    // So current user information is already saved on req.user
    return res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};

// Gets current user profile
export const getMyProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const profile = await userService.getMyProfile(user);
    return res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};

// Gets the missions from the user, joined or published
export const getUserMissions = async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { type } = req.query;
    const pagination = req.pagination;
    const { missions, pagination: paginationData } =
      await userService.getUserMissions(uid, type, pagination);
    return res.status(200).json({ missions, pagination: paginationData });
  } catch (error) {
    next(error);
  }
};

// Get user public profile
export const getUserPublicProfile = async (req, res, next) => {
  try {
    const username = req.params.username;
    const { user, missionsVisible } =
      await userService.getUserPublicProfile(username);
    return res.status(200).json({ user, missionsVisible });
  } catch (error) {
    next(error);
  }
};

// Get user public profile missions
export const getUserPublicProfileMissions = async (req, res, next) => {
  try {
    const username = req.params.username;
    const { type } = req.query;
    const pagination = req.pagination;
    const { missions, pagination: paginationData } =
      await userService.getUserPublicMissions(username, type, pagination);
    return res.status(200).json({ missions, pagination: paginationData });
  } catch (error) {
    next(error);
  }
};

// Updates current user's profile
export const updateMyProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const newInformation = {
      username: req.body.username,
      name: req.body.name,
      surnames: req.body.surnames,
      description: req.body.description,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
    };
    const updatedUser = await userService.updateMyProfile(user, newInformation);
    return res.status(200).json({
      profile: {
        username: updatedUser.username,
        name: updatedUser.name,
        surnames: updatedUser.surnames,
        description: updatedUser.description,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Updates current user's avatar
export const updateMyAvatar = async (req, res, next) => {
  try {
    const user = req.user;
    const avatar = await userService.updateMyAvatar(user.uid, req.file);
    return res.status(200).json({ avatar });
  } catch (error) {
    next(error);
  }
};

// Updates current user's email
export const updateMyEmail = async (req, res, next) => {
  try {
    const user = req.user;
    const { email } = req.body;
    const userChanged = await userService.updateMyEmail(user, email);
    return res.status(200).json(userChanged);
  } catch (error) {
    next(error);
  }
};

// Updates user's configuration
export const updateMyConfiguration = async (req, res, next) => {
  console.log(req.body);
  try {
    const user = req.user;
    const { configuration } = req.body;
    const newConfiguration = await userService.updateMyConfiguration(
      user.uid,
      configuration,
    );
    return res.status(200).json({ configuration: newConfiguration });
  } catch (error) {
    next(error);
  }
};

// Adds email authentication to current user
export const addEmailAuthentication = async (req, res, next) => {
  try {
    const user = req.user;
    const { email, password } = req.body;
    const userChanged = await userService.addEmailAuthentication(
      user,
      email,
      password,
    );
    return res.status(200).json(userChanged);
  } catch (error) {
    next(error);
  }
};

// ------------
export const getUser = async (req, res) => {
  try {
    // Gets attributes
    const { email, username } = req.query;

    if (email) {
      // It searches user by email
      const user = await findByEmail(email);

      // Returns success or error
      if (!user)
        return res.status(404).json({
          errors: { usernameEmail: [messages.EMAIL_NOT_FOUND(email)] },
        });

      return res.status(200).json({ user });
    } else if (username) {
      // It searches user by username
      const user = await findByUsername(username);

      // Returns success or error
      if (!user)
        return res.status(404).json({
          errors: { usernameEmail: [messages.USERNAME_NOT_FOUND(username)] },
        });

      return res.status(200).json({ user });
    }
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

// Deletes (anonymize) current user TODO: reports should be deleted?, notifications should be seen?
export const deleteUser = async (req, res) => {
  const user = req.user;
  let anonymize;
  try {
    // First of all, checks if user has active missions, published or joined
    const activeMissions = await getUserActiveMissions(user.uid);
    if (activeMissions.total_active > 0)
      return res.status(409).json({
        missions: activeMissions,
        errors: {
          general: [
            `You cant delete your account while you have active missions.`,
          ],
        },
      });

    // Anonymize user in db
    anonymize = await _anonymize(user.uid);
    if (anonymize < 1)
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });

    // Deletes user from Firebase
    await deleteFirebaseUser(user.firebase_uid);
    return res.status(200).json({});
  } catch (e) {
    console.error(e);

    // If email was changed on Firebase but not in Hermyx, it should rollback
    if (anonymize > 0) await deanonymize(user);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

// Bans user
export const banUser = async (req, res) => {
  const { uid } = req.params;
  const { rid, reason } = req.body;

  try {
    // Gets user
    const user = await findByUid(uid);
    let banHermyx;
    try {
      // First of all, checks if user has already been banned
      if (user.status === USER_STATUS.BANNED.ID)
        return res.status(409).json({ error: messages.USER_ALREADY_BANNED });

      // Gets report
      const report = await getReportById(rid);
      if (!report)
        return res
          .status(404)
          .json({ errors: { general: [messages.REPORT_NOT_FOUND] } });

      // Checks if report has not been answered yet
      if (report.status === REPORT_STATUS.ANSWERED.ID)
        return res
          .status(409)
          .json({ errors: messages.REPORT_ALREADY_ANSWERED });

      // Checks if user has active missions, created or joined
      const activeMissions = await getUserActiveMissions(user.uid);
      // For every active mission, a different action has to be made
      for (const mission of activeMissions) {
        console.log(mission);
        // If mission is not in progress and this user is an adventurer, it just deletes them from the mission
        if (
          mission.owner_id !== uid &&
          MISSION_STATUS[mission.status].CAN_DELETE
        ) {
          // Unjoin user
          const unjoin = await unjoinParticipant(mission.mid, uid);
          if (unjoin < 1)
            return res.status(404).json({ error: messages.MISSION_NOT_FOUND });

          // Updates mission
          const unjoinMission = await updateOccupiedVacancies(mission.mid);
          if (unjoinMission < 1)
            return res.status(404).json({ error: messages.MISSION_NOT_FOUND });

          // Notifies owner of the mission
          const message = `Adventurer ${user.username} of your mission ${mission.title} has been banned by Hermyx administration, so this vacancy has been emptied.`;
          const notificationId = await create({
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: NOTIFICATION_ACTION.USER_BAN.ID,
            status: null,
            message: message,
            senderId: HERMYX_SYSTEM_ID,
            receiverId: mission.owner_id,
            payload: {
              associated_mission_id: mission.mid,
              associated_vacancy_id: mission.vacancy_id,
            },
          });
          emitToUser(mission.owner_id, 'mission:adventurer-ban', {
            notificationId,
            missionId: mission.mid,
            vacancyId: null,
            missionTitle: mission.title,
            senderId: HERMYX_SYSTEM_ID,
            senderUsername: req.user.username,
            receiverId: mission.owner_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message: message,
          });
        }
        // If mission is in progress and this user is an adventurer, it deletes them from the mission and refunds the payment to the applicant
        else if (
          mission.owner_id !== uid &&
          MISSION_STATUS[mission.status].CAN_CANCEL &&
          MISSION_PARTICIPATION_STATUS[mission.participation_status]
            .CAN_INTERACT
        ) {
          // Unjoin user
          const unjoin = await unjoinParticipant(mission.mid, uid);
          if (unjoin < 1)
            return res.status(404).json({ error: messages.MISSION_NOT_FOUND });

          // Updates mission
          const unjoinMission = await updateOccupiedVacancies(mission.mid);
          if (unjoinMission < 1)
            return res.status(404).json({ error: messages.MISSION_NOT_FOUND });

          // Refunds payment to the applicant
          await updatePaymentStatus(
            mission.vacancy_id,
            MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
          );

          // First, payments for this mission are get
          const payments = await getMissionPaymentsByVacancy(
            mission.vacancy_id,
          );

          // Amount to refund is calculated
          let amountToRefund = mission.monetary_reward;

          // That amount is refunded from every payment that is associated with the vacancy, if needed
          for (const payment of payments) {
            if (amountToRefund <= 0) break;

            // Amount to refund from this payment is calculated
            const availableBalance =
              payment.amount_paid - payment.amount_refunded;
            const paymentRefund = Math.min(amountToRefund, availableBalance);

            // Refund is made on Stripe
            const refund = await createRefund(
              {
                payment_intent: payment.stripe_transaction_id,
                amount: Math.round(paymentRefund * 100),
                metadata: {
                  mission_id: mission.mid,
                  vacancy_id: mission.vacancy_id,
                  reason: 'user_banned_refund',
                },
              },
              `user_banned_refund_${mission.mid}_${mission.vacancy_id}_${Date.now()}`,
            );

            // Payment is updated on db
            await refundFromPayment(paymentRefund, payment.pid);

            // And new transaction is added to db
            await createMissionPayment({
              mid: mission.mid,
              vacancy_id: mission.vacancy_id,
              sender_id: HERMYX_SYSTEM_ID,
              receiver_id: mission.owner_id,
              stripe_transaction_id: refund.id,
              transaction_type: TRANSACTION_TYPE.BAN_COMPENSATION.ID,
              amount_paid: paymentRefund,
            });

            amountToRefund -= paymentRefund;
          }
          // When refund is complete, is marked as that
          await refundBannedVacancy(
            mission.vacancy_id,
            mission.monetary_reward,
          );

          // Updates total payment on mission
          const occupied_vacancies = await findAllOccupied(mission.mid);
          await updateMissionPayment(
            mission.mid,
            occupied_vacancies.reduce(
              (sum, vacancy) => sum + Number(vacancy.monetary_reward),
              0,
            ) * HERMYX_FEE || 0,
          );

          // Notifies owner of the mission
          const message = `Adventurer ${user.username} of your mission ${mission.title} has been banned by Hermyx administration, so this vacancy has been emptied. Their reward is being refunded to you.`;
          const notificationId = await create({
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: NOTIFICATION_ACTION.USER_BAN.ID,
            status: null,
            message: message,
            senderId: HERMYX_SYSTEM_ID,
            receiverId: mission.owner_id,
            payload: {
              associated_mission_id: mission.mid,
            },
          });
          emitToUser(mission.owner_id, 'mission:adventurer-ban', {
            notificationId,
            missionId: mission.mid,
            vacancyId: null,
            missionTitle: mission.title,
            senderId: HERMYX_SYSTEM_ID,
            senderUsername: req.user.username,
            receiverId: mission.owner_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message: message,
          });
        }
        // If the user is the owner of the mission, it just delete it, using same logic as a delete
        else if (mission.owner_id === uid) {
          // Gets occupied vacancies
          const occupied_vacancies = await findAllOccupied(mission.mid);
          if (MISSION_STATUS[mission.status].CAN_DELETE) {
            // Checks if mission can be deleted by states
            if (
              !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
                MISSION_STATUS.DELETED.ID,
              )
            )
              return res
                .status(400)
                .json({ error: messages.CANNOT_DELETE_MISSION_STATE });

            // Then mission status is updated
            await updateStatus(mission.mid, MISSION_STATUS.DELETED.ID);
          }
          // If mission has to be cancelled, it will be
          else if (MISSION_STATUS[mission.status].CAN_CANCEL) {
            // Checks if mission can be cancelled by states
            if (
              !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
                MISSION_STATUS.CANCELLING.ID,
              )
            )
              return res
                .status(400)
                .json({ error: messages.CANNOT_CANCEL_MISSION_STATE });

            // Then mission status is updated
            await updateStatus(mission.mid, MISSION_STATUS.CANCELLING.ID);

            // And the reward is sent to the adventurers TODO: try-catch individual o transacción?
            for (const vacancy of occupied_vacancies) {
              if (vacancy.status !== MISSION_PARTICIPATION_STATUS.RELEASED.ID) {
                const adventurer = await findByUid(vacancy.adventurer_id);
                if (adventurer.stripe_connected_id) {
                  const transferData = {
                    amount: Math.round(vacancy.monetary_reward * 100),
                    currency: 'eur',
                    destination: adventurer.stripe_connected_id,
                    description: `mission_cancelled_because_of_applicant_banned`,
                    transfer_group: `mission_${mission.mid}`,
                  };

                  const idempotencyKey = `cancel_${mission.mid}_vac_${vacancy.id}_applicant_banned`;
                  const transfer = await createTransfer(
                    transferData,
                    idempotencyKey,
                  );

                  // Adds mission payment
                  await createMissionPayment({
                    mid: mission.mid,
                    vacancy_id: vacancy.id,
                    sender_id: HERMYX_SYSTEM_ID,
                    receiver_id: adventurer.uid,
                    stripe_transaction_id: transfer.id,
                    transaction_type: TRANSACTION_TYPE.BAN_COMPENSATION.ID,
                    amount_paid: vacancy.monetary_reward,
                  });

                  await markVacancyAsPaidOut(vacancy.id);
                }
              }
            }
            await updateStatus(mission.mid, MISSION_STATUS.CANCELLED.ID);
          }
          // Otherwise, mission can't be deleted or cancelled
          else
            return res.status(400).json({
              errors: {
                general: [messages.CANNOT_DELETE_MISSION_STATE],
              },
            });

          // Either way, all adventurers are informed
          for (const vacancy of occupied_vacancies) {
            if (MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT) {
              const message = MISSION_STATUS[mission.status].CAN_DELETE
                ? `Mission ${mission.title} has been deleted because the applicant has been banned, so it won't be done, we are sorry.`
                : `Mission ${mission.title} has been cancelled because the applicant has been banned, but don't worry, your reward is on your way!`;
              const notificationId = await create({
                type: NOTIFICATION_TYPE.MISSION.ID,
                kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
                action: NOTIFICATION_ACTION.MISSION_BAN.ID,
                status: null,
                message: message,
                senderId: uid,
                receiverId: vacancy.adventurer_id,
                payload: {
                  associated_mission_id: mission.mid,
                },
              });
              emitToUser(vacancy.adventurer_id, 'mission:applicant-ban', {
                notificationId,
                missionId: mission.mid,
                vacancyId: vacancy.id,
                missionTitle: mission.title,
                senderId: uid,
                senderUsername: req.user.username,
                receiverId: vacancy.adventurer_id,
                type: NOTIFICATION_TYPE.MISSION.ID,
                message: message,
              });
            }
          }
        }
      }

      // Report is closed
      const reportClosed = await closeReportAndConversation(
        rid,
        REPORT_DECISION.BAN_USER.ID,
        reason,
        req.user.uid,
      );
      if (!reportClosed)
        return res.status(404).json({ error: messages.REPORT_NOT_FOUND });

      // Their adventurer account is rejected so they cannot receive payments
      // Not needed for applicant account, because being banned avoids any type of transaction
      if (user.stripe_connected_id) {
        await rejectAccount(user.stripe_connected_id);
      }

      // Bans user in db
      banHermyx = await ban(uid);
      if (banHermyx < 1)
        return res
          .status(409)
          .json({ errors: { general: [messages.USER_NOT_FOUND] } });

      // Bans user from Firebase
      await disableUser(user.firebase_uid);
      await revokeTokens(user.firebase_uid);

      return res.status(200).json({});
    } catch (e) {
      console.error(e);

      // If email was changed on Firebase but not in Hermyx, it should rollback
      if (banHermyx > 0) await unban(uid);
      // Tries to enable the user on Firebase
      try {
        await enableUser(user.firebase_uid);
      } catch (e) {
        console.error(e);
        return res
          .status(500)
          .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
      }
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
};
