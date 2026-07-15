import { Router } from 'express';
const router = Router();

import {
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

// List current user notifications
router.get('/me', getMyNotifications);

// Respond to a notification
router.post(
  '/:notificationId/respond',
  validateParamsSchema(respondToNotificationParamSchema),
  validateBodySchema(respondToNotificationBodySchema),
  respondToNotification,
);

router.post(
  '/:notificationId/seen',
  validateParamsSchema(respondToNotificationParamSchema),
  markMyNotificationAsSeen,
);

export default router;
