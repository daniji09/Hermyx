import { Router } from 'express';
import { getReportByIdValidation } from '@hermyx/shared';
import * as disputeController from '../controllers/dispute.controller.js';
import { validateParamsSchema } from '../middlewares/validation.middleware.js';

const router = Router();

/// GET
// Get all current user's disputes
router.get('/', disputeController.getMyDisputes);

// Get current user's unread count
router.get('/unread-count', disputeController.getMyDisputeUnreadCount);

// Get dispute by id
router.get(
  '/:rid',
  validateParamsSchema(getReportByIdValidation),
  disputeController.getDispute,
);

export default router;
