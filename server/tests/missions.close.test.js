import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.config.js';
import { messages } from '@hermyx/shared';

const testMission = vi.hoisted(() => {
  return {
    title: 'Closeable mission',
    description: 'Mission ready to be closed.',
    difficulty: 3,
    totalVacancies: 2,
    occupiedVacancies: 1,
    monetaryReward: 250,
    status: 'in_progress',
  };
});

const testUsers = vi.hoisted(() => {
  return {
    owner: {
      email: 'owner@email.com',
      username: 'missionOwner',
      firebaseUid: 'owner-firebase-uid-123',
    },
    anotherOwner: {
      email: 'another-owner@email.com',
      username: 'anotherOwner',
      firebaseUid: 'another-owner-firebase-uid-123',
    },
    adventurers: [
      {
        email: 'adventurer-one@email.com',
        username: 'missionAdventurerOne',
        firebaseUid: 'adventurer-one-firebase-uid-123',
      },
      {
        email: 'adventurer-two@email.com',
        username: 'missionAdventurerTwo',
        firebaseUid: 'adventurer-two-firebase-uid-123',
      },
    ],
  };
});

let ownerId;
let anotherOwnerId;
let authenticatedUserId;

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
  await pool.query('TRUNCATE TABLE mission CASCADE');
  await pool.query('TRUNCATE TABLE app_user CASCADE');

  const ownerResult = await pool.query(
    'INSERT INTO app_user (email, username, firebase_uid) VALUES ($1, $2, $3) RETURNING uid',
    [
      testUsers.owner.email,
      testUsers.owner.username,
      testUsers.owner.firebaseUid,
    ],
  );

  ownerId = ownerResult.rows[0].uid;
  authenticatedUserId = ownerId;

  const anotherOwnerResult = await pool.query(
    'INSERT INTO app_user (email, username, firebase_uid) VALUES ($1, $2, $3) RETURNING uid',
    [
      testUsers.anotherOwner.email,
      testUsers.anotherOwner.username,
      testUsers.anotherOwner.firebaseUid,
    ],
  );

  anotherOwnerId = anotherOwnerResult.rows[0].uid;
});

afterAll(async () => {
  await pool.end();
});

const createMission = async ({
  status = testMission.status,
  occupiedVacancies = testMission.occupiedVacancies,
} = {}) => {
  const missionResult = await pool.query(
    `INSERT INTO mission (
      publication_date,
      title,
      description,
      difficulty,
      total_vacancies,
      occupied_vacancies,
      monetary_reward,
      status,
      owner_id
    ) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING mid`,
    [
      testMission.title,
      testMission.description,
      testMission.difficulty,
      testMission.totalVacancies,
      occupiedVacancies,
      testMission.monetaryReward,
      status,
      ownerId,
    ],
  );

  return missionResult.rows[0].mid;
};

const getMissionStatus = async (missionId) => {
  const missionResult = await pool.query(
    'SELECT status FROM mission WHERE mid = $1',
    [missionId],
  );

  return missionResult.rows[0].status;
};

describe('POST /api/missions/:missionId/close', () => {
  it('should close an in progress mission when the authenticated user is the owner', async () => {
    const missionId = await createMission();

    const response = await request(app).post(
      `/api/missions/${missionId}/close`,
    );

    const updatedStatus = await getMissionStatus(missionId);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.mission).toMatchObject({
      mid: missionId,
      title: testMission.title,
      description: testMission.description,
      difficulty: testMission.difficulty,
      total_vacancies: testMission.totalVacancies,
      occupied_vacancies: testMission.occupiedVacancies,
      status: 'accepted',
      owner_id: ownerId,
    });
    expect(Number(response.body.mission.monetary_reward)).toBe(
      testMission.monetaryReward,
    );
    expect(updatedStatus).toBe('accepted');
  });

  it('should not close a mission if the authenticated user is not the owner', async () => {
    const missionId = await createMission();
    authenticatedUserId = anotherOwnerId;

    const response = await request(app).post(
      `/api/missions/${missionId}/close`,
    );

    const updatedStatus = await getMissionStatus(missionId);

    expect(response.status).toBe(403);
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.error).toBe(messages.UNAUTHORIZED_ERROR);
    expect(updatedStatus).toBe(testMission.status);
  });

  it('should return 404 when the mission does not exist', async () => {
    const response = await request(app).post('/api/missions/999999/close');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.error).toBe(messages.MISSIONS_NOT_FOUND);
  });
});
