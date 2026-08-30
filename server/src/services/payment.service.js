import {
  HERMYX_FEE,
  HERMYX_SYSTEM_ID,
  messages,
  MISSION_PARTICIPATION_PAYMENT_STATUS,
  MISSION_PARTICIPATION_STATUS,
  MISSION_STATUS,
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_TYPE,
  TRANSACTION_TYPE,
} from '@hermyx/shared';
import { AppError } from '../utils/error.util.js';
import * as paymentProvider from '../providers/payment.provider.js';
import * as missionService from '../services/service.service.js';
import * as userService from '../services/user.service.js';
import * as notificationService from '../services/notification.service.js';
import * as socketProvider from '../providers/socket.provider.js';
import pool from '../config/db.config.js';
import { FRONTEND_URL } from '../config/config.js';

/// Endpoint complex functions
// List cards
export const listCards = async (stripeCustomerId) => {
  // Parameter checks
  checkStripeCustomerId(stripeCustomerId);

  // Retrieves customer and its cards
  const [customer, cards] = await Promise.all([
    paymentProvider.retrieveCustomer(stripeCustomerId),
    paymentProvider.listCards(stripeCustomerId),
  ]);
  return { customer, cards };
};

// Add card
export const addCard = async (stripeCustomerId) => {
  // Parameter checks
  checkStripeCustomerId(stripeCustomerId);

  // Creates intent to save card without charging
  const setupIntent = await paymentProvider.createSetupIntent(stripeCustomerId);

  return setupIntent;
};

// Set default card
export const setDefaultCard = async (stripeCustomerId, paymentMethodId) => {
  // Parameter checks
  checkStripeCustomerId(stripeCustomerId);

  // Checks if payment method received actually belongs to the current user
  if (paymentMethodId)
    await ensurePaymentMethodOwner(paymentMethodId, stripeCustomerId);

  // Then, changes the default card
  await paymentProvider.setDefaultCard(stripeCustomerId, paymentMethodId);

  return;
};

// Pay default
export const payDefault = async (mid, user) => {
  // Parameters check
  checkMid(mid);
  checkUser(user);

  // Finds service
  const mission = await missionService.getMissionByIdOrThrow(mid);

  // Checks if service belongs to user
  checkMissionBelongsToUser(mission.owner_id, user.uid);

  // Gets customer from Stripe
  const customer = await paymentProvider.retrieveCustomer(
    user.stripe_customer_id,
  );

  // Gets its default card
  const defaultPm = customer.invoice_settings?.default_payment_method;
  if (!defaultPm)
    throw new AppError(messages.PAYMENT.GENERAL.NO_DEFAULT_CARD, 409);

  // Gets how much has to be payed
  const paymentAmount = await missionService.getMissionPaymentByMid(mid);

  // Creates a new payment intent
  const pi = await paymentProvider.createPaymentIntentDefault(
    {
      amount: Math.round(paymentAmount * 100 * HERMYX_FEE),
      currency: 'eur',
      customer: user.stripe_customer_id,
      payment_method: defaultPm,
      metadata: { mid, ownerId: user.uid },
      transfer_group: `mission_${mid}`,
    },
    `pay_default_${mid}_${Date.now()}`,
  );

  return { pi, defaultPm };
};

// Pay new
export const payNew = async (mid, user, saveCard) => {
  // Parameters check
  checkMid(mid);
  checkUser(user);

  // Finds service
  const mission = await missionService.getMissionByIdOrThrow(mid);

  // Checks if service belongs to user
  checkMissionBelongsToUser(mission.owner_id, user.uid);

  // Finds how much it has to be payed
  const paymentAmount = await missionService.getMissionPaymentByMid(mid);

  // Creates payment on Stripe
  const pi = await paymentProvider.createPaymentIntentNew(
    {
      amount: Math.round(paymentAmount * 100 * HERMYX_FEE),
      currency: 'eur',
      customer: user.stripe_customer_id,
      automatic_payment_methods: { enabled: true },
      ...(saveCard ? { setup_future_usage: 'off_session' } : {}),
      metadata: { mid, ownerId: user.uid },
      transfer_group: `mission_${mid}`,
    },
    `pay_new_${mid}_${Date.now()}`,
  );

  return pi;
};

