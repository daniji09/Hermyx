import { messages } from '@hermyx/shared';
import { AppError } from '../utils/error.util.js';
import * as paymentProvider from '../providers/payment.provider.js';
import * as userService from '../services/user.service.js';

export const requireStripeCustomerId = async (req, res, next) => {
  try {
    // Tries to get current's user data to check Stripe customer id state
    const userData = await userService.getUserByUidOrThrow(req.user.uid);
    if (userData && userData.stripe_customer_id) return next();

    // If user has not configure it yet, a new account in Stripe is created and user's info is updated
    const customerId = await paymentProvider.checkStripeCustomer(req.user);
    await userService.updateUserStripeCustomerIdByUid(req.user.uid, customerId);
    req.user.stripe_customer_id = customerId;

    next();
  } catch (error) {
    console.error('Error in requireCustomer middleware:', error);
    next(new AppError(messages.STRIPE_ONBOARDING_NOT_COMPLETED, 500));
  }
};
