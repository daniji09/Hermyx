import { Router } from 'express';
import {
  conversationIdParamsSchema,
  createMessageSchema,
  privateConversationSchema,
} from '@hermyx/shared';
import {
  getOrCreatePrivateConversationWithUser,
  sendMessage,
  getConversationMessages,
  getConversation,
  getMyConversations,
  getMyUnreadMessageCount,
  markConversationAsRead,
} from '../controllers/conversations.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
  validateBodySchema,
  validateParamsSchema,
} from '../middlewares/validations.middleware.js';

const router = Router();

router.post(
  '/private',
  verifyToken,
  validateBodySchema(privateConversationSchema),
  getOrCreatePrivateConversationWithUser,
);

router.get('/', verifyToken, getMyConversations);

router.get('/unread-count', verifyToken, getMyUnreadMessageCount);

router.patch(
  '/:conversationId/read',
  verifyToken,
  validateParamsSchema(conversationIdParamsSchema),
  markConversationAsRead,
);

router.get(
  '/:conversationId',
  verifyToken,
  validateParamsSchema(conversationIdParamsSchema),
  getConversation,
);

router.post(
  '/:conversationId/messages',
  verifyToken,
  validateParamsSchema(conversationIdParamsSchema),
  validateBodySchema(createMessageSchema),
  sendMessage,
);

router.get(
  '/:conversationId/messages',
  verifyToken,
  validateParamsSchema(conversationIdParamsSchema),
  getConversationMessages,
);

export default router;
