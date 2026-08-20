import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { messages } from '@hermyx/shared';
import { AppError } from '../src/utils/error.util.js';

const currentUser = vi.hoisted(() => ({ uid: 51, username: 'chat_hero' }));

const conversationService = vi.hoisted(() => ({
  getMyConversations: vi.fn(),
  getMyUnreadMessageCount: vi.fn(),
  getConversation: vi.fn(),
  getConversationMessages: vi.fn(),
  createPrivateConversation: vi.fn(),
  sendMessage: vi.fn(),
  markConversationAsRead: vi.fn(),
}));

vi.mock('../src/services/conversation.service.js', () => conversationService);
vi.mock('../src/middlewares/auth.middleware.js', () => ({
  verifyToken: (req, _res, next) => {
    req.user = { ...currentUser };
    next();
  },
  verifyAdmin: (_req, _res, next) => next(),
}));

import app from '../src/app.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Conversation API', () => {
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

  it('rejects incomplete conversation pagination', async () => {
    const response = await request(app)
      .get('/api/conversations')
      .query({ page: 2 });

    expect(response.status).toBe(400);
    expect(response.body.errors.page).toBeDefined();
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
      currentUser.uid,
    );
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
