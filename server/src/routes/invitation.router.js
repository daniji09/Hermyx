import { Router } from 'express';
const router = Router();

import {
  createInvitation,
  respondToInvitation,
} from '../controllers/invitation.controller.js';

//Crete invitation
router.post('/invitation', createInvitation);

//Respond to invitation
router.post('/:invitationId/respond', respondToInvitation);

export default router;
