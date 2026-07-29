import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.config.js';

vi.mock('../src/middlewares/auth.middleware.js', () => {
  return {
    verifyToken: (req, res, next) => {
      req.user = {
        uid: Number(req.headers['x-test-user-id']),
      };
      next();
    },
    verifyCronToken: (req, res, next) => {
      next();
    },
  };
});

const createUser = async (username) => {
  const result = await pool.query(
    `
      INSERT INTO app_user (email, username, firebase_uid)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
    [`${username}@example.com`, username, `firebase-${username}`],
  );

  return result.rows[0];
};

const createPrivateConversation = async (userId, otherUserId) => {
  const response = await request(app)
    .post('/api/conversations/private')
    .set('x-test-user-id', userId)
    .send({ otherUserId });

  expect(response.status).toBe(200);
  return response.body.conversation;
};

beforeEach(async () => {
  await pool.query('TRUNCATE TABLE app_user CASCADE');
});

afterAll(async () => {
  await pool.end();
});

describe('Unread direct messages', () => {
  it('increments only the recipient unread count for every new message', async () => {
    const sender = await createUser('message_sender');
    const recipient = await createUser('message_recipient');
    const conversation = await createPrivateConversation(
      sender.uid,
      recipient.uid,
    );

    for (const content of ['First message', 'Second message']) {
      const sendResponse = await request(app)
        .post(`/api/conversations/${conversation.cid}/messages`)
        .set('x-test-user-id', sender.uid)
        .send({ content });

      expect(sendResponse.status).toBe(201);
    }

    const recipientCountResponse = await request(app)
      .get('/api/conversations/unread-count')
      .set('x-test-user-id', recipient.uid);
    const senderCountResponse = await request(app)
      .get('/api/conversations/unread-count')
      .set('x-test-user-id', sender.uid);

    expect(recipientCountResponse.status).toBe(200);
    expect(recipientCountResponse.body.unreadCount).toBe(2);
    expect(senderCountResponse.status).toBe(200);
    expect(senderCountResponse.body.unreadCount).toBe(0);
  });

  it('clears the conversation unread count when the recipient reads it', async () => {
    const sender = await createUser('read_sender');
    const recipient = await createUser('read_recipient');
    const conversation = await createPrivateConversation(
      sender.uid,
      recipient.uid,
    );

    await request(app)
      .post(`/api/conversations/${conversation.cid}/messages`)
      .set('x-test-user-id', sender.uid)
      .send({ content: 'Unread message' });

    const markReadResponse = await request(app)
      .patch(`/api/conversations/${conversation.cid}/read`)
      .set('x-test-user-id', recipient.uid);
    const countResponse = await request(app)
      .get('/api/conversations/unread-count')
      .set('x-test-user-id', recipient.uid);

    expect(markReadResponse.status).toBe(200);
    expect(countResponse.status).toBe(200);
    expect(countResponse.body.unreadCount).toBe(0);
  });

  it('does not allow a non-participant to mark a conversation as read', async () => {
    const sender = await createUser('protected_sender');
    const recipient = await createUser('protected_recipient');
    const outsider = await createUser('protected_outsider');
    const conversation = await createPrivateConversation(
      sender.uid,
      recipient.uid,
    );

    const response = await request(app)
      .patch(`/api/conversations/${conversation.cid}/read`)
      .set('x-test-user-id', outsider.uid);

    expect(response.status).toBe(403);
  });
});
