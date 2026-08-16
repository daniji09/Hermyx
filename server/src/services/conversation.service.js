import { messages } from '@hermyx/shared';
import pool from '../config/db.config.js';
import { AppError, checkRequired } from '../utils/error.util.js';
import * as conversationModel from '../models/conversation.model.js';
import * as conversationParticipantModel from '../models/conversation-participant.model.js';
import * as conversationMessageModel from '../models/conversation-message.model.js';
import * as userService from './user.service.js';
import * as socketProvider from '../providers/socket.provider.js';
import * as storageProvider from '../providers/storage.provider.js';

/// Model access functions
// Get conversation by id
export const getConversationById = async (conversationId, client) => {
  checkRequired(conversationId, 'Conversation id');
  return conversationModel.findById(conversationId, client);
};

export const getConversationByIdOrThrow = async (conversationId, client) => {
  const conversation = await getConversationById(conversationId, client);
  if (!conversation)
    throw new AppError(
      messages.CONVERSATION.GENERAL.CONVERSATION_NOT_FOUND,
      404,
    );
  return conversation;
};

export const createConversation = async (type, mid, client) => {
  checkRequired(type, 'Conversation type');
  return await conversationModel.create(type, mid, client);
};

// Creates conversation participant
export const createConversationParticipant = async (cid, uid, client) => {
  checkRequired(cid, 'Conversation id');
  checkRequired(uid, 'User id');
  return await conversationParticipantModel.create(cid, uid, client);
};

// Creates a mission conversation participant
export const createMissionConversationParticipant = async (
  mid,
  userId,
  client,
) => {
  checkRequired(mid, 'Mission id');
  checkRequired(userId, 'User id');
  return await conversationParticipantModel.createMissionType(
    mid,
    userId,
    client,
  );
};

// Creates message
export const createMessage = async (message, client) => {
  checkRequired(message, 'Conversation message');
  return await conversationMessageModel.create(message, client);
};

// Gets unread message counter by user id
export const getUnreadMessageCountByUserId = async (
  userId,
  conversationType = null,
  excludedConversationType = null,
  client,
) => {
  checkRequired(userId, 'User id');
  return await conversationMessageModel.countUnreadByUserId(
    userId,
    conversationType,
    excludedConversationType,
    client,
  );
};

// Checks if a user is participant of a conversation
export const isConversationParticipant = async (
  conversationId,
  userId,
  client,
) => {
  checkRequired(conversationId, 'Conversation id');
  checkRequired(userId, 'User id');
  return await conversationParticipantModel.isConversationParticipant(
    conversationId,
    userId,
    client,
  );
};

export const markConversationAsReadByUserId = async (
  conversationId,
  userId,
  client,
) => {
  checkRequired(conversationId, 'Conversation id');
  checkRequired(userId, 'User id');
  return await conversationParticipantModel.markConversationAsReadByUserId(
    conversationId,
    userId,
    client,
  );
};

export const leaveMissionConversation = async (mid, uid, client) => {
  checkRequired(mid, 'Mission id');
  checkRequired(uid, 'User id');
  return await conversationParticipantModel.leaveMissionConversation(
    mid,
    uid,
    client,
  );
};

export const getActiveConversationParticipantIds = async (
  conversationId,
  client,
) => {
  checkRequired(conversationId, 'Conversation id');
  return await conversationParticipantModel.findActiveIdsByConversationId(
    conversationId,
    client,
  );
};

export const freezeMissionConversationHistory = async (
  missionId,
  userId,
  client,
) => {
  checkRequired(missionId, 'Mission id');
  checkRequired(userId, 'User id');
  return await conversationParticipantModel.freezeMissionConversationHistory(
    missionId,
    userId,
    client,
  );
};

export const closeMissionConversationType = async (mid, client) => {
  checkRequired(mid, 'Mission id');

  // Closes mission conversation type
  return await conversationModel.closeByMid(mid, client);
};

/// Endpoint complex functions
// Get all current user's conversations
export const getMyConversations = async (userId) => {
  checkRequired(userId, 'User id');
  return await conversationModel.findAllByUid(userId);
};

// Get current user's unread count
export const getMyUnreadMessageCount = async (userId) => {
  checkRequired(userId, 'User id');
  return await conversationMessageModel.countUnreadByUserId(
    userId,
    null,
    'dispute',
  );
};

// Get conversation by id
export const getConversation = async (conversationId, user) => {
  // Parameter checks
  checkRequired(conversationId, 'Conversation id');
  checkRequired(user, 'Current user');

  // Gets conversation by id and checks it
  const { conversation, isParticipant } = await getConversationAccess(
    conversationId,
    user,
  );

  // Find participants of conversation by cid
  const participants = await conversationParticipantModel.findByAllByCid(
    conversationId,
    isParticipant ? user.uid : null,
  );
  return { conversation, participants };
};

// Get conversation by id messages
export const getConversationMessages = async (conversationId, user) => {
  // Parameter checks
  checkRequired(conversationId, 'Conversation id');
  checkRequired(user, 'Current user');

  // Gets and checks conversation
  const { isAdminPreview } = await getConversationAccess(conversationId, user);

  // Get messages by conversation id
  return conversationMessageModel.findByConversationId(
    conversationId,
    user.uid,
    isAdminPreview,
  );
};