// Confirm payments and makes changes on db
export const confirmPayment = async (mid, paymentIntentId, user) => {
  checkMid(mid);
  checkPaymentIntentId(paymentIntentId);
  checkUser(user);

  // Gets payment intent
  const pi = await paymentProvider.retrievePI(paymentIntentId);

  // Checks if payment intent belongs to current user
  if (pi.customer !== user.stripe_customer_id)
    throw new AppError(messages.PAYMENT.GENERAL.PAYMENT_NOT_FROM_USER);

  // Checks that the payment intent was created for this service
  if (String(pi.metadata?.mid) !== String(mid))
    throw new AppError(messages.PAYMENT.GENERAL.PAYMENT_NOT_FROM_SERVICE, 409);

  // Confirms payment
  if (pi.status !== 'succeeded')
    throw new AppError(
      messages.PAYMENT.GENERAL.PAYMENT_NOT_SUCCEEDED(pi.status),
      409,
    );

  // Updates database
  const client = await pool.connect();
  const notificationsToSend = [];

  try {
    await client.query('BEGIN');

    // Gets service using pessimistic concurrency because no collaborator can vary, due to monetary reward and payments will be change
    const mission = await missionService.getMissionByIdForUpdateOrThrow(
      mid,
      client,
    );

    // Checks if service belongs to user
    checkMissionBelongsToUser(mission.owner_id, user.uid);

    // Checks if service can be in progress by status
    if (
      mission.status !== MISSION_STATUS.IN_PROGRESS.ID &&
      !MISSION_STATUS[mission.status].VALID_NEXT_STATES.includes(
        MISSION_STATUS.IN_PROGRESS.ID,
      )
    )
      throw new AppError(
        messages.PAYMENT.CONFIRM_PAYMENT.CANNOT_PAY_SERVICE_STATE,
        409,
      );

    // Finds waiting for payment vacancies
    const waitingForPaymentVacancies =
      await missionService.getAllWaitingForPaymentByMid(mid, client);

    const expectedPaymentAmount = Math.round(
      waitingForPaymentVacancies.reduce(
        (sum, vacancy) =>
          sum + Number(vacancy.monetary_reward) - Number(vacancy.amount_paid),
        0,
      ) *
        100 *
        HERMYX_FEE,
    );

    if (pi.amount !== expectedPaymentAmount)
      throw new AppError(messages.PAYMENT.GENERAL.PAYMENT_AMOUNT_MISMATCH, 409);

    const occupied_vacancies = await missionService.getAllOccupiedByMid(
      mission.mid,
      client,
    );

    // Treats each vacancy sequentially
    for (const vacancy of waitingForPaymentVacancies) {
      let transaction_type;

      // Each type of payment has different information or actions
      if (mission.status === MISSION_STATUS.CLOSED.ID) {
        // If service is in closed state, is funding payment
        transaction_type = TRANSACTION_TYPE.INITIAL_FUNDING.ID;
      } else if (
        vacancy.payment_status ===
        MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_PAID.ID
      ) {
        // If vacancy is partially pay, is a reward negotiation
        transaction_type = TRANSACTION_TYPE.NEGOTIATION_EXTRA.ID;
      } else {
        // Any other option means a new collaborator joined the service via reopening
        transaction_type = TRANSACTION_TYPE.NEW_ADVENTURER_FUNDING.ID;
      }

      // Adds service payment
      await missionService.createMissionPayment(
        {
          mid,
          vacancy_id: vacancy.id,
          sender_id: user.uid,
          receiver_id: HERMYX_SYSTEM_ID,
          stripe_transaction_id: pi.id,
          transaction_type: transaction_type,
          amount_paid:
            (vacancy.monetary_reward - vacancy.amount_paid) * HERMYX_FEE,
        },
        client,
      );

      // Updates vacancy info
      await missionService.payParticipant(
        vacancy.id,
        vacancy.monetary_reward - vacancy.amount_paid,
        client,
      );

      // Prepares notifications
      let message;
      if (transaction_type === TRANSACTION_TYPE.INITIAL_FUNDING.ID)
        message = messages.NOTIFICATION.SERVICE_STARTED(mission.title);
      else if (transaction_type === TRANSACTION_TYPE.NEGOTIATION_EXTRA.ID)
        message = messages.NOTIFICATION.SERVICE_NEGOTIATION_EXTRA(
          mission.title,
        );
      else message = messages.NOTIFICATION.SERVICE_RESTARTED(mission.title);
      if (MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_INTERACT) {
        const notificationId = await notificationService.createNotification(
          {
            type: NOTIFICATION_TYPE.MISSION.ID,
            kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
            action: NOTIFICATION_ACTION.MISSION_START.ID,
            status: null,
            message: message,
            senderId: user.uid,
            receiverId: vacancy.adventurer_id,
            payload: {
              associated_mission_id: mission.mid,
            },
          },
          client,
        );
        notificationsToSend.push({
          receiverId: vacancy.adventurer_id,
          eventName: 'mission:started',
          payload: {
            notificationId,
            missionId: mission.mid,
            vacancyId: vacancy.adventurer_id,
            missionTitle: mission.title,
            senderId: user.uid,
            senderUsername: user.username,
            receiverId: vacancy.adventurer_id,
            type: NOTIFICATION_TYPE.MISSION.ID,
            message: message,
          },
        });
      }
    }

    // Updates total payment on service
    await missionService.updateMissionPayment(
      mission.mid,
      occupied_vacancies.reduce(
        (sum, vacancy) => sum + Number(vacancy.monetary_reward),
        0,
      ) * HERMYX_FEE || 0,
      client,
    );

    // Service and participants life cycle is updated
    await missionService.updateStatusByMid(
      mid,
      MISSION_STATUS.IN_PROGRESS.ID,
      client,
    );
    await missionService.startParticipants(mid, client);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  // Lastly, notifications are sent
  for (const notification of notificationsToSend)
    socketProvider.emitToUser(
      notification.receiverId,
      notification.eventName,
      notification.payload,
    );
  return;
};

// Adds account to collaborator
export const connectOnBoard = async (user) => {
  checkUser(user);

  // If user don't have a connected id, it creates it with Hermyx data and user's email so then filling the rest is the minimum
  let accountId = user.stripe_connected_id;
  if (!accountId) {
    const account = await paymentProvider.createExpressAccount(user.email);
    accountId = account.id;

    await userService.updateUserStripeConnectedIdByUid(user.uid, accountId);
  }

  const refreshUrl = `${FRONTEND_URL}/stripe/connect/onboard`;
  const returnUrl = `${FRONTEND_URL}/stripe/connect/success`;

  // Then, it accesses Stripe account, if it hadn't been configured, user has to fill minimum data needed by law
  const accountLink = await paymentProvider.createAccountLink(
    accountId,
    refreshUrl,
    returnUrl,
  );
  return accountLink;
};

// Gets Stripe dashboard link
export const getDashboardLink = async (user) => {
  checkUser(user);

  // Checks if user actually completed login form
  const accountInfo = await paymentProvider.retrieveConnectAccount(
    user.stripe_connected_id,
  );

  // If not, is not able to access the dashboard
  if (!accountInfo.details_submitted)
    throw new AppError(messages.GENERAL.STRIPE_ONBOARDING_NOT_COMPLETED, 403);

  // Dashboard link
  const loginLink = await paymentProvider.createLoginLink(
    user.stripe_connected_id,
  );

  return loginLink;
};

// Delete card
export const deleteCard = async (stripeCustomerId, paymentMethodId) => {
  // Parameter checks
  checkStripeCustomerId(stripeCustomerId);
  checkPaymentMethodId(paymentMethodId);

  // Checks if payment method received actually belongs to the current user
  await ensurePaymentMethodOwner(paymentMethodId, stripeCustomerId);

  // Gets the user linked to that Stripe customer id
  const customer = await paymentProvider.retrieveCustomer(stripeCustomerId);
  const defaultPm = customer.invoice_settings?.default_payment_method || null;

  // Deletes from them the corresponding card
  await paymentProvider.detachCard(paymentMethodId);

  // And, finally, checks if that card was the default one, so that field is nullified
  if (defaultPm === paymentMethodId) {
    await setDefaultCard(stripeCustomerId, null);
  }

  return;
};

/// Data checks
const checkStripeCustomerId = (stripeCustomerId) => {
  if (!stripeCustomerId)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Stripe customer id'));
};

const checkPaymentMethodId = (paymentMethodId) => {
  if (!paymentMethodId)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Payment method id'));
};

const checkPaymentIntentId = (paymentIntentId) => {
  if (!paymentIntentId)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Payment intent id'));
};

const checkMid = (mid) => {
  if (!mid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Mid'));
};

const checkUser = (user) => {
  if (!user) throw new Error(messages.GENERAL.FIELD_REQUIRED('User'));
};

/// Helper functions
// Checks if the payment provided by the user is actually theirs
const ensurePaymentMethodOwner = async (paymentMethodId, customerId) => {
  let paymentMethod;

  // First, checks in Stripe if the payment method actually exists
  try {
    paymentMethod =
      await paymentProvider.retrievePaymentMethod(paymentMethodId);
  } catch (error) {
    console.error('Error retrieving payment method:', error);
    throw new AppError(messages.PAYMENT.GENERAL.PAYMENT_METHOD_NOT_FOUND, 404);
  }

  // Then, checks gets the customer id of that payment method and checks if it belongs to the current user
  if (getPaymentMethodCustomerId(paymentMethod) !== customerId) {
    throw new AppError(
      messages.PAYMENT.GENERAL.PAYMENT_METHOD_NOT_FROM_USER,
      403,
    );
  }

  return paymentMethod;
};

// Extracts the customer associated with the payment method; Stripe's API can send it as a string or as an object
const getPaymentMethodCustomerId = (paymentMethod) => {
  if (!paymentMethod.customer) return null;
  if (typeof paymentMethod.customer === 'string') return paymentMethod.customer;
  return paymentMethod.customer.id;
};

const checkMissionBelongsToUser = (missionOwnerUid, currentUserUid) => {
  // Checks that the service belongs to the user
  if (missionOwnerUid !== currentUserUid)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
};
