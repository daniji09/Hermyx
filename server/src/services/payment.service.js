import { HERMYX_FEE, messages } from '@hermyx/shared';
import * as missionPaymentModel from '../models/mission-payment.model.js';
import * as paymentProvider from '../providers/payment.provider.js';
import * as missionService from '../services/mission.service.js';
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

  // Finds mission
  const mission = await missionService.getMissionByIdOrThrow(mid);

  // Checks if mission belongs to user
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

  // Finds mission
  const mission = await missionService.getMissionByIdOrThrow(mid);

  // Checks if mission belongs to user
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
    },
    `${user.stripe_customer_id}_payment_on_${Date.now()}`,
  );

  return pi;
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

// Extracts from the payment method which customer is the owner of it, Stripe API's can send it as a string or as an object
const getPaymentMethodCustomerId = (paymentMethod) => {
  if (!paymentMethod.customer) return null;
  if (typeof paymentMethod.customer === 'string') return paymentMethod.customer;
  return paymentMethod.customer.id;
};

const checkMissionBelongsToUser = (missionOwnerUid, currentUserUid) => {
  // Checks mission is owned by user
  if (missionOwnerUid !== currentUserUid)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
};
