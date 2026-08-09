// External modules
import {
  messages,
  consts,
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
  getByUsernameExcludingUid,
  updateMyProfile as updateMyProfileInDb,
  deleteByUid as _deleteByUid,
  updateUserEmail as _updateUserEmail,
  anonymize as _anonymize,
  deanonymize,
  updateConfiguration,
  getLocationByUid,
  getById,
  ban,
  unban,
  updateAvatar,
} from '../models/user.model.js';
import {
  getPublicProfileCreatedMissions,
  getPublicProfileJoinedMissions,
  getUserActiveMissions,
  adventurerUnjoined,
  updateMissionPayment,
  updateMissionStatus,
} from '../models/mission.model.js';
import {
  deleteFirebaseUser,
  disableUser,
  enableUser,
  getUserByEmail,
  revokeTokens,
  updateFirebaseAccount,
} from '../providers/auth.provider.js';
import {
  createRefund,
  createTransfer,
  rejectAccount,
  retrieveConnectAccount,
} from '../providers/payment.provider.js';
import {
  getOccupiedVacancies,
  markVacancyAsPaidOut,
  refundBannedVacancy,
  unjoinParticipant,
  updatePaymentStatus,
} from '../models/mission-participation.model.js';
import { createNotification } from '../models/notification.model.js';
import { emitToUser } from '../providers/socket.provider.js';
import { closeReport, getReportById } from '../models/report.model.js';
import {
  createMissionPayment,
  getMissionPaymentsByVacancy,
  refundFromPayment,
} from '../models/mission-payment.model.js';
import {
  deleteFromAzureBlob,
  deleteFromLocalStorage,
  saveToLocalStorage,
  uploadToAzureBlob,
} from '../providers/storage.provider.js';
import * as userService from '../services/user.service.js';
import * as missionService from '../services/mission.service.js';

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

// Gets the missions from the user, joined or published
export const getUserMissions = async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { type } = req.query;
    const pagination = req.pagination;
    const { missions, pagination: paginationData } =
      await missionService.getUserMissions(uid, type, pagination);
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

export const getUserPublicProfileMissions = async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();
    const { type } = req.query;
    const pagination = req.pagination;

    const user = await findByUsername(username);

    if (!user) {
      return res.status(404).json({
        errors: { general: [messages.USERNAME_NOT_FOUND(username)] },
      });
    }

    const missionsVisible =
      user.configuration?.show_missions_to_others !== false;

    if (!missionsVisible) {
      return res.status(200).json({
        missions: [],
        pagination: {
          currentPage: pagination.page,
          totalPages: 0,
          totalItems: 0,
          hasMore: false,
        },
      });
    }

    let missionsResult = { rows: [], totalCount: 0 };

    if (type === 'created') {
      missionsResult = await getPublicProfileCreatedMissions(
        user.uid,
        pagination,
      );
    } else if (type === 'joined') {
      missionsResult = await getPublicProfileJoinedMissions(
        user.uid,
        pagination,
      );
    }

    const missions = missionsResult.rows;
    const totalItems = parseInt(missionsResult.totalCount);

    if (missions) {
      const totalPages = Math.ceil(totalItems / pagination.limit);
      const hasMore = pagination.page < totalPages;

      return res.status(200).json({
        missions,
        pagination: {
          currentPage: pagination.page,
          totalPages: totalPages,
          totalItems: totalItems,
          hasMore: hasMore,
        },
      });
    } else {
      return res.status(404).json({
        errors: { general: [messages.MISSIONS_NOT_FOUND] },
      });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      errors: { general: [messages.UNEXPECTED_ERROR] },
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ errors: { general: [messages.UNAUTHORIZED_ERROR] } });
    }

    const location = await getLocationByUid(req.user.uid);

    const bankAccount = await getConnectStatus(user);

    const profile = {
      username: user.username,
      email: user.email,
      name: user.name,
      surnames: user.surnames,
      description: user.description,
      location: location,
      avatar: user.avatar,
      configuration: user.configuration,
      stripe_connected_id: user.stripe_connected_id,
      bank_account: bankAccount,
    };

    return res.status(200).json({
      user: profile,
    });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

