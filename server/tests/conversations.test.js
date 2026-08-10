import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.config.js';
import {
  createMission as createMissionRecord,
  finishMissionAndCloseConversation,
  findByMid,
} from '../src/models/mission.model.js';
import {
  joinVacancy,
  releaseParticipation,
  unjoinVacancy,
} from '../src/models/mission-participation.model.js';
import { MISSION_STATUS } from '@hermyx/shared';

const saveToLocalStorageMock = vi.hoisted(() =>
  vi.fn(async () => '/uploads/conversation-photos/test-photo.png'),
);

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
    verifyAdmin: (req, res, next) => {
      next();
    },
  };
});

vi.mock('../src/providers/storage.provider.js', () => {
  return {
    saveToLocalStorage: saveToLocalStorageMock,
    uploadToAzureBlob: vi.fn(async () => 'https://storage.test/photo.png'),
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

const createMissionWithConversation = async (ownerId) => {
  const mission = await createMissionRecord({
    title: 'Mission with group chat',
    description: 'Mission used to test its conversation lifecycle.',
    vacancies: 1,
    vacanciesData: [
      {
        reward: 25,
        title: 'Test vacancy',
        description: 'Test vacancy description',
      },
    ],
    totalPayment: 25,
    latitude: null,
    longitude: null,
    status: MISSION_STATUS.OPENED.ID,
    ownerId,
  });

  const conversationResult = await pool.query(
    'SELECT * FROM conversation WHERE mission_id = $1',
    [mission.mid],
  );
  const vacancyResult = await pool.query(
    'SELECT * FROM mission_participation WHERE mid = $1',
    [mission.mid],
  );

  return {
    mission,
    conversation: conversationResult.rows[0],
    vacancy: vacancyResult.rows[0],
  };
};

beforeEach(async () => {
  saveToLocalStorageMock.mockClear();
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

describe('Conversation photo messages', () => {
  it('allows sending a photo without text', async () => {
    const sender = await createUser('photo_sender');
    const recipient = await createUser('photo_recipient');
    const conversation = await createPrivateConversation(
      sender.uid,
      recipient.uid,
    );

    const sendResponse = await request(app)
      .post(`/api/conversations/${conversation.cid}/messages`)
      .set('x-test-user-id', sender.uid)
      .attach('photo', Buffer.from('fake image'), {
        filename: 'chat-photo.png',
        contentType: 'image/png',
      });
    const messagesResponse = await request(app)
      .get(`/api/conversations/${conversation.cid}/messages`)
      .set('x-test-user-id', recipient.uid);

    expect(sendResponse.status).toBe(201);
    expect(sendResponse.body.message).toMatchObject({
      content: '',
      attachment_url: '/uploads/conversation-photos/test-photo.png',
      attachment_type: 'image',
    });
    expect(messagesResponse.status).toBe(200);
    expect(messagesResponse.body.messages[0]).toMatchObject({
      attachment_url: '/uploads/conversation-photos/test-photo.png',
      attachment_type: 'image',
    });
    expect(saveToLocalStorageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: 'chat-photo.png',
        mimetype: 'image/png',
      }),
      'uploads/conversation-photos',
    );
  });
});

describe('Mission conversation lifecycle', () => {
  it('creates a mission conversation containing only its owner', async () => {
    const owner = await createUser('mission_owner');
    const outsider = await createUser('mission_outsider');
    const { mission, conversation } = await createMissionWithConversation(
      owner.uid,
    );
    const ownerMissionView = await findByMid(mission.mid, owner.uid);
    const outsiderMissionView = await findByMid(mission.mid, outsider.uid);

    const participantsResult = await pool.query(
      `
        SELECT *
        FROM conversation_participant
        WHERE conversation_id = $1
      `,
      [conversation.cid],
    );

    expect(conversation.type).toBe('mission');
    expect(conversation.mission_id).toBe(mission.mid);
    expect(participantsResult.rows).toHaveLength(1);
    expect(participantsResult.rows[0].user_id).toBe(owner.uid);
    expect(participantsResult.rows[0].can_send).toBe(true);
    expect(ownerMissionView.conversation_id).toBe(conversation.cid);
    expect(outsiderMissionView.conversation_id).toBeNull();
  });

  it('adds an accepted adventurer and permanently removes access after unjoining', async () => {
    const owner = await createUser('join_owner');
    const adventurer = await createUser('join_adventurer');
    const { mission, conversation, vacancy } =
      await createMissionWithConversation(owner.uid);

    await joinVacancy(mission.mid, vacancy.id, adventurer.uid);

    const joinedMissionView = await findByMid(mission.mid, adventurer.uid);

    const joinedParticipant = await pool.query(
      `
        SELECT *
        FROM conversation_participant
        WHERE conversation_id = $1 AND user_id = $2
      `,
      [conversation.cid, adventurer.uid],
    );
    expect(joinedParticipant.rows[0].left_at).toBeNull();
    expect(joinedParticipant.rows[0].can_send).toBe(true);
    expect(joinedMissionView.conversation_id).toBe(conversation.cid);

    await unjoinVacancy(mission.mid, vacancy.id, adventurer.uid);

    const unjoinedMissionView = await findByMid(mission.mid, adventurer.uid);

    const accessResponse = await request(app)
      .get(`/api/conversations/${conversation.cid}/messages`)
      .set('x-test-user-id', adventurer.uid);
    const leftParticipant = await pool.query(
      `
        SELECT *
        FROM conversation_participant
        WHERE conversation_id = $1 AND user_id = $2
      `,
      [conversation.cid, adventurer.uid],
    );

    expect(accessResponse.status).toBe(403);
    expect(leftParticipant.rows[0].left_at).not.toBeNull();
    expect(leftParticipant.rows[0].can_send).toBe(false);
    expect(unjoinedMissionView.conversation_id).toBeNull();
  });

  it('keeps the history read-only after an adventurer finishes', async () => {
    const owner = await createUser('release_owner');
    const adventurer = await createUser('release_adventurer');
    const { mission, conversation, vacancy } =
      await createMissionWithConversation(owner.uid);

    await joinVacancy(mission.mid, vacancy.id, adventurer.uid);
    await request(app)
      .post(`/api/conversations/${conversation.cid}/messages`)
      .set('x-test-user-id', owner.uid)
      .send({ content: 'Mission history' });

    await releaseParticipation(mission.mid, adventurer.uid);

    const releasedMissionView = await findByMid(mission.mid, adventurer.uid);

    const historyResponse = await request(app)
      .get(`/api/conversations/${conversation.cid}/messages`)
      .set('x-test-user-id', adventurer.uid);
    const sendResponse = await request(app)
      .post(`/api/conversations/${conversation.cid}/messages`)
      .set('x-test-user-id', adventurer.uid)
      .send({ content: 'This should not be sent' });

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.messages).toHaveLength(1);
    expect(sendResponse.status).toBe(403);
    expect(releasedMissionView.conversation_id).toBe(conversation.cid);
  });

  it('closes sending for everyone while preserving history', async () => {
    const owner = await createUser('finish_owner');
    const { mission, conversation } = await createMissionWithConversation(
      owner.uid,
    );

    await request(app)
      .post(`/api/conversations/${conversation.cid}/messages`)
      .set('x-test-user-id', owner.uid)
      .send({ content: 'Final mission message' });

    const finishedMission = await finishMissionAndCloseConversation(
      mission.mid,
    );

    const historyResponse = await request(app)
      .get(`/api/conversations/${conversation.cid}/messages`)
      .set('x-test-user-id', owner.uid);
    const sendResponse = await request(app)
      .post(`/api/conversations/${conversation.cid}/messages`)
      .set('x-test-user-id', owner.uid)
      .send({ content: 'Message after closure' });
    const conversationsResponse = await request(app)
      .get('/api/conversations')
      .set('x-test-user-id', owner.uid);

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.messages).toHaveLength(1);
    expect(sendResponse.status).toBe(403);
    expect(finishedMission.conversation).toMatchObject({
      cid: conversation.cid,
      mission_id: mission.mid,
    });
    expect(finishedMission.conversation.closed_at).not.toBeNull();
    expect(conversationsResponse.body.conversations[0]).toMatchObject({
      cid: conversation.cid,
      mission_title: mission.title,
    });
  });
});
