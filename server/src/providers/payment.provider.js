import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const _stripe = stripe;
export { _stripe as stripe };

//Creates a new Stripe Customer entity to track payments and save cards.
export async function checkStripeCustomer(user) {
  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.username}`,
  });
  return customer.id;
}

//Retrieves the details of a specific customer from Stripe.
export async function retrieveCustomer(customerId) {
  return await stripe.customers.retrieve(customerId);
}

// Retrieves the details of a Connect Express account
export async function retrieveConnectAccount(accountId) {
  return await stripe.accounts.retrieve(accountId);
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

//Retrieves a payment method by ID.
export async function retrievePaymentMethod(paymentMethodId) {
  return await stripe.paymentMethods.retrieve(paymentMethodId);
}

//Remove a payment method from a customer
export async function detachCard(paymentMethodId) {
  return await stripe.paymentMethods.detach(paymentMethodId);
}

//Set a specific card as the default
export async function setDefaultCard(customerId, paymentMethodId) {
  return await stripe.customers.update(customerId, {
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
    business_type: 'individual',
    business_profile: {
      url: 'https://hermyx-test.com', // Our app
      mcc: '8999', // Universal Stripe code for "Diverse professional services"
      product_description:
        'Performing micro-tasks and freelance services through the Hermyx platform.',
    },
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

export async function rejectAccount(stripe_connected_id) {
  return await stripe.accounts.reject(stripe_connected_id, {
    reason: 'terms_of_service',
  });
}
