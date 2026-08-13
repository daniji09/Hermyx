import * as conversationService from '../services/conversation.service.js';

export const getOrCreatePrivateConversationWithUser = async (
  req,
  res,
  next,
) => {
  try {
    const conversation =
      await conversationService.getOrCreatePrivateConversationWithUser(
        req.user.uid,
        req.body.otherUserId,
      );
    return res.status(200).json({ conversation });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const message = await conversationService.sendMessage({
      conversationId: req.params.conversationId,
      senderId: req.user.uid,
      content: req.body.content,
      photo: req.file,
    });
    return res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
};

export const getConversation = async (req, res, next) => {
  try {
    const { conversation, participants } =
      await conversationService.getConversation(
        req.params.conversationId,
        req.user.uid,
      );
    return res.status(200).json({ conversation, participants });
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (req, res, next) => {
  try {
    const messages = await conversationService.getConversationMessages(
      req.params.conversationId,
      req.user.uid,
    );
    return res.status(200).json({ messages });
  } catch (error) {
    next(error);
  }
};

export const getMyConversations = async (req, res, next) => {
  try {
    const conversations = await conversationService.getMyConversations(
      req.user.uid,
    );
    return res.status(200).json({ conversations });
  } catch (error) {
    next(error);
  }
};

export const getMyUnreadMessageCount = async (req, res, next) => {
  try {
    const unreadCount = await conversationService.getMyUnreadMessageCount(
      req.user.uid,
    );
    return res.status(200).json({ unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markConversationAsRead = async (req, res, next) => {
  try {
    const unreadCount = await conversationService.markConversationAsRead(
      req.params.conversationId,
      req.user.uid,
    );
    return res.status(200).json({ unreadCount });
  } catch (error) {
    next(error);
  }
};
