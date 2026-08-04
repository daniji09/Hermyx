import { messages } from '@hermyx/shared';

import { getById } from '../models/app_user.model.js';

import {
  createMessage,
  getConversationById,
  getMessagesByConversationId,
  getConversationParticipants,
  getOrCreatePrivateConversation,
  isConversationParticipant,
  getConversationsByUserId,
  getActiveConversationParticipantIds,
  getUnreadMessageCountByUserId,
  markConversationAsReadByUserId,
  canSendMessageToConversation,
} from '../models/conversation.model.js';

import { emitToConversation, emitToUser } from '../services/socket.service.js';

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

    const otherUser = await getById(otherUserId);

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

    const message = await createMessage(conversationId, senderId, content);

    emitToConversation(conversationId, 'conversation:message-created', message);

    const participantIds =
      await getActiveConversationParticipantIds(conversationId);

    participantIds
      .filter((participantId) => participantId !== senderId)
      .forEach((participantId) => {
        emitToUser(participantId, 'conversation:message-received', {
          conversationId: Number(conversationId),
          messageId: message.mid,
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

    const participants = await getConversationParticipants(conversationId);

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

    const messagesList = await getMessagesByConversationId(conversationId);

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
    const unreadCount = await getUnreadMessageCountByUserId(req.user.uid);

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
