import { Router } from 'express';
import multer from 'multer';
import {
  conversationIdParamsSchema,
  createMessageFileSchema,
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
} from '../controllers/conversation.controller.js';
import {
  validateBodySchema,
  validateFileSchema,
  validateParamsSchema,
} from '../middlewares/validation.middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/private',
  validateBodySchema(privateConversationSchema),
  getOrCreatePrivateConversationWithUser,
);

router.get('/', getMyConversations);

router.get('/unread-count', getMyUnreadMessageCount);

router.patch(
  '/:conversationId/read',
  validateParamsSchema(conversationIdParamsSchema),
  markConversationAsRead,
);

router.get(
  '/:conversationId',
  validateParamsSchema(conversationIdParamsSchema),
  getConversation,
);

router.post(
  '/:conversationId/messages',
  upload.single('photo'),
  validateParamsSchema(conversationIdParamsSchema),
  validateBodySchema(createMessageSchema),
  validateFileSchema(createMessageFileSchema),
  sendMessage,
);

router.get(
  '/:conversationId/messages',
  validateParamsSchema(conversationIdParamsSchema),
  getConversationMessages,
);

export default router;
