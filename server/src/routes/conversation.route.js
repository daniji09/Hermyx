import { Router } from 'express';
import multer from 'multer';
import {
  conversationIdMessagesParamsSchema,
  conversationIdParamsSchema,
  createMessageFileSchema,
  createMessageParamsSchema,
  createMessageBodySchema,
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

// Get conversation's messages
router.get(
  '/:cid/messages',
  validateParamsSchema(conversationIdMessagesParamsSchema),
  conversationController.getConversationMessages,
);

/// POST
// Create a private conversation
router.post(
  '/private',
  validateBodySchema(privateConversationSchema),
  conversationController.createPrivateConversation,
);

// Create a message on a conversation, it can be a photo
router.post(
  '/:cid/messages',
  upload.single('photo'),
  validateParamsSchema(createMessageParamsSchema),
  validateBodySchema(createMessageBodySchema),
  validateFileSchema(createMessageFileSchema),
  conversationController.sendMessage,
);

// ...
router.patch(
  '/:cid/read',
  validateParamsSchema(conversationIdParamsSchema),
  conversationController.markConversationAsRead,
);

export default router;
