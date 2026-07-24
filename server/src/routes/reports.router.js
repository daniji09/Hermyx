import {
  disputeValidation,
  reportMissionValidation,
  reportUserValidation,
} from '@hermyx/shared';
import { Router } from 'express';
import {
  disputeAdventurer,
  getReports,
  reportMission,
  reportUser,
} from '../controllers/reports.controller.js';
import { validateBodySchema } from '../middlewares/validations.middleware.js';
import { verifyAdmin } from '../middlewares/auth.middleware.js';
import { pagination } from '../middlewares/pagination.middleware.js';
const router = Router();

/// GET
router.get('/', verifyAdmin, await pagination(), getReports);

/// POST
// Report adventurer
router.post(
  '/dispute/adventurer',
  validateBodySchema(disputeValidation),
  disputeAdventurer,
);

// Report user
router.post('/user', validateBodySchema(reportUserValidation), reportUser);

// Report mission
router.post(
  '/mission',
  validateBodySchema(reportMissionValidation),
  reportMission,
);

export default router;
