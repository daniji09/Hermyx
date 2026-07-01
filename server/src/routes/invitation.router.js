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
  respondToInvitationParamSchema,
} from '@hermyx/shared';

//Create invitation
router.get('/me', getMyInvitations);

//Create invitation
router.post('/', validateBodySchema(createInvitationSchema), createInvitation);

//Respond to invitation
router.post(
  '/:invitationId/respond',
  validateParamsSchema(respondToInvitationParamSchema),
  validateBodySchema(respondToInvitationBodySchema),
  respondToInvitation,
);

router.post(
  '/:invitationId/seen',
  validateParamsSchema(respondToInvitationParamSchema),
  markMyInvitationAsSeen,
);

export default router;
