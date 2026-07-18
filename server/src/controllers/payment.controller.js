import {
  //CreateCustomer,
  createSetupIntent,
  checkStripeCustomer,
  retrieveCustomer,
  retrievePaymentMethod,
  listCards as _listCards,
  setDefaultCard as _setDefaultCard,
  detachCard,
  createPaymentIntentDefault,
  createPaymentIntentNew,
  retrievePI,
  createExpressAccount,
  createAccountLink,
  createTransfer,
  createRefund,
  createLoginLink,
  retrieveConnectAccount,
} from '../services/payment.service.js';

import {
  getById,
  updateStripeConnected as updateStripeConnectId,
} from '../models/app_user.model.js';

import {
  getById as _getById,
  updatePaymentInfo,
  lockForRelease,
  getParticipantsForRelease,
  updateStatus,
  updateReleaseStatus,
  lockForRefund,
  finalizeRefund,
  updateMissionStatus,
  updateMissionPayment,
} from '../models/mission.model.js';

import {
  getMissionPayment,
  getOccupiedVacancies,
  getVacancyById,
  getWaitingForPaymentVacancies,
  payVacancy,
  startParticipants,
  updateTransferInfo,
} from '../models/mission_participation.model.js';
import { MISSION_LIFE_CYCLE } from '@hermyx/shared/utils/missions.utils.js';
import { messages } from '@hermyx/shared';
import { createNotification } from '../models/notification.model.js';
import {
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_TYPE,
} from '@hermyx/shared/utils/notifications.utils.js';
import { emitToUser } from '../services/socket.service.js';
import {
  createMissionPayment,
  getMissionPaymentsByStripeTransactionId,
} from '../models/mission_payment.model.js';
import { FRONTEND_URL } from '../config/config.js';
import {
  HERMYX_TRANSACTION_ID,
  TRANSACTION_TYPE,
  VACANCY_PAYMENT_STATUS,
} from '@hermyx/shared/utils/payment.utils.js';

//Registers the current user as a Stripe Customer to allow making payments.

const ensureMissionOwner = (mission, userId, res) => {
  if (mission.owner_id !== userId) {
    res.status(403).json({ error: 'You can only pay your own missions.' });
    return false;
  }

  return true;
};

const getReusablePaymentIntent = async (mission, customerId) => {
  if (!mission.stripe_pi_id || mission.status === 'refunded') return null;

  const pi = await retrievePI(mission.stripe_pi_id);

  if (pi.customer !== customerId) {
    const error = new Error('Payment does not belong to the logged user.');
    error.status = 403;
    throw error;
  }

  if (pi.status === 'succeeded') {
    const error = new Error('This mission is already paid.');
    error.status = 400;
    throw error;
  }

  if (pi.status === 'processing') {
    const error = new Error('The payment is still being processed.');
    error.status = 409;
    throw error;
  }

  if (pi.status !== 'canceled') return pi;

  return null;
};

const handlePaymentError = (err, res) => {
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  return res.status(500).json({ error: err.message });
};

const getPaymentMethodCustomerId = (paymentMethod) => {
  if (!paymentMethod.customer) return null;
  if (typeof paymentMethod.customer === 'string') return paymentMethod.customer;
  return paymentMethod.customer.id;
};

const ensurePaymentMethodOwner = async (paymentMethodId, customerId) => {
  let paymentMethod;

  try {
    paymentMethod = await retrievePaymentMethod(paymentMethodId);
  } catch (error) {
    console.error('Error retrieving payment method:', error);
    const paymentMethodNotFoundError = new Error('Payment method not found.');
    paymentMethodNotFoundError.status = 404;
    throw paymentMethodNotFoundError;
  }

  if (getPaymentMethodCustomerId(paymentMethod) !== customerId) {
    const paymentMethodOwnerError = new Error(
      'Payment method does not belong to the logged user.',
    );
    paymentMethodOwnerError.status = 403;
    throw paymentMethodOwnerError;
  }

  return paymentMethod;
};

