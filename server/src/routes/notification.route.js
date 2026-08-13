import { Router } from 'express';
const router = Router();

import * as notificationController from '../controllers/notification.controller.js';
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
router.get('/me', verifyToken, notificationController.getMyNotifications);

// Mark all current user notifications as seen
router.post(
  '/seen',
  verifyToken,
  notificationController.markMyNotificationsAsSeen,
);

// Respond to a notification
router.post(
  '/:notificationId/respond',
  verifyToken,
  validateParamsSchema(respondToNotificationParamSchema),
  validateBodySchema(respondToNotificationBodySchema),
  notificationController.respondToNotification,
);

router.post(
  '/:notificationId/seen',
  verifyToken,
  validateParamsSchema(respondToNotificationParamSchema),
  notificationController.markMyNotificationAsSeen,
);

router.post(
  '/cron/auto-accept',
  verifyCronToken,
  notificationController.autoAcceptParticipation,
);

export default router;
