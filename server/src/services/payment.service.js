const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const appUserModel = require("../models/app_user.model");

exports.stripe = stripe;

//Creates a new Stripe Customer entity to track payments and save cards.
exports.checkStripeCustomer = async (user) => {
  const userData = await appUserModel.getById(user.uid);

  if (userData && userData.stripe_customer_id) {
    return userData.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: `${user.username}`,
  });

  await appUserModel.updateStripeCustomer(user.uid, customer.id);

  return customer.id;
};

//Retrieves the details of a specific customer from Stripe.
exports.retrieveCustomer = async (customerId) => {
  return await stripe.customers.retrieve(customerId);
};

//Creates a SetupIntent. This is used to save a card for future use without charging it immediately.
exports.createSetupIntent = async (customerId) => {
  return await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });
};
//Lists all credit cards associated with a customer.
exports.listCards = async (customerId) => {
  return await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });
};

//Remove a payment method from a customer
exports.detachCard = (paymentMethodId) => {
  stripe.paymentMethods.detach(paymentMethodId);
};

//Set a specific card as the default
exports.setDefaultCard = (customerId, paymentMethodId) => {
  stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
};

//Creates a payment charge using a saved card. Requires idempotencyKey to avoid double charges.
exports.createPaymentIntentDefault = async (data, idempotencyKey) => {
  return await stripe.paymentIntents.create(data, { idempotencyKey });
};

//Creates a payment charge for a new card
exports.createPaymentIntentNew = async (data, idempotencyKey) => {
  return await stripe.paymentIntents.create(data, { idempotencyKey });
};

//Retrieves the current status of a PaymentIntent
exports.retrievePI = async (piId) => {
  return await stripe.paymentIntents.retrieve(piId);
};

//Refunds a payment back to the customer.
exports.createRefund = async (data, idempotencyKey) => {
  return await stripe.refunds.create(data, { idempotencyKey });
};

//Creates a "Connect Express" account for the adventurer so they can receive money.
exports.createExpressAccount = async (email) => {
  return await stripe.accounts.create({
    type: "express",
    country: "ES",
    email,
    capabilities: { transfers: { requested: true } },
  });
};

//Generates the link to the Stripe-hosted onboarding form.
exports.createAccountLink = async (accountId, refreshUrl, returnUrl) => {
  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
};

//Generates a link to the Stripe Dashboard so the adventurer can see their balance.
exports.createLoginLink = async (accountId) => {
  return await stripe.accounts.createLoginLink(accountId);
};

//Transfers funds from your platform to the adventurer's connected account.
exports.createTransfer = async (data, idempotencyKey) => {
  return await stripe.transfers.create(data, { idempotencyKey });
};
