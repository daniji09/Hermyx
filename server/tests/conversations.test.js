import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { messages, USER_ROLE } from '@hermyx/shared';
import { AppError } from '../src/utils/error.util.js';

const currentUser = vi.hoisted(() => ({
  uid: 51,
  username: 'chat_hero',
  role: 'USER',
}));

const conversationService = vi.hoisted(() => ({
  getMyConversations: vi.fn(),
  getMyUnreadMessageCount: vi.fn(),
  getConversation: vi.fn(),
  getConversationMessages: vi.fn(),
  createPrivateConversation: vi.fn(),
  sendMessage: vi.fn(),
  markConversationAsRead: vi.fn(),
}));

const conversationModel = vi.hoisted(() => ({
  findById: vi.fn(),
  isMissionConversationParticipant: vi.fn(),
}));
const conversationParticipantModel = vi.hoisted(() => ({
  create: vi.fn(),
  isConversationParticipant: vi.fn(),
  canSendMessageToConversation: vi.fn(),
  findActiveIdsByConversationId: vi.fn(),
  markConversationAsReadByUserId: vi.fn(),
}));
const conversationMessageModel = vi.hoisted(() => ({
  create: vi.fn(),
  findByConversationId: vi.fn(),
}));
const socketProvider = vi.hoisted(() => ({
  emitToConversation: vi.fn(),
  emitToAdmins: vi.fn(),
  emitToUser: vi.fn(),
}));
const dbPool = vi.hoisted(() => ({
  connect: vi.fn(),
}));

vi.mock('../src/services/conversation.service.js', () => conversationService);
vi.mock('../src/models/conversation.model.js', () => conversationModel);
vi.mock(
  '../src/models/conversation-participant.model.js',
  () => conversationParticipantModel,
);
vi.mock(
  '../src/models/conversation-message.model.js',
  () => conversationMessageModel,
);
vi.mock('../src/config/db.config.js', () => ({
  default: dbPool,
}));
vi.mock('../src/services/user.service.js', () => ({}));
vi.mock('../src/providers/socket.provider.js', () => socketProvider);
vi.mock('../src/providers/storage.provider.js', () => ({}));
vi.mock('../src/middlewares/auth.middleware.js', async (importOriginal) => ({
  ...(await importOriginal()),
  verifyToken: (req, _res, next) => {
    req.user = { ...currentUser };
    req.firebaseToken = { admin: currentUser.role === USER_ROLE.ADMIN.ID };
    next();
  },
  verifyAdmin: (_req, _res, next) => next(),
}));

import app from '../src/app.js';

let actualConversationService;

beforeAll(async () => {
  actualConversationService = await vi.importActual(
    '../src/services/conversation.service.js',
  );
});

beforeEach(() => {
  vi.clearAllMocks();
  currentUser.role = USER_ROLE.USER.ID;
});