const getConnectStatus = async (user) => {
  try {
    // If there is no ID, is not configured
    if (!user || !user.stripe_connected_id) return { isConfigured: false };

    // Info is retrieved from Stripe
    const accountInfo = await retrieveConnectAccount(user.stripe_connected_id);

    // Checks if details form are ok
    if (!accountInfo.details_submitted) return { isConfigured: false };

    // Bank account info is extracted
    const bankAccounts = accountInfo.external_accounts?.data || [];
    const defaultBank = bankAccounts.length > 0 ? bankAccounts[0] : null;

    // Data is sent to front
    return {
      isConfigured: true,
      payoutsEnabled: accountInfo.payouts_enabled,
      bankName: defaultBank?.bank_name || 'Bank account',
      last4: defaultBank?.last4 || '****',
    };
  } catch (error) {
    console.error('Error fetching connect status:', error);
    return {};
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ errors: { general: [messages.UNAUTHORIZED_ERROR] } });
    }

    const username = req.body.username.toLowerCase().trim();

    const existingUsername = await getByUsernameExcludingUid(
      username,
      user.uid,
    );
    if (existingUsername) {
      return res.status(400).json({
        errors: { username: [messages.USERNAME_ALREADY_EXISTS(username)] },
      });
    }

    const updatedUser = await updateMyProfileInDb(user.uid, {
      username,
      name: req.body.name,
      surnames: req.body.surnames,
      description: req.body.description,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
    });

    return res.status(200).json({
      message: messages.PROFILE_UPDATED_SUCCESSFULLY,
      profile: {
        username: updatedUser.username,
        name: updatedUser.name,
        surnames: updatedUser.surnames,
        description: updatedUser.description,
      },
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

export const updateMyAvatar = async (req, res) => {
  try {
    const user = req.user;
    if (!user)
      return res
        .status(401)
        .json({ errors: { general: [messages.UNAUTHORIZED_ERROR] } });

    if (!req.file) {
      return res
        .status(400)
        .json({ errors: { general: [messages.NO_IMAGE_PROVIDED] } });
    }

    // Gets user
    const currentUser = await getById(user.uid);

    // Deletes old photo physically
    if (currentUser.avatar) {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        await deleteFromAzureBlob(currentUser.avatar, 'avatars');
      } else {
        await deleteFromLocalStorage(currentUser.avatar);
      }
    }

    // Uploads new photo
    const isProduction = process.env.NODE_ENV === 'production';
    let updatedPhotUrl;
    if (isProduction) {
      updatedPhotUrl = await uploadToAzureBlob(req.file, 'avatars');
    } else {
      updatedPhotUrl = await saveToLocalStorage(req.file, 'uploads/avatars');
    }

    // Updates photo from db
    await updateAvatar(user.uid, updatedPhotUrl);

    return res.status(200).json({ avatar: updatedPhotUrl });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

// Deletes a user by uid
export const deleteByUid = async (req, res) => {
  try {
    const { uid } = req.params;

    const success = await _deleteByUid(uid);

    if (!success)
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });

    return res.status(200).json({});
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

// Deletes (anonymize) current user
export const deleteUser = async (req, res) => {
  const user = req.user;
  let anonymize;
  try {
    // First of all, checks if user has active missions, created or joined
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

// Updates user email on DB and Firebase
export const updateUserEmail = async (req, res) => {
  const user = req.user;
  const currentEmail = user.email;
  let firebaseChange;
  try {
    const { email, password } = req.body;

    // First of all, new email is checked to be unique
    const userByEmail = await findByEmail(email);

    // If it exists, then its a bad request error (unless is a new authentication with the same email)
    if (
      (userByEmail && !password) ||
      (userByEmail && password && userByEmail.uid !== user.uid)
    )
      return res.status(400).json({
        errors: { email: [messages.EMAIL_ALREADY_EXISTS(email)] },
      });

    // Lastly, it makes a deep check on Firebase searching for the e-mail
    try {
      const fbUser = await getUserByEmail(email);
      if (fbUser.uid !== user.firebase_uid && password) {
        return res.status(400).json({
          errors: { email: [messages.EMAIL_ALREADY_EXISTS(email)] },
        });
      }
    } catch (error) {
      // User not found is expected if the email is not in use, so any other error is returned
      if (error.code !== 'auth/user-not-found') {
        const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
        if (errorBuilder) {
          const mappedError = errorBuilder({ email });
          return res.status(mappedError.status).json({
            errors: { [mappedError.field]: [mappedError.message] },
          });
        }

        if (error.errors) return res.status(500).json(error.errors);

        return res.status(500).json({
          errors: { general: [messages.UNEXPECTED_ERROR] },
        });
      }
    }

    // Prepares user email update
    const firebaseUpdates = { email };
    if (password) {
      firebaseUpdates.password = password; // If there is password, its added
    }

    // So, email is changed on Firebase
    firebaseChange = await updateFirebaseAccount(
      user.firebase_uid,
      firebaseUpdates,
    );

    if (!firebaseChange)
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });

    // Then is changed on Hermyx database
    const hermyxChange = await _updateUserEmail(user.uid, email);

    if (hermyxChange) return res.status(200).json({ user: hermyxChange });
    else {
      // If email was changed on Firebase but not in Hermyx, it should rollback
      await updateFirebaseAccount(user.firebase_uid, currentEmail);
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
    }
  } catch (e) {
    console.error(e);
    // If email was changed on Firebase but not in Hermyx, it should rollback
    if (firebaseChange)
      await updateFirebaseAccount(user.firebase_uid, currentEmail);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

export const updateUserConfiguration = async (req, res) => {
  const user = req.user;
  const { configuration } = req.body;

  try {
    const success = await updateConfiguration(user.uid, configuration);

    if (success === 0)
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });

    return res.status(200).json({});
  } catch (e) {
    console.error(e);
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
    const user = await getById(uid);
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
          const unjoinMission = await adventurerUnjoined(mission.mid);
          if (unjoinMission < 1)
            return res.status(404).json({ error: messages.MISSION_NOT_FOUND });

          // Notifies owner of the mission
          const message = `Adventurer ${user.username} of your mission ${mission.title} has been banned by Hermyx administration, so this vacancy has been emptied.`;
          const notificationId = await createNotification({
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
          const unjoinMission = await adventurerUnjoined(mission.mid);
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
          const occupied_vacancies = await getOccupiedVacancies(mission.mid);
          await updateMissionPayment(
            mission.mid,
            occupied_vacancies.reduce(
              (sum, vacancy) => sum + Number(vacancy.monetary_reward),
              0,
            ) * HERMYX_FEE || 0,
          );

          // Notifies owner of the mission
          const message = `Adventurer ${user.username} of your mission ${mission.title} has been banned by Hermyx administration, so this vacancy has been emptied. Their reward is being refunded to you.`;
          const notificationId = await createNotification({
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
          const occupied_vacancies = await getOccupiedVacancies(mission.mid);
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
            await updateMissionStatus(mission.mid, MISSION_STATUS.DELETED.ID);
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
            await updateMissionStatus(
              mission.mid,
              MISSION_STATUS.CANCELLING.ID,
            );

            // And the reward is sent to the adventurers TODO: try-catch individual o transacción?
            for (const vacancy of occupied_vacancies) {
              if (vacancy.status !== MISSION_PARTICIPATION_STATUS.RELEASED.ID) {
                const adventurer = await getById(vacancy.adventurer_id);
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
            await updateMissionStatus(mission.mid, MISSION_STATUS.CANCELLED.ID);
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
              const notificationId = await createNotification({
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
      const reportClosed = await closeReport(
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
