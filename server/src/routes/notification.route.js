import { Router } from 'express';
const router = Router();

import * as notificationController from '../controllers/notification.controller.js';
import {
  validateBodySchema,
  validateParamsSchema,
  validateQuerySchema,
} from '../middlewares/validation.middleware.js';
import {
  respondToNotificationBodySchema,
  respondToNotificationParamSchema,
  paginationQuerySchema,
} from '@hermyx/shared';
import { pagination } from '../middlewares/pagination.middleware.js';

/// GETS
// List current user notifications
router.get(
  '/me',
  validateQuerySchema(paginationQuerySchema),
  pagination(),
  notificationController.getMyNotifications,
);

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
