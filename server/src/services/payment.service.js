import { messages } from '@hermyx/shared';
import * as missionPaymentModel from '../models/mission-payment.model.js';
import * as paymentProvider from '../providers/payment.provider.js';
import { AppError } from '../utils/error.util.js';

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
  checkPaymentMethodId(paymentMethodId);

  // Checks if payment method received actually belongs to the current user
  await ensurePaymentMethodOwner(paymentMethodId, stripeCustomerId);

  // Then, changes the default card
  await paymentProvider.setDefaultCard(stripeCustomerId, paymentMethodId);

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

// Extracts from the payment method which customer is the owner of it, Stripe API's can send it as a string or as an object
const getPaymentMethodCustomerId = (paymentMethod) => {
  if (!paymentMethod.customer) return null;
  if (typeof paymentMethod.customer === 'string') return paymentMethod.customer;
  return paymentMethod.customer.id;
};
