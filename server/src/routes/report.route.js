import {
  acceptAdventurersWorkBodyValidation,
  acceptAdventurersWorkParamsValidation,
  dismissBodyValidation,
  dismissParamValidation,
  reportAdventurerValidation,
  getReportByIdValidation,
  getReportsValidation,
  rejectAdventurersWorkBodyValidation,
  rejectAdventurersWorkParamValidation,
  reportMissionValidation,
  reportUserValidation,
} from '@hermyx/shared';
import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from '../middlewares/validation.middleware.js';
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
  reportController.getReports,
);

// Get report by id
router.get(
  '/:id',
  verifyAdmin,
  validateParamsSchema(getReportByIdValidation),
  reportController.getReport,
);

/// POST
// Report adventurer
router.post(
  '/adventurer',
  validateBodySchema(reportAdventurerValidation),
  reportController.reportAdventurer,
);

// Report user
router.post(
  '/user',
  validateBodySchema(reportUserValidation),
  reportController.reportUser,
);

// Report mission
router.post(
  '/mission',
  validateBodySchema(reportMissionValidation),
  reportController.reportMission,
);

// Accept adventurer's work
router.post(
  '/:rid/accept',
  verifyAdmin,
  validateParamsSchema(acceptAdventurersWorkParamsValidation),
  validateBodySchema(acceptAdventurersWorkBodyValidation),
  reportController.acceptAdventurersWork,
);

// Reject adventurer's work
router.post(
  '/:rid/reject',
  verifyAdmin,
  validateParamsSchema(rejectAdventurersWorkParamValidation),
  validateBodySchema(rejectAdventurersWorkBodyValidation),
  reportController.rejectAdventurersWork,
);

// Dismiss report
router.post(
  '/:rid/dismiss',
  verifyAdmin,
  validateParamsSchema(dismissParamValidation),
  validateBodySchema(dismissBodyValidation),
  reportController.dismiss,
);

export default router;
