import { Router } from 'express';
const router = Router();

import {
  autoAcceptParticipation,
  getMyNotifications,
  markMyNotificationAsSeen,
  respondToNotification,
} from '../controllers/notification.controller.js';
import {
  validateBodySchema,
  validateParamsSchema,
} from '../middlewares/validations.middleware.js';
import {
  respondToNotificationBodySchema,
  respondToNotificationParamSchema,
} from '@hermyx/shared';
import {
  verifyCronToken,
  verifyToken,
} from '../middlewares/auth.middleware.js';

// List current user notifications
router.get('/me', verifyToken, getMyNotifications);

// Respond to a notification
router.post(
  '/:notificationId/respond',
  verifyToken,
  validateParamsSchema(respondToNotificationParamSchema),
  validateBodySchema(respondToNotificationBodySchema),
  respondToNotification,
);

router.post(
  '/:notificationId/seen',
  verifyToken,
  validateParamsSchema(respondToNotificationParamSchema),
  markMyNotificationAsSeen,
);

router.post('/cron/auto-accept', verifyCronToken, autoAcceptParticipation);

export default router;
