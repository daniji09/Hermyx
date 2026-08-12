import { messages } from '@hermyx/shared';

import { findByUid } from '../models/user.model.js';

import {
  getConversationById,
  getOrCreatePrivateConversation,
  getConversationsByUserId,
} from '../models/conversation.model.js';
import {
  canSendMessageToConversation,
  getActiveConversationParticipantIds,
  getConversationParticipants,
  isConversationParticipant,
  markConversationAsReadByUserId,
} from '../models/conversation-participant.model.js';
import {
  createMessage,
  getMessagesByConversationId,
  getUnreadMessageCountByUserId,
} from '../models/conversation-message.model.js';

import {
  emitToConversation,
  emitToUser,
} from '../providers/socket.provider.js';
import {
  saveToLocalStorage,
  uploadToAzureBlob,
} from '../providers/storage.provider.js';

export const getOrCreatePrivateConversationWithUser = async (req, res) => {
  try {
    const currentUserId = req.user.uid;
    const { otherUserId } = req.body;

    if (currentUserId === otherUserId) {
      return res.status(400).json({
        errors: {
          general: ['You cannot create a conversation with yourself.'],
        },
      });
    }

    const otherUser = await findByUid(otherUserId);

    if (!otherUser) {
      return res.status(404).json({
        errors: { general: [messages.USER_NOT_FOUND] },
      });
    }

    const conversation = await getOrCreatePrivateConversation(
      currentUserId,
      otherUserId,
    );

    return res.status(200).json({ conversation });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.uid;
    const { conversationId } = req.params;
    const { content } = req.body;
    const photo = req.file;

    const isParticipant = await isConversationParticipant(
      conversationId,
      senderId,
    );

    if (!isParticipant) {
      return res.status(403).json({
        errors: { general: ['You are not part of this conversation.'] },
      });
    }

    const canSendMessage = await canSendMessageToConversation(
      conversationId,
      senderId,
    );

    if (!canSendMessage) {
      return res.status(403).json({
        errors: { general: ['This conversation is read-only.'] },
      });
    }

    if (!content.trim() && !photo) {
      return res.status(400).json({
        errors: { general: ['Message cannot be empty.'] },
      });
    }

    let attachmentUrl = null;
    let attachmentType = null;

    if (photo) {
      const isProduction = process.env.NODE_ENV === 'production';
      attachmentUrl = isProduction
        ? await uploadToAzureBlob(photo, 'conversation-photos')
        : await saveToLocalStorage(photo, 'uploads/conversation-photos');
      attachmentType = 'image';
    }

    const message = await createMessage({
      conversationId,
      senderId,
      content,
      attachmentUrl,
      attachmentType,
    });

    emitToConversation(conversationId, 'conversation:message-created', message);

    const participantIds =
      await getActiveConversationParticipantIds(conversationId);

    participantIds
      .filter((participantId) => participantId !== senderId)
      .forEach((participantId) => {
        emitToUser(participantId, 'conversation:message-received', {
          conversationId: Number(conversationId),
          conversationType: message.conversation_type,
          messageId: message.mid,
          reportId: message.report_id,
          senderId,
        });
      });

    return res.status(201).json({ message });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

export const getConversation = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { conversationId } = req.params;

    const isParticipant = await isConversationParticipant(
      conversationId,
      userId,
    );

    if (!isParticipant) {
      return res.status(403).json({
        errors: { general: [messages.UNAUTHORIZED_ERROR] },
      });
    }

    const conversation = await getConversationById(conversationId);

    if (!conversation) {
      return res.status(404).json({
        errors: { general: ['Conversation not found.'] },
      });
    }

    const participants = await getConversationParticipants(
      conversationId,
      userId,
    );

    return res.status(200).json({ conversation, participants });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

export const getConversationMessages = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { conversationId } = req.params;

    const isParticipant = await isConversationParticipant(
      conversationId,
      userId,
    );

    if (!isParticipant) {
      return res.status(403).json({
        errors: { general: [messages.UNAUTHORIZED_ERROR] },
      });
    }

    const messagesList = await getMessagesByConversationId(
      conversationId,
      userId,
    );

    return res.status(200).json({ messages: messagesList });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

export const getMyConversations = async (req, res) => {
  try {
    const userId = req.user.uid;

    const conversations = await getConversationsByUserId(userId);

    return res.status(200).json({ conversations });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

export const getMyUnreadMessageCount = async (req, res) => {
  try {
    const unreadCount = await getUnreadMessageCountByUserId(
      req.user.uid,
      null,
      'dispute',
    );

    return res.status(200).json({ unreadCount });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

export const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const wasMarkedAsRead = await markConversationAsReadByUserId(
      conversationId,
      req.user.uid,
    );

    if (!wasMarkedAsRead) {
      return res.status(403).json({
        errors: { general: [messages.UNAUTHORIZED_ERROR] },
      });
    }

    return res.status(200).json({ unreadCount: 0 });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};
