import { Router } from 'express';
import multer from 'multer';
import {
  conversationIdParamsSchema,
  createMessageFileSchema,
  createMessageSchema,
  privateConversationSchema,
} from '@hermyx/shared';
import * as conversationController from '../controllers/conversation.controller.js';
import {
  validateBodySchema,
  validateFileSchema,
  validateParamsSchema,
} from '../middlewares/validation.middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/// GET
// Get all current user's conversations
router.get('/', conversationController.getMyConversations);

// Get current user's unread count
router.get('/unread-count', conversationController.getMyUnreadMessageCount);

// Get conversation by id
router.get(
  '/:cid',
  validateParamsSchema(conversationIdParamsSchema),
  conversationController.getConversation,
);

// ...
router.patch(
  '/:conversationId/read',
  validateParamsSchema(conversationIdParamsSchema),
  conversationController.markConversationAsRead,
);

router.post(
  '/:conversationId/messages',
  upload.single('photo'),
  validateParamsSchema(conversationIdParamsSchema),
  validateBodySchema(createMessageSchema),
  validateFileSchema(createMessageFileSchema),
  conversationController.sendMessage,
);

router.get(
  '/:conversationId/messages',
  validateParamsSchema(conversationIdParamsSchema),
  conversationController.getConversationMessages,
);
router.post(
  '/private',
  validateBodySchema(privateConversationSchema),
  conversationController.getOrCreatePrivateConversationWithUser,
);

export default router;
