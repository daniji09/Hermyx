import {
  disputeValidation,
  getReportByIdValidation,
  getReportsValidation,
  reportMissionValidation,
  reportUserValidation,
} from '@hermyx/shared';
import { Router } from 'express';
import {
  disputeAdventurer,
  getReport,
  getReports,
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

export default router;
