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
import {
  verifyAdmin,
  verifyRegularUser,
} from '../middlewares/auth.middleware.js';
import { pagination } from '../middlewares/pagination.middleware.js';
const router = Router();

/// GET
// Get all reports
router.get(
  '/',
  verifyAdmin,
  validateQuerySchema(getReportsValidation),
  pagination(),
  reportController.getReports,
);

// Get report by id
router.get(
  '/:rid',
  verifyAdmin,
  validateParamsSchema(getReportByIdValidation),
  reportController.getReport,
);

/// POST
// Report collaborator
router.post(
  '/collaborator',
  verifyRegularUser,
  validateBodySchema(reportAdventurerValidation),
  reportController.reportAdventurer,
);

// Report user
router.post(
  '/user',
  verifyRegularUser,
  validateBodySchema(reportUserValidation),
  reportController.reportUser,
);

// Report service
router.post(
  '/service',
  verifyRegularUser,
  validateBodySchema(reportMissionValidation),
  reportController.reportMission,
);

// Accept collaborator's work
router.post(
  '/:rid/accept',
  verifyAdmin,
  validateParamsSchema(acceptAdventurersWorkParamsValidation),
  validateBodySchema(acceptAdventurersWorkBodyValidation),
  reportController.acceptAdventurersWork,
);

// Reject collaborator's work
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
