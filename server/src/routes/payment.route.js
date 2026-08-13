import { Router } from 'express';
const router = Router();

import * as paymentController from '../controllers/payment.controller.js';
import { requireStripeCustomerId } from '../middlewares/payment.middleware.js';
import {
  validateBodySchema,
  validateParamsSchema,
} from '../middlewares/validation.middleware.js';
import {
  confirmPaymentBodySchema,
  confirmPaymentParamSchema,
  deleteCardParamSchema,
  payDefaultParamSchema,
  payNewBodySchema,
  payNewParamSchema,
  setDefaultCardSchema,
} from '@hermyx/shared';

/// GETS
// List user's cards
router.get('/cards', requireStripeCustomerId, paymentController.listCards);

/// POSTS
// Add a card to the user
router.post('/cards', requireStripeCustomerId, paymentController.addCard);

//Set a card as default
router.post(
  '/cards/default',
  requireStripeCustomerId,
  validateBodySchema(setDefaultCardSchema),
  paymentController.setDefaultCard,
);

// Pay with a predetermined card
router.post(
  '/missions/:mid/pay/default',
  requireStripeCustomerId,
  validateParamsSchema(payDefaultParamSchema),
  paymentController.payDefault,
);

// Pay with a new card
router.post(
  '/missions/:mid/pay/new',
  requireStripeCustomerId,
  validateParamsSchema(payNewParamSchema),
  validateBodySchema(payNewBodySchema),
  paymentController.payNew,
);

// Confirms payment and changes db
router.post(
  '/missions/:mid/confirm',
  requireStripeCustomerId,
  validateParamsSchema(confirmPaymentParamSchema),
  validateBodySchema(confirmPaymentBodySchema),
  paymentController.confirmPayment,
);

/// DELETES
// Delete a card
router.delete(
  '/cards',
  requireStripeCustomerId,
  validateBodySchema(deleteCardParamSchema),
  paymentController.deleteCard,
);

// -----

//Route to register as a connected account
router.post('/connect/onboard', paymentController.connectOnboard);

//Successful connected account route
router.get('/connect/success', paymentController.connectSuccess);

//Route to release the money
router.post(
  '/missions/:missionId/release',
  requireStripeCustomerId,
  paymentController.releaseMissionPayment,
);

//Refund route
router.post(
  '/missions/:missionId/refund',
  requireStripeCustomerId,
  paymentController.refundMissionPayment,
);

//Route to get the dashboard link for connected accounts
router.post('/connect/login-link', paymentController.getDashboardLink);

export default router;
