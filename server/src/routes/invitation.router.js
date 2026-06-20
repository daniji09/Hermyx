import { Router } from 'express';
const router = Router();

import {
  createInvitation,
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
router.post('/', validateBodySchema(createInvitationSchema), createInvitation);

//Respond to invitation
router.post(
  '/:invitationId/respond',
  validateParamsSchema(respondToInvitationParamSchema),
  validateBodySchema(respondToInvitationBodySchema),
  respondToInvitation,
);

export default router;
