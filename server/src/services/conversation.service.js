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
export const createConversation = async (type, mid, client) => {
  checkRequired(type, 'Conversation type');
  return conversationModel.create(type, mid, client);
};

// Creates conversation participant
export const createConversationParticipant = async (cid, uid, client) => {
  checkRequired(cid, 'Conversation id');
  checkRequired(uid, 'User id');
  return conversationParticipantModel.create(cid, uid, client);
};

// Creates a mission conversation participant
export const createMissionConversationParticipant = async (
  mid,
  userId,
  client,
) => {
  checkRequired(mid, 'Mission id');
  checkRequired(userId, 'User id');
  return conversationParticipantModel.createMissionType(mid, userId, client);
};

// Creates message
export const createMessage = async (message, client) => {
  checkRequired(message, 'Conversation message');
  return conversationMessageModel.create(message, client);
};

export const markConversationAsReadByUserId = async (
  conversationId,
  userId,
  client,
) => {
  checkRequired(conversationId, 'Conversation id');
  checkRequired(userId, 'User id');
  return conversationParticipantModel.markConversationAsReadByUserId(
    conversationId,
    userId,
    client,
  );
};

export const leaveMissionConversation = async (mid, uid, client) => {
  checkRequired(mid, 'Mission id');
  checkRequired(uid, 'User id');
  return conversationParticipantModel.leaveMissionConversation(
    mid,
    uid,
    client,
  );
};

export const getConversationById = async (conversationId, client) => {
  checkRequired(conversationId, 'Conversation id');
  return conversationModel.findById(conversationId, client);
};

export const getActiveConversationParticipantIds = async (
  conversationId,
  client,
) => {
  checkRequired(conversationId, 'Conversation id');
  return conversationParticipantModel.findActiveIdsByConversationId(
    conversationId,
    client,
  );
};

export const isConversationParticipant = async (
  conversationId,
  userId,
  client,
) => {
  checkRequired(conversationId, 'Conversation id');
  checkRequired(userId, 'User id');
  return conversationParticipantModel.isConversationParticipant(
    conversationId,
    userId,
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
  return conversationParticipantModel.freezeMissionConversationHistory(
    missionId,
    userId,
    client,
  );
};

export const getUnreadMessageCountByUserId = async (
  userId,
  conversationType = null,
  excludedConversationType = null,
  client,
) => {
  checkRequired(userId, 'User id');
  return conversationMessageModel.countUnreadByUserId(
    userId,
    conversationType,
    excludedConversationType,
    client,
  );
};

export const closeMissionConversationType = async (mid, client) => {
  checkRequired(mid, 'Mission id');

  // Closes mission conversation type
  return await conversationModel.closeMissionType(mid, client);
};

/// Endpoint complex functions
export const getConversationByIdOrThrow = async (conversationId, client) => {
  const conversation = await getConversationById(conversationId, client);
  if (!conversation) throw buildConversationNotFoundError();
  return conversation;
};

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

export const getOrCreatePrivateConversationWithUser = async (
  currentUserId,
  otherUserId,
) => {
  checkRequired(currentUserId, 'Current user id');
  checkRequired(otherUserId, 'Other user id');

  if (currentUserId === otherUserId) {
    throw new AppError('You cannot create a conversation with yourself.', 400);
  }

  await userService.getUserByUidOrThrow(otherUserId);

  const existingConversation = await conversationModel.findPrivateConversation(
    currentUserId,
    otherUserId,
  );
  if (existingConversation) return existingConversation;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const conversation =
      await conversationModel.createPrivateConversation(client);
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

export const sendMessage = async ({
  conversationId,
  sender,
  content,
  photo,
}) => {
  if (!content && !photo) throw new AppError('Message cannot be empty.', 400);

  const senderId = sender.uid;
  const initialConversation = await getConversationByIdOrThrow(conversationId);
  const initiallyParticipant = await isConversationParticipant(
    conversationId,
    senderId,
  );
  const canInitiallyJoinAsAdmin =
    sender.role === 'ADMIN' && initialConversation.type === 'dispute';
  if (!initiallyParticipant && !canInitiallyJoinAsAdmin) {
    throw buildUnauthorizedError();
  }
  if (initialConversation.closed_at) {
    throw new AppError('This conversation is read-only.', 403);
  }
  if (
    initiallyParticipant &&
    !(await conversationParticipantModel.canSendMessageToConversation(
      conversationId,
      senderId,
    ))
  ) {
    throw new AppError('This conversation is read-only.', 403);
  }

  const { attachmentUrl, attachmentType } = await saveAttachment(photo);
  const client = await pool.connect();
  let message;
  try {
    await client.query('BEGIN');
    const conversation = await getConversationByIdOrThrow(
      conversationId,
      client,
    );
    const isParticipant = await isConversationParticipant(
      conversationId,
      senderId,
      client,
    );
    const canJoinAsAdmin =
      sender.role === 'ADMIN' && conversation.type === 'dispute';

    if (!isParticipant && !canJoinAsAdmin) throw buildUnauthorizedError();
    if (!isParticipant) {
      await createConversationParticipant(conversationId, senderId, client);
    }

    const canSend =
      await conversationParticipantModel.canSendMessageToConversation(
        conversationId,
        senderId,
        client,
      );
    if (!canSend) throw new AppError('This conversation is read-only.', 403);

    message = await createMessage(
      {
        conversationId,
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

  socketProvider.emitToConversation(
    conversationId,
    'conversation:message-created',
    message,
  );
  if (sender.role === 'ADMIN' && message.conversation_type === 'dispute') {
    socketProvider.emitToAdmins('report:updated', {
      reportId: message.report_id,
    });
  }
  const participantIds =
    await getActiveConversationParticipantIds(conversationId);
  for (const participantId of participantIds) {
    if (participantId !== senderId) {
      socketProvider.emitToUser(
        participantId,
        'conversation:message-received',
        {
          conversationId: Number(conversationId),
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

export const getConversation = async (conversationId, user) => {
  const { conversation, isParticipant } = await getConversationAccess(
    conversationId,
    user,
  );
  const participants = await conversationParticipantModel.findByConversationId(
    conversationId,
    isParticipant ? user.uid : null,
  );
  return { conversation, participants };
};

export const getConversationMessages = async (conversationId, user) => {
  const { isAdminPreview } = await getConversationAccess(conversationId, user);
  return conversationMessageModel.findByConversationId(
    conversationId,
    user.uid,
    isAdminPreview,
  );
};

export const getMyConversations = async (userId) => {
  checkRequired(userId, 'User id');
  return conversationModel.findByUserId(userId);
};

export const getMyUnreadMessageCount = async (userId) =>
  getUnreadMessageCountByUserId(userId, null, 'dispute');

export const markConversationAsRead = async (conversationId, userId) => {
  const wasMarkedAsRead = await markConversationAsReadByUserId(
    conversationId,
    userId,
  );
  if (!wasMarkedAsRead) throw buildUnauthorizedError();
  return 0;
};

const getConversationAccess = async (conversationId, user) => {
  const conversation = await getConversationByIdOrThrow(conversationId);
  const isParticipant = await isConversationParticipant(
    conversationId,
    user.uid,
  );
  const isAdminPreview =
    !isParticipant && user.role === 'ADMIN' && conversation.type === 'dispute';
  if (!isParticipant && !isAdminPreview) throw buildUnauthorizedError();
  return { conversation, isAdminPreview, isParticipant };
};

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

const buildUnauthorizedError = () =>
  new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
const buildConversationNotFoundError = () =>
  new AppError('Conversation not found.', 404);
