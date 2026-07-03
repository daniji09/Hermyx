import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.config.js';

const testMission = vi.hoisted(() => {
  return {
    title: 'Mission with vacancy',
    description: 'Mission waiting for an adventurer.',
    totalVacancies: 1,
    occupiedVacancies: 0,
    monetaryReward: 100,
    difficulty: 2,
    status: 'funded',
  };
});

const testUsers = vi.hoisted(() => {
  return {
    owner: {
      email: 'owner-invitation@email.com',
      username: 'invitationOwner',
      firebaseUid: 'invitation-owner-firebase-uid',
    },
    adventurer: {
      email: 'adventurer-invitation@email.com',
      username: 'invitationAdventurer',
      firebaseUid: 'invitation-adventurer-firebase-uid',
    },
    anotherAdventurer: {
      email: 'another-adventurer-invitation@email.com',
      username: 'otherInvAdventurer',
      firebaseUid: 'another-invitation-adventurer-firebase-uid',
    },
  };
});

let authenticatedUserId;
let ownerId;
let adventurerId;
let anotherAdventurerId;

vi.mock('../src/middlewares/auth.middleware.js', () => {
  return {
    verifyToken: (req, res, next) => {
      req.user = { uid: authenticatedUserId };
      next();
    },
  };
});

beforeEach(async () => {
  await pool.query('TRUNCATE TABLE mission_participation CASCADE');
  await pool.query('TRUNCATE TABLE notification CASCADE');
  await pool.query('TRUNCATE TABLE mission CASCADE');
  await pool.query('TRUNCATE TABLE app_user CASCADE');

  const ownerResult = await createUser(testUsers.owner);
  const adventurerResult = await createUser(testUsers.adventurer);
  const anotherAdventurerResult = await createUser(testUsers.anotherAdventurer);

  ownerId = ownerResult;
  adventurerId = adventurerResult;
  anotherAdventurerId = anotherAdventurerResult;
  authenticatedUserId = adventurerId;
});

afterAll(async () => {
  await pool.end();
});

const createUser = async (user) => {
  const result = await pool.query(
    'INSERT INTO app_user (email, username, firebase_uid) VALUES ($1, $2, $3) RETURNING uid',
    [user.email, user.username, user.firebaseUid],
  );

  return result.rows[0].uid;
};

const createMission = async ({
  totalVacancies = testMission.totalVacancies,
  occupiedVacancies = testMission.occupiedVacancies,
} = {}) => {
  const result = await pool.query(
    'INSERT INTO mission (publication_date, title, description, difficulty, total_vacancies, occupied_vacancies, monetary_reward, status, owner_id) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING mid',
    [
      testMission.title,
      testMission.description,
      testMission.difficulty,
      totalVacancies,
      occupiedVacancies,
      testMission.monetaryReward,
      testMission.status,
      ownerId,
    ],
  );

  return result.rows[0].mid;
};

const createInvitation = async ({
  missionId,
  senderId = ownerId,
  recipientId = adventurerId,
}) => {
  const result = await pool.query(
    "INSERT INTO notification (date, type, status, sender_id, recipient_id, associated_mission_id) VALUES (NOW(), 'invitation', 'pending', $1, $2, $3) RETURNING nid",
    [senderId, recipientId, missionId],
  );

  return result.rows[0].nid;
};

const getParticipationCount = async (missionId) => {
  const result = await pool.query(
    'SELECT COUNT(*) FROM mission_participation WHERE mid = $1',
    [missionId],
  );

  return Number(result.rows[0].count);
};

const getOccupiedVacancies = async (missionId) => {
  const result = await pool.query(
    'SELECT occupied_vacancies FROM mission WHERE mid = $1',
    [missionId],
  );

  return result.rows[0].occupied_vacancies;
};

const getInvitationStatus = async (invitationId) => {
  const result = await pool.query(
    'SELECT status FROM notification WHERE nid = $1',
    [invitationId],
  );

  return result.rows[0].status;
};

const getInvitationType = async (invitationId) => {
  const result = await pool.query(
    'SELECT type FROM notification WHERE nid = $1',
    [invitationId],
  );

  return result.rows[0].type;
};

