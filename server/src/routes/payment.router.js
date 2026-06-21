import { Router } from 'express';
const router = Router();
import {
  addCardToCustomer,
  listCards,
  setDefaultCard,
  deleteCard,
  payDefault,
  payNew,
  confirmPayment,
  connectOnboard,
  connectSuccess,
  releaseMissionPayment,
  refundMissionPayment,
  getDashboardLink,
} from '../controllers/payment.controller.js';
import { checkStripeCustomer } from '../services/payment.service.js';
import {
  validateBodySchema,
  validateParamsSchema,
} from '../middlewares/validations.middleware.js';
import { deleteCardParamSchema, setDefaultCardSchema } from '@hermyx/shared';

//Middleware to require customerId
const requireCustomer = async (req, res, next) => {
  try {
    const customerId = await checkStripeCustomer(req.user);

    req.user.stripe_customer_id = customerId;

    next();
  } catch (error) {
    console.error('Error in requireCustomer middleware:', error);
    return res.status(500).json({
      errors: { general: ['Error managing payment customer'] },
    });
  }
};

//Add a card
router.post('/add-card-to-customer', requireCustomer, addCardToCustomer);

//List the cards
router.get('/cards', requireCustomer, listCards);

//Set a card as default
router.post(
  '/cards/default',
  requireCustomer,
  validateBodySchema(setDefaultCardSchema),
  setDefaultCard,
);

//Delete a card
router.delete(
  '/cards/:paymentMethodId',
  requireCustomer,
  validateParamsSchema(deleteCardParamSchema),
  deleteCard,
);

//Pay with a predetermined card
router.post('/pay/default', requireCustomer, payDefault);

//Pay with a new card
router.post('/pay/new', requireCustomer, payNew);

//Route to confirm that we have charged the customer
router.post(
  '/missions/:missionId/confirm-payment',
  requireCustomer,
  confirmPayment,
);

//Route to register as a connected account
router.get('/connect/onboard', connectOnboard);

//Successful connected account route
router.get('/connect/success', connectSuccess);

//Route to release the money
router.post(
  '/missions/:missionId/release',
  requireCustomer,
  releaseMissionPayment,
);

//Refund route
router.post(
  '/missions/:missionId/refund',
  requireCustomer,
  refundMissionPayment,
);

//Route to get the dashboard link for connected accounts
router.post('/connect/login-link', getDashboardLink);

export default router;
