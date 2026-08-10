import { messages } from '@hermyx/shared';
import * as conversationModel from '../models/conversation.model.js';
import * as conversationParticipantModel from '../models/conversation-participant.model.js';

/// Model access functions
// Create conversation
export const createConversation = async (mid, client) => {
  checkMid(mid);

  // Creates conversation
  const conversation = await conversationModel.create(mid, client);
  return conversation;
};

// Create conversation participant
export const createConversationParticipant = async (cid, ownerId, client) => {
  checkCid(cid);
  checkUid(ownerId);

  // Creates conversation participant
  const conversationParticipant = await conversationParticipantModel.create(
    cid,
    ownerId,
    client,
  );
  return conversationParticipant;
};

/// Data checks
const checkMid = (mid) => {
  if (!mid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Mid'));
};

const checkUid = (uid) => {
  if (!uid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Uid'));
};

const checkCid = (cid) => {
  if (!cid) throw new Error(messages.GENERAL.FIELD_REQUIRED('Cid'));
};