describe('Conversation API', () => {
  it('forbids an administrator from listing normal conversations', async () => {
    currentUser.role = USER_ROLE.ADMIN.ID;

    const response = await request(app).get('/api/conversations');

    expect(response.status).toBe(403);
    expect(response.body.errors.general).toEqual([messages.GENERAL.FORBIDDEN]);
    expect(conversationService.getMyConversations).not.toHaveBeenCalled();
  });

  it('gets the current user conversations', async () => {
    const conversations = [{ cid: 1, type: 'private' }];
    const pagination = {
      currentPage: 2,
      totalPages: 3,
      totalItems: 25,
      hasMore: true,
    };
    conversationService.getMyConversations.mockResolvedValue({
      conversations,
      pagination,
    });

    const response = await request(app)
      .get('/api/conversations')
      .query({ page: 2, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ conversations, pagination });
    expect(conversationService.getMyConversations).toHaveBeenCalledWith(
      currentUser.uid,
      { page: 2, limit: 10, offset: 10 },
    );
  });

  it('gets the aggregate unread message count', async () => {
    conversationService.getMyUnreadMessageCount.mockResolvedValue(3);

    const response = await request(app).get('/api/conversations/unread-count');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ unreadCount: 3 });
  });

  it('gets one conversation and its visible participants', async () => {
    const conversation = { cid: 4, type: 'mission' };
    const participants = [{ uid: currentUser.uid }];
    conversationService.getConversation.mockResolvedValue({
      conversation,
      participants,
    });

    const response = await request(app).get('/api/conversations/4');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ conversation, participants });
    expect(conversationService.getConversation).toHaveBeenCalledWith(
      4,
      currentUser,
    );
  });

  it('allows administrators to read a dispute conversation', async () => {
    currentUser.role = USER_ROLE.ADMIN.ID;
    const conversation = { cid: 8, type: 'dispute' };
    const participants = [{ uid: 51 }, { uid: 52 }];
    conversationService.getConversation.mockResolvedValue({
      conversation,
      participants,
    });

    const response = await request(app).get('/api/conversations/8');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ conversation, participants });
    expect(conversationService.getConversation).toHaveBeenCalledWith(
      8,
      currentUser,
    );
  });

  it('allows administrators to read dispute messages', async () => {
    currentUser.role = USER_ROLE.ADMIN.ID;
    const messages = [{ mid: 9, content: 'Administrative follow-up.' }];
    const pageInfo = { hasMore: false, nextCursor: null };
    conversationService.getConversationMessages.mockResolvedValue({
      messages,
      pageInfo,
    });

    const response = await request(app)
      .get('/api/conversations/8/messages')
      .query({ limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ messages, pageInfo });
    expect(conversationService.getConversationMessages).toHaveBeenCalledWith(
      8,
      currentUser,
      { cursor: undefined, limit: 20 },
    );
  });

  it('gets the messages visible to a participant', async () => {
    const messages = [{ id: 1, content: 'Hello' }];
    const pageInfo = { hasMore: true, nextCursor: 80 };
    conversationService.getConversationMessages.mockResolvedValue({
      messages,
      pageInfo,
    });

    const response = await request(app)
      .get('/api/conversations/4/messages')
      .query({ cursor: 100, limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ messages, pageInfo });
    expect(conversationService.getConversationMessages).toHaveBeenCalledWith(
      4,
      currentUser,
      { cursor: 100, limit: 20 },
    );
  });

  it('rejects conversation pagination without a limit', async () => {
    const response = await request(app)
      .get('/api/conversations')
      .query({ page: 2 });

    expect(response.status).toBe(400);
    expect(response.body.errors.limit).toBeDefined();
    expect(conversationService.getMyConversations).not.toHaveBeenCalled();
  });

  it('creates a private conversation', async () => {
    const conversation = { cid: 5, type: 'private' };
    conversationService.createPrivateConversation.mockResolvedValue(
      conversation,
    );

    const response = await request(app)
      .post('/api/conversations/private')
      .send({ otherUserId: 52 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ conversation });
    expect(conversationService.createPrivateConversation).toHaveBeenCalledWith(
      currentUser.uid,
      52,
    );
  });

  it('returns a conflict when creating a conversation with yourself', async () => {
    conversationService.createPrivateConversation.mockRejectedValue(
      new AppError(
        messages.CONVERSATION.GENERAL.CONVERSATION_WITH_YOURSELF,
        409,
      ),
    );

    const response = await request(app)
      .post('/api/conversations/private')
      .send({ otherUserId: currentUser.uid });

    expect(response.status).toBe(409);
    expect(response.body.errors.general).toEqual([
      messages.CONVERSATION.GENERAL.CONVERSATION_WITH_YOURSELF,
    ]);
    expect(conversationService.createPrivateConversation).toHaveBeenCalledWith(
      currentUser.uid,
      currentUser.uid,
    );
  });

  it('sends a text message', async () => {
    const message = { id: 6, content: 'Ready for the mission.' };
    conversationService.sendMessage.mockResolvedValue(message);

    const response = await request(app)
      .post('/api/conversations/4/messages')
      .send({ content: message.content });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message });
    expect(conversationService.sendMessage).toHaveBeenCalledWith({
      cid: 4,
      sender: currentUser,
      content: message.content,
      photo: undefined,
    });
  });

  it('marks a conversation as read', async () => {
    conversationService.markConversationAsRead.mockResolvedValue(0);

    const response = await request(app).patch('/api/conversations/4/read');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ unreadCount: 0 });
    expect(conversationService.markConversationAsRead).toHaveBeenCalledWith(
      4,
      currentUser,
    );
  });

  it('lets an administrator acknowledge a dispute preview', async () => {
    currentUser.role = USER_ROLE.ADMIN.ID;
    conversationService.markConversationAsRead.mockResolvedValue(0);

    const response = await request(app).patch('/api/conversations/8/read');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ unreadCount: 0 });
    expect(conversationService.markConversationAsRead).toHaveBeenCalledWith(
      8,
      currentUser,
    );
  });

  it('lets an administrator preview dispute messages without joining first', async () => {
    conversationModel.findById.mockResolvedValue({ cid: 8, type: 'dispute' });
    conversationParticipantModel.isConversationParticipant.mockResolvedValue(
      false,
    );
    conversationMessageModel.findByConversationId.mockResolvedValue({
      messages: [],
      pageInfo: { hasMore: false, nextCursor: null },
    });

    await actualConversationService.getConversationMessages(
      8,
      { uid: 99, role: USER_ROLE.ADMIN.ID },
      {},
    );

    expect(conversationMessageModel.findByConversationId).toHaveBeenCalledWith(
      8,
      99,
      true,
      { cursor: undefined, limit: 50 },
    );
  });

  it('rejects a removed adventurer from a mission conversation', async () => {
    conversationModel.findById.mockResolvedValue({
      cid: 4,
      type: 'mission',
    });
    conversationParticipantModel.isConversationParticipant.mockResolvedValue(
      true,
    );
    conversationModel.isMissionConversationParticipant.mockResolvedValue(false);

    await expect(
      actualConversationService.getConversation(4, {
        uid: currentUser.uid,
        role: USER_ROLE.USER.ID,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('rejects a removed adventurer from sending in a mission conversation', async () => {
    conversationModel.findById.mockResolvedValue({
      cid: 4,
      type: 'mission',
    });
    conversationModel.isMissionConversationParticipant.mockResolvedValue(false);

    await expect(
      actualConversationService.sendMessage({
        cid: 4,
        sender: { uid: currentUser.uid, role: USER_ROLE.USER.ID },
        content: 'I should not be able to send this.',
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('lets an administrator send the first message in a dispute', async () => {
    const client = {
      query: vi.fn().mockResolvedValue({}),
      release: vi.fn(),
    };
    currentUser.role = USER_ROLE.ADMIN.ID;
    dbPool.connect.mockResolvedValue(client);
    conversationModel.findById.mockResolvedValue({
      cid: 8,
      type: 'dispute',
      closed_at: null,
    });
    conversationParticipantModel.isConversationParticipant.mockResolvedValue(
      false,
    );
    conversationParticipantModel.create.mockResolvedValue({});
    conversationParticipantModel.canSendMessageToConversation.mockResolvedValue(
      true,
    );
    conversationParticipantModel.findActiveIdsByConversationId.mockResolvedValue(
      [51],
    );
    conversationMessageModel.create.mockResolvedValue({
      mid: 10,
      conversation_type: 'dispute',
      report_id: 7,
    });

    await actualConversationService.sendMessage({
      cid: 8,
      sender: { uid: 99, role: USER_ROLE.ADMIN.ID },
      content: 'Administrative response.',
    });

    expect(conversationParticipantModel.create).toHaveBeenCalledWith(
      8,
      99,
      client,
    );
    expect(conversationMessageModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 8,
        senderId: 99,
        content: 'Administrative response.',
      }),
      client,
    );
  });

  it('accepts read acknowledgement for an administrator dispute preview', async () => {
    conversationModel.findById.mockResolvedValue({ cid: 8, type: 'dispute' });
    conversationParticipantModel.isConversationParticipant.mockResolvedValue(
      false,
    );

    await expect(
      actualConversationService.markConversationAsRead(8, {
        uid: 99,
        role: USER_ROLE.ADMIN.ID,
      }),
    ).resolves.toBe(0);
    expect(
      conversationParticipantModel.markConversationAsReadByUserId,
    ).not.toHaveBeenCalled();
  });

  it('does not let an administrator preview a regular conversation', async () => {
    conversationModel.findById.mockResolvedValue({ cid: 8, type: 'private' });

    await expect(
      actualConversationService.markConversationAsRead(8, {
        uid: 99,
        role: USER_ROLE.ADMIN.ID,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('rejects invalid conversation identifiers before service execution', async () => {
    const response = await request(app).get('/api/conversations/invalid');

    expect(response.status).toBe(400);
    expect(conversationService.getConversation).not.toHaveBeenCalled();
  });

  it('maps conversation access errors through the shared handler', async () => {
    conversationService.getConversation.mockRejectedValue(
      new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403),
    );

    const response = await request(app).get('/api/conversations/4');

    expect(response.status).toBe(403);
    expect(response.body.errors.general).toEqual([
      messages.GENERAL.UNAUTHORIZED_ERROR,
    ]);
  });

  it('returns not found when the conversation does not exist', async () => {
    conversationService.getConversation.mockRejectedValue(
      new AppError(messages.CONVERSATION.GENERAL.CONVERSATION_NOT_FOUND, 404),
    );

    const response = await request(app).get('/api/conversations/999');

    expect(response.status).toBe(404);
    expect(response.body.errors.general).toEqual([
      messages.CONVERSATION.GENERAL.CONVERSATION_NOT_FOUND,
    ]);
  });
});
