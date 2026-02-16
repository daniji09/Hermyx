import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import { getById, updateStripeCustomer } from '../models/app_user.model.js';

const _stripe = stripe;
export { _stripe as stripe };

//Creates a new Stripe Customer entity to track payments and save cards.
export async function checkStripeCustomer(user) {
  const userData = await getById(user.uid);

  if (userData && userData.stripe_customer_id) {
    return userData.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.username}`,
  });

  await updateStripeCustomer(user.uid, customer.id);

  return customer.id;
}

//Retrieves the details of a specific customer from Stripe.
export async function retrieveCustomer(customerId) {
  return await stripe.customers.retrieve(customerId);
}

//Creates a SetupIntent. This is used to save a card for future use without charging it immediately.
export async function createSetupIntent(customerId) {
  return await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  });
}
//Lists all credit cards associated with a customer.
export async function listCards(customerId) {
  return await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
}

//Remove a payment method from a customer
export function detachCard(paymentMethodId) {
  stripe.paymentMethods.detach(paymentMethodId);
}

//Set a specific card as the default
export function setDefaultCard(customerId, paymentMethodId) {
  stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
}

//Creates a payment charge using a saved card. Requires idempotencyKey to avoid double charges.
export async function createPaymentIntentDefault(data, idempotencyKey) {
  return await stripe.paymentIntents.create(data, { idempotencyKey });
}

//Creates a payment charge for a new card
export async function createPaymentIntentNew(data, idempotencyKey) {
  return await stripe.paymentIntents.create(data, { idempotencyKey });
}

//Retrieves the current status of a PaymentIntent
export async function retrievePI(piId) {
  return await stripe.paymentIntents.retrieve(piId);
}

//Refunds a payment back to the customer.
export async function createRefund(data, idempotencyKey) {
  return await stripe.refunds.create(data, { idempotencyKey });
}

//Creates a "Connect Express" account for the adventurer so they can receive money.
export async function createExpressAccount(email) {
  return await stripe.accounts.create({
    type: 'express',
    country: 'ES',
    email,
    capabilities: { transfers: { requested: true } },
  });
}

//Generates the link to the Stripe-hosted onboarding form.
export async function createAccountLink(accountId, refreshUrl, returnUrl) {
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

//Generates a link to the Stripe Dashboard so the adventurer can see their balance.
export async function createLoginLink(accountId) {
  return await stripe.accounts.createLoginLink(accountId);
}

//Transfers funds from your platform to the adventurer's connected account.
export async function createTransfer(data, idempotencyKey) {
  return await stripe.transfers.create(data, { idempotencyKey });
}
