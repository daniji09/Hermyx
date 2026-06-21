import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.config.js';
import { messages } from '@hermyx/shared';

const testMission = vi.hoisted(() => {
  return {
    title: 'Viewable mission',
    description: 'Mission available to inspect.',
    difficulty: 3,
    totalVacancies: 4,
    occupiedVacancies: 1,
    monetaryReward: 150,
    status: 'funded',
  };
});

const testUsers = vi.hoisted(() => {
  return {
    owner: {
      email: 'mission-owner@email.com',
      username: 'viewOwner',
      firebaseUid: 'mission-view-owner-firebase-uid',
    },
    adventurer: {
      email: 'mission-adventurer@email.com',
      username: 'viewAdventurer',
      firebaseUid: 'mission-view-adventurer-firebase-uid',
    },
  };
});

let ownerId;
let adventurerId;
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

  ownerId = await createUser(testUsers.owner);
  adventurerId = await createUser(testUsers.adventurer);
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

const createMission = async () => {
  const result = await pool.query(
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
      testMission.occupiedVacancies,
      testMission.monetaryReward,
      testMission.status,
      ownerId,
    ],
  );

  return result.rows[0].mid;
};

const joinMission = async (missionId, adventurerIdToJoin = adventurerId) => {
  await pool.query(
    'INSERT INTO mission_participation (mid, adventurer_id) VALUES ($1, $2)',
    [missionId, adventurerIdToJoin],
  );
};

describe('GET /api/missions/:id - HY-129 view mission', () => {
  it('should return the mission basic information when the mission exists', async () => {
    const missionId = await createMission();

    const response = await request(app).get(`/api/missions/${missionId}`);

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
      status: testMission.status,
      owner_id: ownerId,
      is_joined: false,
    });
    expect(response.body.mission.publication_date).toBeDefined();
    expect(Number(response.body.mission.monetary_reward)).toBe(
      testMission.monetaryReward,
    );
  });

  it('should return is_joined true when the authenticated user joined the mission', async () => {
    const missionId = await createMission();
    await joinMission(missionId);

    const response = await request(app).get(`/api/missions/${missionId}`);

    expect(response.status).toBe(200);
    expect(response.body.mission.is_joined).toBe(true);
  });

  it('should return 404 when the mission does not exist', async () => {
    const response = await request(app).get('/api/missions/999999');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.error).toBe(messages.MISSION_NOT_FOUND);
  });

  it.each([
    ['not numeric', 'abc', 'id'],
    ['decimal', '1.5', 'id'],
    ['negative', '-1', 'id'],
  ])('should return 400 when the mission id is %s', async (_, id, field) => {
    const response = await request(app).get(`/api/missions/${id}`);

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors[field]).toBeDefined();
  });
});
