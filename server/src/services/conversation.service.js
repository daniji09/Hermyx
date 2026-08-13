import { messages } from '@hermyx/shared';
import pool from '../config/db.config.js';
import { AppError } from '../utils/error.util.js';
import * as conversationModel from '../models/conversation.model.js';
import * as conversationParticipantModel from '../models/conversation-participant.model.js';
import * as conversationMessageModel from '../models/conversation-message.model.js';
import * as userService from './user.service.js';
import * as socketProvider from '../providers/socket.provider.js';
import * as storageProvider from '../providers/storage.provider.js';

/// Model access functions
export const createConversation = async (mid, client) => {
  checkMid(mid);
  return conversationModel.create(mid, client);
};

export const createDisputeConversation = async (client) =>
  conversationModel.createDisputeConversation(client);

export const createConversationParticipant = async (cid, userId, client) => {
  checkCid(cid);
  checkUid(userId);
  return conversationParticipantModel.create(cid, userId, client);
};

export const createMissionConversationParticipant = async (
  mid,
  userId,
  client,
) => {
  checkMid(mid);
  checkUid(userId);
  return conversationParticipantModel.addMissionConversationParticipant(
    mid,
    userId,
    client,
  );
};

export const leaveMissionConversation = async (mid, uid, client) => {
  checkMid(mid);
  checkUid(uid);
  return conversationParticipantModel.leaveMissionConversation(
    mid,
    uid,
    client,
  );
};

export const getConversationById = async (conversationId, client) => {
  checkCid(conversationId);
  return conversationModel.findById(conversationId, client);
};

export const getActiveConversationParticipantIds = async (
  conversationId,
  client,
) => {
  checkCid(conversationId);
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
  checkCid(conversationId);
  checkUid(userId);
  return conversationParticipantModel.isConversationParticipant(
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
  checkCid(conversationId);
  checkUid(userId);
  return conversationParticipantModel.markConversationAsReadByUserId(
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
  checkMid(missionId);
  checkUid(userId);
  return conversationParticipantModel.freezeMissionConversationHistory(
    missionId,
    userId,
    client,
  );
};

export const createMessage = async (message, client) => {
  checkMessage(message);
  return conversationMessageModel.create(message, client);
};

export const getUnreadMessageCountByUserId = async (
  userId,
  conversationType = null,
  excludedConversationType = null,
  client,
) => {
  checkUid(userId);
  return conversationMessageModel.countUnreadByUserId(
    userId,
    conversationType,
    excludedConversationType,
    client,
  );
};

export const closeMissionConversationType = async (mid, client) => {
  checkMid(mid);

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
  checkCid(conversationId);
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
  checkUid(currentUserId);
  checkUid(otherUserId);

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
  senderId,
  content,
  photo,
}) => {
  await checkConversationParticipant(conversationId, senderId);

  const canSend =
    await conversationParticipantModel.canSendMessageToConversation(
      conversationId,
      senderId,
    );
  if (!canSend) throw new AppError('This conversation is read-only.', 403);
  if (!content && !photo) throw new AppError('Message cannot be empty.', 400);

  const { attachmentUrl, attachmentType } = await saveAttachment(photo);
  const message = await createMessage({
    conversationId,
    senderId,
    content,
    attachmentUrl,
    attachmentType,
  });

  socketProvider.emitToConversation(
    conversationId,
    'conversation:message-created',
    message,
  );
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

export const getConversation = async (conversationId, userId) => {
  await checkConversationParticipant(conversationId, userId);
  const conversation = await getConversationByIdOrThrow(conversationId);
  const participants = await conversationParticipantModel.findByConversationId(
    conversationId,
    userId,
  );
  return { conversation, participants };
};

export const getConversationMessages = async (conversationId, userId) => {
  await checkConversationParticipant(conversationId, userId);
  return conversationMessageModel.findByConversationId(conversationId, userId);
};

export const getMyConversations = async (userId) => {
  checkUid(userId);
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

const checkConversationParticipant = async (conversationId, userId) => {
  const isParticipant = await isConversationParticipant(conversationId, userId);
  if (!isParticipant) throw buildUnauthorizedError();
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

const checkMid = (mid) => {
  if (!mid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Mid'));
};
const checkUid = (uid) => {
  if (!uid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Uid'));
};
const checkCid = (cid) => {
  if (!cid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Conversation id'));
};
const checkMessage = (message) => {
  if (!message)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Message data'));
};
const buildUnauthorizedError = () =>
  new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403);
const buildConversationNotFoundError = () =>
  new AppError('Conversation not found.', 404);
