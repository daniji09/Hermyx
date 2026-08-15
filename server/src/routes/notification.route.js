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

/// GETS
// List current user notifications
router.get('/me', notificationController.getMyNotifications);

/// POSTS
// Mark all current user's unseen notifications as seen
router.post('/seen', notificationController.markMyNotificationsAsSeen);

router.post(
  '/:nid/seen',
  validateParamsSchema(respondToNotificationParamSchema),
  notificationController.markMyNotificationAsSeen,
);

// Respond to a notification
router.post(
  '/:nid/respond',

  validateParamsSchema(respondToNotificationParamSchema),
  validateBodySchema(respondToNotificationBodySchema),
  notificationController.respondToNotification,
);

export default router;
