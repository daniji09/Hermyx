import {
  acceptAdventurersWorkValidation,
  dismissValidation,
  disputeValidation,
  getReportByIdValidation,
  getReportsValidation,
  rejectAdventurersWorkValidation,
  reportMissionValidation,
  reportUserValidation,
} from '@hermyx/shared';
import { Router } from 'express';
import {
  acceptAdventurersWork,
  dismiss,
  disputeAdventurer,
  getReport,
  getReports,
  rejectAdventurersWork,
  reportMission,
  reportUser,
} from '../controllers/reports.controller.js';
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from '../middlewares/validations.middleware.js';
import { verifyAdmin } from '../middlewares/auth.middleware.js';
import { pagination } from '../middlewares/pagination.middleware.js';
const router = Router();

/// GET
// Get all reports
router.get(
  '/',
  verifyAdmin,
  validateQuerySchema(getReportsValidation),
  await pagination(),
  getReports,
);

// Get report by id
router.get(
  '/:id',
  verifyAdmin,
  validateParamsSchema(getReportByIdValidation),
  getReport,
);

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

// Accept adventurer's work
router.post(
  '/:rid/accept',
  verifyAdmin,
  validateParamsSchema(acceptAdventurersWorkValidation),
  acceptAdventurersWork,
);

// Reject adventurer's work
router.post(
  '/:rid/reject',
  verifyAdmin,
  validateParamsSchema(rejectAdventurersWorkValidation),
  rejectAdventurersWork,
);

// Dismiss report
router.post(
  '/:rid/dismiss',
  verifyAdmin,
  validateParamsSchema(dismissValidation),
  dismiss,
);

export default router;
