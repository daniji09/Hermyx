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
