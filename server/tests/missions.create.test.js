import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.config.js';
import { consts, messages } from '@hermyx/shared';

const testMission = vi.hoisted(() => {
  return {
    title: 'Test mission',
    description: 'This is a test mission.',
    vacancies: 5,
    reward: 100,
    difficulty: 3,
    isDraft: false,
  };
});

const testUser = vi.hoisted(() => {
  return {
    email: 'email@email.com',
    username: 'testUsername',
    firebaseUid: 'test-firebase-uid-123',
  };
});

let ownerId;

vi.mock('../src/middlewares/auth.middleware.js', () => {
  return {
    verifyToken: (req, res, next) => {
      req.user = { uid: ownerId };
      next();
    },
  };
});

beforeEach(async () => {
  await pool.query('TRUNCATE TABLE mission CASCADE');
  await pool.query('TRUNCATE TABLE app_user CASCADE');

  const insertResult = await pool.query(
    'INSERT INTO app_user (email, username, firebase_uid) VALUES ($1, $2, $3) RETURNING uid',
    [testUser.email, testUser.username, testUser.firebaseUid],
  );

  ownerId = insertResult.rows[0].uid;
});

afterAll(async () => {
  await pool.end();
});

const postMission = (mission = testMission) => {
  return request(app).post('/api/missions').send(mission);
};

describe('POST /api/missions - HY-003 publish mission', () => {
  it('should publish a valid mission when all required fields are valid', async () => {
    const response = await postMission();

    expect(response.status).toBe(201);
    expect(response.header['content-type']).toEqual(
      expect.stringContaining('json'),
    );

    expect(response.body.mission).toMatchObject({
      title: testMission.title,
      description: testMission.description,
      total_vacancies: testMission.vacancies,
      occupied_vacancies: 0,
      difficulty: testMission.difficulty,
      status: 'pending_payment',
      owner_id: ownerId,
    });
    expect(Number(response.body.mission.monetary_reward)).toBe(
      testMission.reward,
    );
  });

  it('should reject a mission with a title already used by the same user', async () => {
    await postMission();

    const response = await postMission();

    expect(response.status).toBe(400);
    expect(response.body.errors.general[0]).toBe(messages.MISSION_SAME_TITLE);
  });

  it.each([
    ['title', ''],
    ['description', ''],
    ['vacancies', undefined],
    ['reward', undefined],
    ['difficulty', undefined],
  ])('should reject a published mission without %s', async (field, value) => {
    const response = await postMission({
      ...testMission,
      [field]: value,
    });

    expect(response.status).toBe(400);
    expect(response.body.errors[field]).toBeDefined();
  });

  it.each([
    [
      'title',
      'a'.repeat(consts.MISSION.TITLE_MAX_LENGTH + 1),
      messages.FIELD_TOO_LONG('Title', consts.MISSION.TITLE_MAX_LENGTH),
    ],
    [
      'description',
      'a'.repeat(consts.MISSION.DESCRIPTION_MAX_LENGTH + 1),
      messages.FIELD_TOO_LONG(
        'Description',
        consts.MISSION.DESCRIPTION_MAX_LENGTH,
      ),
    ],
    [
      'vacancies',
      consts.MISSION.VACANCIES.MIN - 1,
      messages.FIELD_TOO_SMALL('Vacancies', consts.MISSION.VACANCIES.MIN),
    ],
    [
      'vacancies',
      consts.MISSION.VACANCIES.MAX + 1,
      messages.FIELD_TOO_BIG('Vacancies', consts.MISSION.VACANCIES.MAX),
    ],
    [
      'reward',
      consts.MISSION.REWARD.MIN - 1,
      messages.FIELD_TOO_SMALL('Reward', consts.MISSION.REWARD.MIN),
    ],
    [
      'reward',
      consts.MISSION.REWARD.MAX + 1,
      messages.FIELD_TOO_BIG('Reward', consts.MISSION.REWARD.MAX),
    ],
    [
      'difficulty',
      consts.MISSION.DIFFICULTY.MIN - 1,
      messages.FIELD_TOO_SMALL('Difficulty', consts.MISSION.DIFFICULTY.MIN),
    ],
    [
      'difficulty',
      consts.MISSION.DIFFICULTY.MAX + 1,
      messages.FIELD_TOO_BIG('Difficulty', consts.MISSION.DIFFICULTY.MAX),
    ],
  ])(
    'should reject a published mission when %s is outside its valid range',
    async (field, value, expectedError) => {
      const response = await postMission({
        ...testMission,
        [field]: value,
      });

      expect(response.status).toBe(400);
      expect(response.body.errors[field][0]).toBe(expectedError);
    },
  );

  it.each([
    ['vacancies', 1.5, messages.FIELD_INTEGER('Vacancies')],
    ['reward', 10.5, messages.FIELD_INTEGER('Reward')],
    ['difficulty', 1.5, messages.FIELD_INTEGER('Difficulty')],
  ])(
    'should reject a published mission when %s is not an integer',
    async (field, value, expectedError) => {
      const response = await postMission({
        ...testMission,
        [field]: value,
      });

      expect(response.status).toBe(400);
      expect(response.body.errors[field][0]).toBe(expectedError);
    },
  );
});
