import { Router } from 'express';
const router = Router();

import {
  createInvitation,
  getMyInvitations,
  markMyInvitationAsSeen,
  respondToInvitation,
} from '../controllers/invitation.controller.js';
import {
  validateBodySchema,
  validateParamsSchema,
} from '../middlewares/validations.middleware.js';
import {
  createInvitationSchema,
  respondToInvitationBodySchema,
  respondToNotificationParamSchema,
} from '@hermyx/shared';

//Create invitation
router.get('/me', getMyInvitations);

//Create invitation
router.post('/', validateBodySchema(createInvitationSchema), createInvitation);

//Respond to invitation
router.post(
  '/:notificationId/respond',
  validateParamsSchema(respondToNotificationParamSchema),
  validateBodySchema(respondToInvitationBodySchema),
  respondToInvitation,
);

router.post(
  '/:notificationId/seen',
  validateParamsSchema(respondToNotificationParamSchema),
  markMyInvitationAsSeen,
);

export default router;
