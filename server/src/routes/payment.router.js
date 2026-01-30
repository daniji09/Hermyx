require("dotenv").config();
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const paymentService = require("../services/payment.service");

//middleware to require customerId
const requireCustomer = async (req, res, next) => {
  try {
    const customerId = await paymentService.checkStripeCustomer(req.user);

    req.user.stripe_customer_id = customerId;

    next();
  } catch (error) {
    console.error("Error in requireCustomer middleware:", error);
    return res.status(500).json({ error: "Error managing payment customer" });
  }
};

//add a card
router.post(
  "/add-card-to-customer",
  requireCustomer,
  paymentController.addCardToCustomer,
);

//list the cards
router.get("/cards", requireCustomer, paymentController.listCards);

//set a card as default
router.post(
  "/cards/default",
  requireCustomer,
  paymentController.setDefaultCard,
);

//delete a card
router.delete(
  "/cards/:paymentMethodId",
  requireCustomer,
  paymentController.deleteCard,
);

//pay with a predetermined card
router.post("/pay/default", requireCustomer, paymentController.payDefault);

//pay with a new card
router.post("/pay/new", requireCustomer, paymentController.payNew);

//route to confirm that we have charged the customer
router.post(
  "/missions/:missionId/confirm-payment",
  requireCustomer,
  paymentController.confirmPayment,
);

//route to register as a connected account
router.get("/connect/onboard", paymentController.connectOnboard);

//successful connected account route
router.get("/connect/success", paymentController.connectSuccess);

//route to release the money
router.post(
  "/missions/:missionId/release",
  requireCustomer,
  paymentController.releaseMissionPayment,
);

//refund route
router.post(
  "/missions/:missionId/refund",
  requireCustomer,
  paymentController.refundMissionPayment,
);

//route to get the dashboard link for connected accounts
router.post(
  "/connect/login-link",
  paymentController.getDashboardLink,
);

module.exports = router;
