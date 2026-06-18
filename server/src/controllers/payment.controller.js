import {
  //CreateCustomer,
  createSetupIntent,
  checkStripeCustomer,
  retrieveCustomer,
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
  lockForRefund,
  finalizeRefund,
} from '../models/mission.model.js';

import { updateTransferInfo } from '../models/mission_participation.model.js';

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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
}

//Updates the customer's default payment method in Stripe.
export async function setDefaultCard(req, res) {
  try {
    const customerId = req.user.stripe_customer_id;
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'paymentMethodId is missing' });
    }

    await _setDefaultCard(customerId, paymentMethodId);
    res.json({
      success: true,
      message: 'Card set as default',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

//Deletes a card. If it was the default, clears the default setting
export async function deleteCard(req, res) {
  try {
    const customerId = req.user.stripe_customer_id;
    const { paymentMethodId } = req.params;

    const customer = await retrieveCustomer(customerId);
    const defaultPm = customer.invoice_settings?.default_payment_method || null;

    await detachCard(paymentMethodId);

    if (defaultPm === paymentMethodId) {
      await setDefaultCard(customerId, null);
    }

    res.json({ success: true, message: 'Card deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
        amount: Math.round(mission.monetary_reward * 100),
        currency: 'eur',
        customer: customerId,
        payment_method: defaultPm,
        metadata: { missionId, ownerId: req.user.uid },
      },
      `pay_default_${missionId}_${Date.now()}`,
    );

    await updatePaymentInfo(missionId, pi.id, 'pending_payment');

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
    const { missionId, saveCard = true } = req.body;

    if (!missionId) return res.status(400).json({ error: 'Missing missionId' });

    const mission = await _getById(missionId);
    if (!mission) return res.status(404).json({ error: 'Mission not found' });
    if (!ensureMissionOwner(mission, req.user.uid, res)) return;

    const reusablePi = await getReusablePaymentIntent(mission, customerId);
    if (reusablePi) {
      return res.json({
        clientSecret: reusablePi.client_secret,
        paymentIntentId: reusablePi.id,
      });
    }

    const pi = await createPaymentIntentNew(
      {
        amount: Math.round(mission.monetary_reward * 100),
        currency: 'eur',
        customer: customerId,
        automatic_payment_methods: { enabled: true },
        ...(saveCard ? { setup_future_usage: 'off_session' } : {}),
        metadata: { missionId, ownerId: req.user.uid },
      },
      `pay_new_${missionId}_${Date.now()}`,
    );

    await updatePaymentInfo(missionId, pi.id, 'pending_payment');

    res.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
  } catch (err) {
    handlePaymentError(err, res);
  }
}

//Verifies the payment status in Stripe and marks the mission as funded.
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

    await updatePaymentInfo(missionId, pi.id, 'funded');

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error while confirming' });
  }
}

//Initiates Stripe Connect onboarding so the user (adventurer) can receive money.
export async function connectOnboard(req, res) {
  try {
    const userId = req.user.uid;

    const user = await getById(userId);
    if (!user) return res.status(404).send('User not found');

    let accountId = user.stripe_connected_id;

    if (!accountId) {
      const account = await createExpressAccount(user.email);
      accountId = account.id;

      await updateStripeConnectId(userId, accountId);
    }

    const refreshUrl = `http://localhost:3000/stripe/connect/onboard`;
    const returnUrl = `http://localhost:3000/stripe/connect/success`;

    const accountLink = await createAccountLink(
      accountId,
      refreshUrl,
      returnUrl,
    );

    res.redirect(accountLink.url);
  } catch (err) {
    console.error('Error Connect Onboard:', err);
    res.status(500).send('Failed to initialize payment registration');
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
    const totalToDistribute =
      lockedMission.monetary_reward * (1 - platformFeePercent);
    const amountPerPerson = totalToDistribute / participants.length;
    const centsPerPerson = Math.round(amountPerPerson * 100);

    const transferResults = [];

    for (const adventurer of participants) {
      if (adventurer.transfer_id) {
        transferResults.push({ uid: adventurer.uid, success: true });
        continue;
      }

      try {
        const transfer = await createTransfer(
          {
            amount: centsPerPerson,
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
          amountPerPerson,
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

    await updateStatus(missionId, finalStatus);

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
        amount: Math.round(lockedMission.monetary_reward * 100),
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

    if (!user || !user.stripe_connected_id) {
      return res
        .status(400)
        .json({ error: 'The user does not have a connected stripe account' });
    }

    const loginLink = await createLoginLink(user.stripe_connected_id);

    res.json({ url: loginLink.url });
  } catch (err) {
    console.error('Error Login Link:', err);
    res.status(500).json({ error: 'Could not access the dashboard.' });
  }
}
