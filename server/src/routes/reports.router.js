import { disputeValidation, reportUserValidation } from '@hermyx/shared';
import { Router } from 'express';
import {
  disputeAdventurer,
  reportUser,
} from '../controllers/reports.controller.js';
import { validateBodySchema } from '../middlewares/validations.middleware.js';
const router = Router();

/// GET

/// POST
// Report adventurer
router.post(
  '/dispute/adventurer',
  validateBodySchema(disputeValidation),
  disputeAdventurer,
);

// Report user
router.post('/user', validateBodySchema(reportUserValidation), reportUser);

export default router;
