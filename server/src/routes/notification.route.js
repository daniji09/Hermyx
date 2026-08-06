import { Router } from 'express';
const router = Router();

import {
  autoAcceptParticipation,
  getMyNotifications,
  markMyNotificationsAsSeen,
  markMyNotificationAsSeen,
  respondToNotification,
} from '../controllers/notification.controller.js';
import {
  validateBodySchema,
  validateParamsSchema,
} from '../middlewares/validation.middleware.js';
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

// Mark all current user notifications as seen
router.post('/seen', verifyToken, markMyNotificationsAsSeen);

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
