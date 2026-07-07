import { Router } from 'express';
const router = Router();

import {
  createNotification,
  getMyNotifications,
  markMyNotificationAsSeen,
  respondToNotification,
} from '../controllers/notification.controller.js';
import {
  validateBodySchema,
  validateParamsSchema,
} from '../middlewares/validations.middleware.js';
import {
  createNotificationSchema,
  respondToNotificationBodySchema,
  respondToNotificationParamSchema,
} from '@hermyx/shared';

// List current user notifications
router.get('/me', getMyNotifications);

// Create a notification
router.post(
  '/',
  validateBodySchema(createNotificationSchema),
  createNotification,
);

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
