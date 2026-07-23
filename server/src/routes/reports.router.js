import { disputeValidation } from '@hermyx/shared';
import { Router } from 'express';
import { disputeAdventurer } from '../controllers/reports.controller.js';
import { validateBodySchema } from '../middlewares/validations.middleware.js';
const router = Router();

/// GET

/// POST
router.post(
  '/dispute/adventurer',
  validateBodySchema(disputeValidation),
  disputeAdventurer,
);

export default router;