describe('HY-004 add adventurer to mission vacancy', () => {
  it('should add the adventurer to the mission vacancy when the invitation is accepted and there are vacancies', async () => {
    const missionId = await createMission();

    authenticatedUserId = ownerId;

    const createResponse = await request(app).post('/api/notifications').send({
      missionId,
      senderId: ownerId,
      receiverId: adventurerId,
    });

    authenticatedUserId = adventurerId;

    const response = await request(app)
      .post(`/api/notifications/${createResponse.body}/respond`)
      .send({ response: 'accepted' });

    const participationCount = await getParticipationCount(missionId);
    const occupiedVacancies = await getOccupiedVacancies(missionId);
    const invitationStatus = await getInvitationStatus(createResponse.body);
    const invitationType = await getInvitationType(createResponse.body);

    expect(createResponse.status).toBe(201);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Adventurer successfully added');
    expect(participationCount).toBe(1);
    expect(occupiedVacancies).toBe(1);
    expect(invitationStatus).toBe('accepted');
    expect(invitationType).toBe('invitation');
  });

  it('should create an adventurer to applicant invitation when the sender is not the mission owner', async () => {
    const missionId = await createMission();

    const response = await request(app).post('/api/notifications').send({
      missionId,
      senderId: adventurerId,
      receiverId: ownerId,
    });

    const invitationType = await getInvitationType(response.body);

    expect(response.status).toBe(201);
    expect(invitationType).toBe('invitation');
  });

  it('should not add the adventurer when the invitation is accepted but there are no vacancies available', async () => {
    const missionId = await createMission();
    const invitationId = await createInvitation({ missionId });

    await pool.query(
      'INSERT INTO mission_participation (mid, adventurer_id) VALUES ($1, $2)',
      [missionId, anotherAdventurerId],
    );

    const response = await request(app)
      .post(`/api/notifications/${invitationId}/respond`)
      .send({ response: 'accepted' });

    const participationCount = await getParticipationCount(missionId);
    const invitationStatus = await getInvitationStatus(invitationId);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('There are no vacancies available');
    expect(participationCount).toBe(1);
    expect(invitationStatus).toBe('pending');
  });

  it('should not add the adventurer when they are already joined to the mission', async () => {
    const missionId = await createMission({ totalVacancies: 2 });
    const invitationId = await createInvitation({ missionId });

    await pool.query(
      'INSERT INTO mission_participation (mid, adventurer_id) VALUES ($1, $2)',
      [missionId, adventurerId],
    );

    const response = await request(app)
      .post(`/api/notifications/${invitationId}/respond`)
      .send({ response: 'accepted' });

    const participationCount = await getParticipationCount(missionId);
    const invitationStatus = await getInvitationStatus(invitationId);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe('Adventurer already joined this mission');
    expect(participationCount).toBe(1);
    expect(invitationStatus).toBe('pending');
  });

  it('should not add the adventurer when the invitation is rejected', async () => {
    const missionId = await createMission();
    const invitationId = await createInvitation({ missionId });

    const response = await request(app)
      .post(`/api/notifications/${invitationId}/respond`)
      .send({ response: 'rejected' });

    const participationCount = await getParticipationCount(missionId);
    const invitationStatus = await getInvitationStatus(invitationId);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Invitation rejected');
    expect(participationCount).toBe(0);
    expect(invitationStatus).toBe('rejected');
  });

  it('should not create an invitation to oneself', async () => {
    const missionId = await createMission();

    authenticatedUserId = ownerId;

    const response = await request(app).post('/api/notifications').send({
      missionId,
      senderId: ownerId,
      receiverId: ownerId,
    });

    const result = await pool.query('SELECT COUNT(*) FROM notification');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("You can't invite yourself");
    expect(Number(result.rows[0].count)).toBe(0);
  });

  it('should not create an invitation when the mission is already in progress', async () => {
    const missionId = await createMission();

    await pool.query(
      "UPDATE mission SET status = 'in_progress' WHERE mid = $1",
      [missionId],
    );

    authenticatedUserId = ownerId;

    const response = await request(app).post('/api/notifications').send({
      missionId,
      senderId: ownerId,
      receiverId: adventurerId,
    });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe(
      'This mission is no longer accepting adventurers.',
    );
  });

  it('should not accept an invitation when the mission is already in progress', async () => {
    const missionId = await createMission();
    const invitationId = await createInvitation({ missionId });

    await pool.query(
      "UPDATE mission SET status = 'in_progress' WHERE mid = $1",
      [missionId],
    );

    const response = await request(app)
      .post(`/api/notifications/${invitationId}/respond`)
      .send({ response: 'accepted' });

    const invitationStatus = await getInvitationStatus(invitationId);
    const participationCount = await getParticipationCount(missionId);

    expect(response.status).toBe(409);
    expect(response.body.error).toBe(
      'This mission is no longer accepting adventurers.',
    );
    expect(invitationStatus).toBe('pending');
    expect(participationCount).toBe(0);
  });
});
