import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.config.js';
import { messages } from '@hermyx/shared';

const test_mission = vi.hoisted(() => {
  return {
    title: 'Test mission',
    description: 'This is a test mission.',
    vacancies: 5,
    reward: 100,
    difficulty: 3,
    isDraft: false,
  };
});

const test_user = vi.hoisted(() => {
  return {
    email: 'email@email.com',
    username: 'testUsername',
    password: 'testPassword123_',
    firebaseUid: 'test-firebase-uid-123',
  };
});

let owner_id;

vi.mock('../src/middlewares/auth.middleware.js', () => {
  return {
    verifyToken: (req, res, next) => {
      req.user = { uid: owner_id };
      next();
    },
  };
});

// Before each test, test db data is cleansed
beforeEach(async () => {
  await pool.query('TRUNCATE TABLE mission CASCADE');
  await pool.query('TRUNCATE TABLE app_user CASCADE');

  const insertResult = await pool.query(
    'INSERT INTO app_user (email, username, firebase_uid) VALUES ($1, $2, $3) RETURNING uid',
    [test_user.email, test_user.username, test_user.firebaseUid],
  );

  owner_id = insertResult.rows[0].uid;
});

// After all tests pool is ended
afterAll(async () => {
  await pool.end();
});

describe('POST /api/missions', () => {
  it('should create a valid mission when all required fields are provided', async () => {
    const response = await request(app)
      .post('/api/missions')
      .send(test_mission);

    console.log(response.body);

    expect(response.status).toBe(201);
    expect(response.header['content-type']).toEqual(
      expect.stringContaining('json'),
    );

    expect(response.body.data.title).toBe(test_mission.title);
    expect(response.body.data.description).toBe(test_mission.description);
    expect(response.body.data.owner_id).toBe(owner_id);
  });

  it('should allow saving a draft even if the title is missing', async () => {
    const draftMission = {
      ...test_mission,
      title: '',
      isDraft: true,
    };

    const response = await request(app)
      .post('/api/missions')
      .send(draftMission);
    console.log(response.body);

    expect(response.status).toBe(201);
  });

  it('should return 400 if numeric values are invalid', async () => {
    const invalidMission = {
      ...test_mission,
      vacancies: 1,
      reward: -100,
      isDraft: false,
    };

    const response = await request(app)
      .post('/api/missions')
      .send(invalidMission);
    console.log(response.body);

    expect(response.status).toBe(400);

    expect(response.body.errors).toBeDefined();
  });
});
