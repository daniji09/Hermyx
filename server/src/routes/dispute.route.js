import { Router } from 'express';
import { getReportByIdValidation, paginationQuerySchema } from '@hermyx/shared';
import * as disputeController from '../controllers/dispute.controller.js';
import {
  validateParamsSchema,
  validateQuerySchema,
} from '../middlewares/validation.middleware.js';
import { pagination } from '../middlewares/pagination.middleware.js';
import { verifyRegularUser } from '../middlewares/auth.middleware.js';

const router = Router();

/// GET
// Get all current user's disputes
router.get(
  '/',
  verifyRegularUser,
  validateQuerySchema(paginationQuerySchema),
  pagination(),
  disputeController.getMyDisputes,
);

// Get current user's unread count
router.get('/unread-count', disputeController.getMyDisputeUnreadCount);

// Get dispute by id
router.get(
  '/:rid',
  verifyRegularUser,
  validateParamsSchema(getReportByIdValidation),
  disputeController.getDispute,
);

export default router;
