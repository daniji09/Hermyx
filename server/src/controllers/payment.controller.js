import {
  retrievePI,
  createTransfer,
  createRefund,
} from '../providers/payment.provider.js';
import {
  findByMid as _getById,
  lockForRelease,
  getParticipantsForRelease,
  updateStatusByMid,
  updateReleaseStatus,
  lockForRefund,
  finalizeRefund,
} from '../models/mission.model.js';
import { updateTransferInfo } from '../models/mission-participation.model.js';
import * as paymentService from '../services/payment.service.js';

/// Controller functions
// List the user's saved cards and identifies the default one
// A second of courtesy if you change the default card and immediately list the cards again
export const listCards = async (req, res, next) => {
  try {
    const customerId = req.user.stripe_customer_id;
    const { customer, cards } = await paymentService.listCards(customerId);
    return res.status(200).json({
      defaultPaymentMethodId:
        customer.invoice_settings?.default_payment_method || null,
      cards: cards.data,
    });
  } catch (error) {
    next(error);
  }
};

// Creates a SetupIntent to save a credit card without charging it yet
export const addCard = async (req, res, next) => {
  try {
    const customerId = req.user.stripe_customer_id;
    const setupIntent = await paymentService.addCard(customerId);
    return res.status(200).json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    next(error);
  }
};

// Updates the customer's default payment method in Stripe
export const setDefaultCard = async (req, res, next) => {
  try {
    const customerId = req.user.stripe_customer_id;
    const { paymentMethodId } = req.body;
    await paymentService.setDefaultCard(customerId, paymentMethodId);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Charges the mission cost using the user's saved default card.
export const payDefault = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { pi, defaultPm } = await paymentService.payDefault(mid, req.user);
    return res.status(200).json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      paymentMethodId: defaultPm,
    });
  } catch (error) {
    next(error);
  }
};

// Creates a PaymentIntent for a new card. Can optionally save the card for future use.
export const payNew = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { saveCard = true } = req.body;
    const pi = await paymentService.payNew(mid, req.user, saveCard);
    return res
      .status(200)
      .json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
  } catch (error) {
    next(error);
  }
};

// Verifies the payment status in Stripe and changes database
export const confirmPayment = async (req, res, next) => {
  try {
    const { mid } = req.params;
    const { paymentIntentId } = req.body;
    await paymentService.confirmPayment(mid, paymentIntentId, req.user);
    return res.status(201).json({});
  } catch (error) {
    next(error);
  }
};

//Initiates Stripe Connect onboarding so the user (adventurer) can receive money.
export const connectOnboard = async (req, res, next) => {
  try {
    const accountLink = await paymentService.connectOnBoard(req.user);
    return res.status(200).json({ url: accountLink.url });
  } catch (error) {
    next(error);
  }
};

// Return Stripe Connect to Hermyx
export const connectSuccess = (req, res) => {
  return res.status(200).send('Onboarding completed');
};

// Connects to the Stripe dashboard
export async function getDashboardLink(req, res, next) {
  try {
    const url = await paymentService.getDashboardLink(req.user);
    return res.status(200).json(url);
  } catch (error) {
    next(error);
  }
}

// Deletes a card. If it was the default, clears the default setting.
export const deleteCard = async (req, res, next) => {
  try {
    const customerId = req.user.stripe_customer_id;
    const { paymentMethodId } = req.params;
    await paymentService.deleteCard(customerId, paymentMethodId);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// ------

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
      await updateStatusByMid(missionId, 'accepted');
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
      await updateStatusByMid(missionId, originalStatus);
    }
    res.status(500).json({ error: 'Refund error.' });
  }
}
