import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const _stripe = stripe;
export { _stripe as stripe };

// Creates a new Stripe Customer entity to track payments and save cards.
export const checkStripeCustomer = async (user) => {
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.username}`,
  });
  return customer.id;
};

// Retrieves the details of a specific customer from Stripe.
export const retrieveCustomer = async (customerId) => {
  return await stripe.customers.retrieve(customerId);
};

// Retrieves the details of a Connect Express account
export const retrieveConnectAccount = async (accountId) => {
  return await stripe.accounts.retrieve(accountId);
};

// Creates a SetupIntent. This is used to save a card for future use without charging it immediately.
export const createSetupIntent = async (customerId) => {
  return await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ['card'],
    usage: 'off_session',
  });
};

// Lists all credit cards associated with a customer.
export const listCards = async (customerId) => {
  return await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
};

// Retrieves a payment method by ID.
export const retrievePaymentMethod = async (paymentMethodId) => {
  return await stripe.paymentMethods.retrieve(paymentMethodId);
};

// Remove a payment method from a customer
export const detachCard = async (paymentMethodId) => {
  return await stripe.paymentMethods.detach(paymentMethodId);
};

// Set a specific card as the default
export const setDefaultCard = async (customerId, paymentMethodId) => {
  return await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
};

// Creates a payment charge using a saved card. Requires idempotencyKey to avoid double charges.
export const createPaymentIntentDefault = async (data, idempotencyKey) => {
  return await stripe.paymentIntents.create(data, { idempotencyKey });
};

// Creates a payment charge for a new card
export const createPaymentIntentNew = async (data, idempotencyKey) => {
  return await stripe.paymentIntents.create(data, { idempotencyKey });
};

// Retrieves the current status of a PaymentIntent
export const retrievePI = async (piId) => {
  return await stripe.paymentIntents.retrieve(piId);
};

// Refunds a payment back to the customer.
export const createRefund = async (data, idempotencyKey) => {
  return await stripe.refunds.create(data, { idempotencyKey });
};

// Creates a "Connect Express" account for the adventurer so they can receive money.
export const createExpressAccount = async (email) => {
  return await stripe.accounts.create({
    type: 'express',
    country: 'ES',
    email,
    business_type: 'individual',
    business_profile: {
      url: 'https://hermyx-test.com', // Hermyx app
      mcc: '8999', // Universal Stripe code for "Diverse professional services"
      product_description:
        'Performing micro-tasks and freelance services through the Hermyx platform.',
    },
    capabilities: { transfers: { requested: true } },
  });
};

// Generates the link to the Stripe-hosted onboarding form.
export const createAccountLink = async (accountId, refreshUrl, returnUrl) => {
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
};

// Generates a link to the Stripe Dashboard so the adventurer can see their balance.
export const createLoginLink = async (accountId) => {
  return await stripe.accounts.createLoginLink(accountId);
};

// Transfers funds from your platform to the adventurer's connected account.
export const createTransfer = async (data, idempotencyKey) => {
  return await stripe.transfers.create(data, { idempotencyKey });
};

// Deletes account
export const deleteConnectAccount = async (stripeAccountId) => {
  return await stripe.accounts.del(stripeAccountId);
};

// Deletes account and warns about it to Stripe
export const rejectAccount = async (stripe_connected_id) => {
  return await stripe.accounts.reject(stripe_connected_id, {
    reason: 'terms_of_service',
  });
};
