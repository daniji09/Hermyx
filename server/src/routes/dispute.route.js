import { Router } from 'express';
import { getReportByIdValidation } from '@hermyx/shared';
import * as disputeController from '../controllers/dispute.controller.js';
import { validateParamsSchema } from '../middlewares/validation.middleware.js';

const router = Router();

router.get('/', disputeController.getMyDisputes);
router.get('/unread-count', disputeController.getMyDisputeUnreadCount);
router.get(
  '/:id',
  validateParamsSchema(getReportByIdValidation),
  disputeController.getDispute,
);

export default router;
