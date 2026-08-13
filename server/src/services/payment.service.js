import { messages } from '@hermyx/shared';
import * as missionPaymentModel from '../models/mission-payment.model.js';
import * as paymentProvider from '../providers/payment.provider.js';

/// Model access functions
// Get mission payments by vacancy id
export const getMissionPaymentsByVacancyId = async (vacancyId, client) =>
  missionPaymentModel.findByVacancyId(vacancyId, client);

// Create mission payment
export const createMissionPayment = async (paymentData, client) => {
  if (!paymentData)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Payment data'));
  return missionPaymentModel.create(paymentData, client);
};

// Refund mission payment
export const refundMissionPayment = async (amount, paymentId, client) =>
  missionPaymentModel.refund(amount, paymentId, client);

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
  console.log(cards);
  return { customer, cards };
};

/// Data checks
const checkStripeCustomerId = (stripeCustomerId) => {
  if (!stripeCustomerId)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Stripe customer id'));
};