// Create private conversation
export const createPrivateConversation = async (currentUserId, otherUserId) => {
  checkRequired(currentUserId, 'Current user id');
  checkRequired(otherUserId, 'Other user id');

  // Check if user is trying to create a conversation with itself
  if (currentUserId === otherUserId) {
    throw new AppError(
      messages.CONVERSATION.GENERAL.CONVERSATION_WITH_YOURSELF,
      409,
    );
  }

  // Checks user exists
  await userService.getUserByUidOrThrow(otherUserId);

  // Checks if conversation already exists, if it does, it just simply returns it
  const existingConversation = await conversationModel.findPrivateConversation(
    currentUserId,
    otherUserId,
  );
  if (existingConversation) return existingConversation;

  // If it doesn't, creation is done via a database transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Creates conversation
    const conversation = await conversationModel.create(
      'private',
      null,
      client,
    );

    // Adds participants
    await conversationParticipantModel.addPrivateConversationParticipants(
      conversation.cid,
      currentUserId,
      otherUserId,
      client,
    );
    await client.query('COMMIT');
    return conversation;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Creates a message
export const sendMessage = async ({ cid, sender, content, photo }) => {
  // Parameter checks
  checkRequired(cid, 'Conversation id');
  checkRequired(sender, 'Sender user id');

  // Checks if message is empty
  if (!content && !photo)
    throw new AppError(messages.CONVERSATION.CREATE_MESSAGE.EMPTY, 400);

  // Get conversation and check if its participant or if its not a read only conversation
  const senderId = sender.uid;
  const initialConversation = await getConversationByIdOrThrow(cid);
  const isParticipant =
    await conversationParticipantModel.isConversationParticipant(cid, senderId);
  const canInitiallyJoinAsAdmin =
    sender.role === 'ADMIN' && initialConversation.type === 'dispute';
  if (!isParticipant && !canInitiallyJoinAsAdmin) {
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
  }
  if (initialConversation.closed_at) {
    throw new AppError(messages.CONVERSATION.CREATE_MESSAGE.READ_ONLY, 403);
  }
  if (
    isParticipant &&
    !(await conversationParticipantModel.canSendMessageToConversation(
      cid,
      senderId,
    ))
  ) {
    throw new AppError(messages.CONVERSATION.CREATE_MESSAGE.READ_ONLY, 403);
  }

  // First of all, attachment is saved and message creation needs a database transaction
  const { attachmentUrl, attachmentType } = await saveAttachment(photo);
  const client = await pool.connect();
  let message;
  try {
    await client.query('BEGIN');
    // Gets conversation and checks if its participant
    const conversation = await getConversationByIdOrThrow(cid, client);
    const isParticipant = await isConversationParticipant(
      cid,
      senderId,
      client,
    );
    const canJoinAsAdmin =
      sender.role === 'ADMIN' && conversation.type === 'dispute';

    // If its not participant, but is admin, it adds it to conversation
    if (!isParticipant && !canJoinAsAdmin)
      throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
    if (!isParticipant) {
      await conversationParticipantModel.create(cid, senderId, client);
    }

    // Checks if conversation is not read-only
    const canSend =
      await conversationParticipantModel.canSendMessageToConversation(
        cid,
        senderId,
        client,
      );
    if (!canSend)
      throw new AppError(messages.CONVERSATION.CREATE_MESSAGE.READ_ONLY, 403);

    // Lastly, creates message
    message = await conversationMessageModel.create(
      {
        conversationId: cid,
        senderId,
        content,
        attachmentUrl,
        attachmentType,
      },
      client,
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // Emits message to conversation and participants
  socketProvider.emitToConversation(
    cid,
    'conversation:message-created',
    message,
  );
  if (sender.role === 'ADMIN' && message.conversation_type === 'dispute') {
    socketProvider.emitToAdmins('report:updated', {
      reportId: message.report_id,
    });
  }
  const participantIds =
    await conversationParticipantModel.findActiveIdsByConversationId(cid);
  for (const participantId of participantIds) {
    if (participantId !== senderId) {
      socketProvider.emitToUser(
        participantId,
        'conversation:message-received',
        {
          conversationId: Number(cid),
          conversationType: message.conversation_type,
          messageId: message.mid,
          reportId: message.report_id,
          senderId,
        },
      );
    }
  }
  return message;
};

export const markConversationAsRead = async (conversationId, userId) => {
  // Parameter checks
  checkRequired(conversationId, 'Conversation id');
  checkRequired(userId, 'User id');

  // Checks that conversation and user exists
  await getConversationByIdOrThrow(conversationId);
  await userService.getUserByUidOrThrow(userId);

  // Marks conversation as read if it wasn't already
  const wasMarkedAsRead =
    await conversationParticipantModel.markConversationAsReadByUserId(
      conversationId,
      userId,
    );
  if (!wasMarkedAsRead)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
  return 0;
};

/// Helper functions
// Closes conversation
export const closeConversation = async (conversationId, client) => {
  checkRequired(conversationId, 'Conversation id');
  const conversation = await conversationModel.closeById(
    conversationId,
    client,
  );
  await conversationParticipantModel.disableConversationParticipants(
    conversationId,
    client,
  );
  return conversation;
};

// Gets and checks conversation
const getConversationAccess = async (conversationId, user) => {
  // Gets conversation
  const conversation = await getConversationByIdOrThrow(conversationId);

  // Checks if current user is actually participant
  const isParticipant = await isConversationParticipant(
    conversationId,
    user.uid,
  );
  const isAdminPreview =
    !isParticipant && user.role === 'ADMIN' && conversation.type === 'dispute';
  if (!isParticipant && !isAdminPreview)
    throw new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
  return { conversation, isAdminPreview, isParticipant };
};

// Saves attachment
const saveAttachment = async (photo) => {
  if (!photo) return { attachmentUrl: null, attachmentType: null };
  const isProduction = process.env.NODE_ENV === 'production';
  const attachmentUrl = isProduction
    ? await storageProvider.uploadToAzureBlob(photo, 'conversation-photos')
    : await storageProvider.saveToLocalStorage(
        photo,
        'uploads/conversation-photos',
      );
  return { attachmentUrl, attachmentType: 'image' };
};
