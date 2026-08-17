import * as conversationService from '../services/conversation.service.js';

/// Controller functions
// Get all current user's conversations
export const getMyConversations = async (req, res, next) => {
  try {
    const result = await conversationService.getMyConversations(
      req.user.uid,
      req.pagination,
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Get current user unread count
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

// Get conversation by id
export const getConversation = async (req, res, next) => {
  try {
    const { conversation, participants } =
      await conversationService.getConversation(req.params.cid, req.user);
    return res.status(200).json({ conversation, participants });
  } catch (error) {
    next(error);
  }
};

// Get conversation by id messages
export const getConversationMessages = async (req, res, next) => {
  try {
    const result = await conversationService.getConversationMessages(
      req.params.cid,
      req.user,
      req.query,
    );
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Creates private conversation
export const createPrivateConversation = async (req, res, next) => {
  try {
    const conversation = await conversationService.createPrivateConversation(
      req.user.uid,
      req.body.otherUserId,
    );
    return res.status(201).json({ conversation });
  } catch (error) {
    next(error);
  }
};

// Creates a message
export const sendMessage = async (req, res, next) => {
  try {
    const message = await conversationService.sendMessage({
      cid: req.params.cid,
      sender: req.user,
      content: req.body.content,
      photo: req.file,
    });
    return res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
};

export const markConversationAsRead = async (req, res, next) => {
  try {
    const unreadCount = await conversationService.markConversationAsRead(
      req.params.cid,
      req.user.uid,
    );
    return res.status(200).json({ unreadCount });
  } catch (error) {
    next(error);
  }
};