export async function register(req, res) {
  try {
    const { email, name, stripe_customer_id } = req.user;

    if (stripe_customer_id) {
      return res.json({ customerId: stripe_customer_id });
    }

    const customer = await checkStripeCustomer(name, email);
    req.session.customerId = customer.id;

    res.json({
      message: 'User registered with Stripe',
      customerId: customer.id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

//Creates a SetupIntent to save a credit card without charging it yet.
export async function addCardToCustomer(req, res) {
  try {
    const customerId = req.user.stripe_customer_id;
    if (!customerId)
      return res.status(400).json({ error: 'You do not have a Customer ID' });

    const setupIntent = await createSetupIntent(customerId);
    res.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    handlePaymentError(err, res);
  }
}

//List the user's saved cards and identifies the default one.
//A second of courtesy if you change the default card and immediately list the cards again
export async function listCards(req, res) {
  try {
    const customerId = req.user.stripe_customer_id;

    if (!customerId)
      return res.status(400).json({ error: 'You do not have a Customer ID' });

    const [customer, cards] = await Promise.all([
      retrieveCustomer(customerId),
      _listCards(customerId),
    ]);

    res.json({
      success: true,
      defaultPaymentMethodId:
        customer.invoice_settings?.default_payment_method || null,
      cards: cards.data,
    });
  } catch (err) {
    console.log('Error listing cards');
    handlePaymentError(err, res);
  }
}

//Updates the customer's default payment method in Stripe.
export async function setDefaultCard(req, res) {
  try {
    const customerId = req.user.stripe_customer_id;
    const { paymentMethodId } = req.body;

    await ensurePaymentMethodOwner(paymentMethodId, customerId);

    await _setDefaultCard(customerId, paymentMethodId);
    res.json({
      success: true,
      message: 'Card set as default',
    });
  } catch (err) {
    handlePaymentError(err, res);
  }
}

//Deletes a card. If it was the default, clears the default setting
export async function deleteCard(req, res) {
  try {
    const customerId = req.user.stripe_customer_id;
    const { paymentMethodId } = req.params;

    await ensurePaymentMethodOwner(paymentMethodId, customerId);

    const customer = await retrieveCustomer(customerId);
    const defaultPm = customer.invoice_settings?.default_payment_method || null;

    await detachCard(paymentMethodId);

    if (defaultPm === paymentMethodId) {
      await _setDefaultCard(customerId, null);
    }

    res.json({ success: true, message: 'Card deleted' });
  } catch (err) {
    handlePaymentError(err, res);
  }
}

//Charges the mission cost using the user's saved default card.
export async function payDefault(req, res) {
  try {
    const customerId = req.user.stripe_customer_id;
    const { missionId } = req.body;

    if (!missionId) return res.status(400).json({ error: 'missing missionId' });

    const mission = await _getById(missionId);
    if (!mission) return res.status(404).json({ error: 'Mission not found' });
    if (!ensureMissionOwner(mission, req.user.uid, res)) return;

    const customer = await retrieveCustomer(customerId);
    const defaultPm = customer.invoice_settings?.default_payment_method;

    if (!defaultPm) return res.status(400).json({ error: 'No default card' });

    const reusablePi = await getReusablePaymentIntent(mission, customerId);
    if (reusablePi) {
      return res.json({
        clientSecret: reusablePi.client_secret,
        paymentIntentId: reusablePi.id,
        paymentMethodId: defaultPm,
      });
    }

    const pi = await createPaymentIntentDefault(
      {
        amount: Math.round(mission.total_payment * 100),
        currency: 'eur',
        customer: customerId,
        payment_method: defaultPm,
        metadata: { missionId, ownerId: req.user.uid },
      },
      `pay_default_${missionId}_${Date.now()}`,
    );

    await updatePaymentInfo(
      missionId,
      pi.id,
      MISSION_LIFE_CYCLE.IN_PROGRESS.ID,
    );

    res.json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      paymentMethodId: defaultPm,
    });
  } catch (err) {
    handlePaymentError(err, res);
  }
}

//Creates a PaymentIntent for a new card. Can optionally save the card for future use.
export async function payNew(req, res) {
  try {
    const customerId = req.user.stripe_customer_id;
    const { mid, saveCard = true } = req.body;

    const mission = await _getById(mid);
    if (!mission)
      return res.status(404).json({ error: messages.MISSION_NOT_FOUND });
    if (!ensureMissionOwner(mission, req.user.uid, res)) return;

    // Finds how much it has to be payed
    const paymentAmount = await getMissionPayment(mid);
    const reusablePi = await getReusablePaymentIntent(mission, customerId);
    if (reusablePi) {
      return res.json({
        clientSecret: reusablePi.client_secret,
        paymentIntentId: reusablePi.id,
      });
    }

    // Creates payment on Stripe
    const pi = await createPaymentIntentNew(
      {
        amount: Math.round(paymentAmount * 100),
        currency: 'eur',
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        ...(saveCard ? { setup_future_usage: 'off_session' } : {}),
        metadata: { mid, ownerId: req.user.uid },
      },
      `${customerId}_payment_on_${Date.now()}`,
    );

    // Finds waiting for payment vacancies
    const waitingForPaymentVacancies = await getWaitingForPaymentVacancies();
    for (const vacancy of waitingForPaymentVacancies) {
      let transaction_type;
      // Each type of payment has different information or actions
      if (mission.status === MISSION_LIFE_CYCLE.CLOSED.ID) {
        // If mission is in closed state, is funding payment
        transaction_type = TRANSACTION_TYPE.INITIAL_FUNDING.ID;
      } else if (
        vacancy.payment_status === VACANCY_PAYMENT_STATUS.PARTIALLY_PAID.ID
      ) {
        // If vacancy is partially pay, is a reward negotiation
        transaction_type = TRANSACTION_TYPE.NEGOTIATION_EXTRA.ID;
      } else {
        // Any other option means a new adventurer joined the mission via reopening
        transaction_type = TRANSACTION_TYPE.NEW_ADVENTURER_FUNDING.ID;
      }

      // Adds mission payment
      await createMissionPayment({
        mid,
        vacancy_id: vacancy.id,
        sender_id: req.user.uid,
        receiver_id: HERMYX_TRANSACTION_ID,
        stripe_transaction_id: pi.id,
        transaction_type: transaction_type,
        amount_paid: vacancy.monetary_reward - vacancy.amount_paid,
      });

      // Updates vacancy info
      await payVacancy(
        vacancy.id,
        vacancy.monetary_reward - vacancy.amount_paid,
      );
    }

    return res.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
  } catch (err) {
    handlePaymentError(err, res);
  }
}

//Verifies the payment status in Stripe
export async function confirmPayment(req, res) {
  try {
    const { missionId } = req.params;
    const { paymentIntentId } = req.body;
    const customerId = req.user.stripe_customer_id;

    const mission = await _getById(missionId);
    if (!mission) return res.status(404).json({ error: 'Mission not found' });
    if (!ensureMissionOwner(mission, req.user.uid, res)) return;

    const pi = await retrievePI(paymentIntentId);

    if (pi.customer !== customerId) {
      return res
        .status(403)
        .json({ error: 'Payment does not belong to the logged user.' });
    }

    if (pi.status !== 'succeeded') {
      return res
        .status(400)
        .json({ error: `Payment was not completed (status=${pi.status})` });
    }
    console.log(mission.status);
    // Checks if mission can be in progress by states
    if (
      mission.status !== MISSION_LIFE_CYCLE.IN_PROGRESS.ID &&
      !MISSION_LIFE_CYCLE[mission.status].VALID_NEXT_STATES.includes(
        MISSION_LIFE_CYCLE.IN_PROGRESS.ID,
      )
    )
      return res.status(400).json({ error: messages.CANNOT_PAY_MISSION_STATE });

    // Updates total payment on mission
    const occupied_vacancies = await getOccupiedVacancies(mission.mid);
    await updateMissionPayment(
      mission.mid,
      occupied_vacancies.reduce(
        (sum, vacancy) => sum + Number(vacancy.monetary_reward),
        0,
      ) || 0,
    );

    // Mission and participants life cycle is updated
    await updateMissionStatus(missionId, MISSION_LIFE_CYCLE.IN_PROGRESS.ID);
    await startParticipants(missionId);

    // Gets all operations made in that payment
    const transactions = await getMissionPaymentsByStripeTransactionId(pi.id);

    // Finally, all participants are notified
    for (const transaction of transactions) {
      const vacancy = await getVacancyById(mission.mid, transaction.vacancy_id);
      let message;
      if (transaction.transaction_type === TRANSACTION_TYPE.INITIAL_FUNDING.ID)
        message = `Mission ${mission.title} has started! Talk to your team and start working.`;
      else if (
        transaction.transaction_type === TRANSACTION_TYPE.NEGOTIATION_EXTRA.ID
      )
        message = `Your new monetary reward for ${mission.title} has been funded. Now you can submit your part!`;
      else
        message = `Mission ${mission.title} has started for you! Talk to your team and start working.`;
      const notificationId = await createNotification({
        type: NOTIFICATION_TYPE.MISSION.ID,
        kind: NOTIFICATION_KIND.INFORMATIONAL.ID,
        action: NOTIFICATION_ACTION.MISSION_START.ID,
        status: null,
        message: message,
        senderId: req.user.uid,
        receiverId: vacancy.adventurer_id,
        payload: {
          associated_mission_id: mission.mid,
        },
      });
      emitToUser(vacancy.adventurer_id, 'mission:started', {
        notificationId,
        missionId: mission.mid,
        vacancyId: vacancy.adventurer_id,
        missionTitle: mission.title,
        senderId: req.user.uid,
        senderUsername: req.user.username,
        receiverId: vacancy.adventurer_id,
        type: NOTIFICATION_TYPE.MISSION.ID,
        message: message,
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
}

//Initiates Stripe Connect onboarding so the user (adventurer) can receive money.
export async function connectOnboard(req, res) {
  try {
    const userId = req.user.uid;
    const user = await getById(userId);
    if (!user) return res.status(404).json({ error: messages.USER_NOT_FOUND });

    let accountId = user.stripe_connected_id;

    if (!accountId) {
      const account = await createExpressAccount(user.email);
      accountId = account.id;

      await updateStripeConnectId(userId, accountId);
    }

    const refreshUrl = `${FRONTEND_URL}/stripe/connect/onboard`;
    const returnUrl = `${FRONTEND_URL}/stripe/connect/success`;

    const accountLink = await createAccountLink(
      accountId,
      refreshUrl,
      returnUrl,
    );

    return res.json({ url: accountLink.url });
  } catch (err) {
    console.error('Error Connect Onboard:', err);
    return res.status(500).json({ error: messages.UNEXPECTED_ERROR });
  }
}

export function connectSuccess(req, res) {
  res.send('Onboarding completed');
}

//Distributes funds to adventurers. Uses atomic locking to prevent double payments.
export async function releaseMissionPayment(req, res) {
  const { missionId } = req.params;
  const userId = req.user.uid;
  let lockedMission = null;

  try {
    lockedMission = await lockForRelease(missionId, userId);

    if (!lockedMission) {
      return res.status(409).json({
        error:
          'Cannot be released: The mission has not been accepted, you are not the owner, or it is already being processed.',
      });
    }

    const participants = await getParticipantsForRelease(missionId);
    if (!participants || participants.length === 0) {
      throw new Error('No adventurers are assigned.');
    }

    const missingStripe = participants.filter((p) => !p.stripe_connected_id);
    if (missingStripe.length > 0) {
      throw new Error('Stripe accounts are missing from the team.');
    }

    if (!lockedMission.stripe_pi_id)
      throw new Error('The original payment ID is missing.');
    const pi = await retrievePI(lockedMission.stripe_pi_id);
    if (pi.status !== 'succeeded')
      throw new Error('The original payment is invalid.');

    const platformFeePercent = 0.1;
    const transferResults = [];

    for (const adventurer of participants) {
      if (adventurer.transfer_id) {
        transferResults.push({ uid: adventurer.uid, success: true });
        continue;
      }

      try {
        const amountToPay =
          Number(adventurer.monetary_reward) * (1 - platformFeePercent);
        const centsToPay = Math.round(amountToPay * 100);
        const transfer = await createTransfer(
          {
            amount: centsToPay,
            currency: 'eur',
            destination: adventurer.stripe_connected_id,
            transfer_group: `mission_${missionId}`,
          },
          `release_${missionId}_uid_${adventurer.uid}`,
        );

        await updateTransferInfo(
          missionId,
          adventurer.uid,
          transfer.id,
          amountToPay,
        );
        transferResults.push({ uid: adventurer.uid, success: true });
      } catch (tErr) {
        console.error(tErr);
        transferResults.push({
          uid: adventurer.uid,
          success: false,
          error: tErr.message,
        });
      }
    }

    const allSuccess = transferResults.every((r) => r.success);
    const finalStatus = allSuccess ? 'released' : 'partially_released';

    await updateReleaseStatus(missionId, finalStatus);

    res.json({ success: allSuccess, transfers: transferResults });
  } catch (err) {
    console.error('Error release:', err);
    if (lockedMission) {
      await updateStatus(missionId, 'accepted');
    }
    res.status(500).json({ error: err.message || 'Error releasing funds.' });
  }
}

//Refunds the money to the client. Uses locking to prevent double refunds.
export async function refundMissionPayment(req, res) {
  const { missionId } = req.params;
  const userId = req.user.uid;
  let lockedMission = null;
  let originalStatus = null;

  try {
    const check = await _getById(missionId);
    if (!check) return res.status(404).json({ error: 'Mission not found' });
    originalStatus = check.status;

    lockedMission = await lockForRefund(missionId, userId);

    if (!lockedMission) {
      return res
        .status(409)
        .json({ error: 'Cannot be refunded (invalid or in use status).' });
    }

    if (!lockedMission.stripe_pi_id)
      throw new Error('There is no associated Stripe payment.');

    const refund = await createRefund(
      {
        payment_intent: lockedMission.stripe_pi_id,
        amount: Math.round(lockedMission.total_payment * 100),
        reason: 'requested_by_customer',
      },
      `refund_${missionId}`,
    );

    await finalizeRefund(missionId, refund.id);

    res.json({ success: true, refundId: refund.id });
  } catch (err) {
    console.error(err);

    if (lockedMission && originalStatus) {
      await updateStatus(missionId, originalStatus);
    }
    res.status(500).json({ error: 'Refund error.' });
  }
}

export async function getDashboardLink(req, res) {
  try {
    const userId = req.user.uid;
    const user = await getById(userId);
    if (!user) return res.status(404).json({ error: messages.USER_NOT_FOUND });

    // Checks if user actually completed login form
    const accountInfo = await retrieveConnectAccount(user.stripe_connected_id);
    if (!accountInfo.details_submitted) {
      return res.status(403).json({
        error: {
          general: [messages.STRIPE_ONBOARDING_NOT_COMPLETED],
        },
      });
    }

    const loginLink = await createLoginLink(user.stripe_connected_id);
    return res.json({ url: loginLink.url });
  } catch (err) {
    console.error('Error Login Link:', err);
    res.status(500).json({ error: { general: [messages.UNEXPECTED_ERROR] } });
  }
}
