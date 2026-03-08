import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.config.js';
import { messages } from '@hermyx/shared';

// Test fake data
const test_mission = vi.hoisted(() => {
  return {
    title: 'Test mission',
    description: 'This is a test mission.',
    vacancies: 5,
    monetary_reward: 1000,
    difficulty: 3,
    status: 'funded',
    first_page: 1,
    second_page: 2,
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

// Mock for authentication middleware
vi.mock('../src/middlewares/auth.middleware.js', () => {
  return {
    verifyToken: (req, res, next) => {
      next();
    },
  };
});

// Before each test, test db data is cleansed
beforeEach(async () => {
  await pool.query('TRUNCATE TABLE mission CASCADE');
  await pool.query('TRUNCATE TABLE app_user CASCADE');
});

// After all tests pool is ended
afterAll(async () => {
  await pool.end();
});

// Tests
describe('GET /api/missions with pagination', () => {
  // Happy paths
  it('should get the first page with all missions matching the page limit (2 missions)', async () => {
    // First, a user is created and then the missions are created
    const insertResult = await pool.query(
      'INSERT INTO app_user (email, username, firebase_uid) VALUES ($1, $2, $3) RETURNING uid',
      [test_user.email, test_user.username, test_user.firebaseUid],
    );

    const owner_id = insertResult.rows[0].uid;

    const mids = [];
    for (let i = 0; i < 2; i++) {
      mids.push(
        await pool.query(
          'INSERT INTO mission (publication_date, title, description, difficulty, vacancies, monetary_reward, status, owner_id)' +
            'VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7) RETURNING mid',
          [
            test_mission.title,
            test_mission.description,
            test_mission.difficulty,
            test_mission.vacancies,
            test_mission.monetary_reward,
            test_mission.status,
            owner_id,
          ],
        ),
      );
    }

    // Then is it searched
    const response = await request(app).get('/api/missions').query({
      page: test_mission.first_page,
      limit: 2,
    });

    // Checks response
    expect(response.status).toBe(200); // 200 OK
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.missions.length).toBe(2);
    expect(response.body.missions[0].mid).toBe(mids[1].rows[0].mid);
    expect(response.body.missions[1].mid).toBe(mids[0].rows[0].mid);
    expect(response.body.pagination.currentPage).toBe(1);
    expect(response.body.pagination.totalPages).toBe(1);
    expect(response.body.pagination.totalItems).toBe(2);
    expect(response.body.pagination.hasMore).toBe(false);
  });

  it('should get the second page with less missions than the limit', async () => {
    // First, a user is created and then the missions are created
    const insertResult = await pool.query(
      'INSERT INTO app_user (email, username, firebase_uid) VALUES ($1, $2, $3) RETURNING uid',
      [test_user.email, test_user.username, test_user.firebaseUid],
    );

    const owner_id = insertResult.rows[0].uid;

    const mids = [];
    for (let i = 0; i < 3; i++) {
      mids.push(
        await pool.query(
          'INSERT INTO mission (publication_date, title, description, difficulty, vacancies, monetary_reward, status, owner_id)' +
            'VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7) RETURNING mid',
          [
            test_mission.title,
            test_mission.description,
            test_mission.difficulty,
            test_mission.vacancies,
            test_mission.monetary_reward,
            test_mission.status,
            owner_id,
          ],
        ),
      );
    }

    // Then is it searched
    const response = await request(app).get('/api/missions').query({
      page: test_mission.second_page,
      limit: 2,
    });

    // Checks response
    expect(response.status).toBe(200); // 200 OK
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.missions.length).toBe(1);
    expect(response.body.missions[0].mid).toBe(mids[0].rows[0].mid);
    expect(response.body.pagination.currentPage).toBe(2);
    expect(response.body.pagination.totalPages).toBe(2);
    expect(response.body.pagination.totalItems).toBe(3);
    expect(response.body.pagination.hasMore).toBe(false);
  });

  it('should get the first page with more pages to load', async () => {
    // First, a user is created and then the missions are created
    const insertResult = await pool.query(
      'INSERT INTO app_user (email, username, firebase_uid) VALUES ($1, $2, $3) RETURNING uid',
      [test_user.email, test_user.username, test_user.firebaseUid],
    );

    const owner_id = insertResult.rows[0].uid;

    const mids = [];
    for (let i = 0; i < 3; i++) {
      mids.push(
        await pool.query(
          'INSERT INTO mission (publication_date, title, description, difficulty, vacancies, monetary_reward, status, owner_id)' +
            'VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7) RETURNING mid',
          [
            test_mission.title,
            test_mission.description,
            test_mission.difficulty,
            test_mission.vacancies,
            test_mission.monetary_reward,
            test_mission.status,
            owner_id,
          ],
        ),
      );
    }

    // Then is it searched
    const response = await request(app).get('/api/missions').query({
      page: test_mission.first_page,
      limit: 2,
    });

    // Checks response
    expect(response.status).toBe(200); // 200 OK
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.missions.length).toBe(2);
    expect(response.body.missions[0].mid).toBe(mids[2].rows[0].mid);
    expect(response.body.missions[1].mid).toBe(mids[1].rows[0].mid);
    expect(response.body.pagination.currentPage).toBe(1);
    expect(response.body.pagination.totalPages).toBe(2);
    expect(response.body.pagination.totalItems).toBe(3);
    expect(response.body.pagination.hasMore).toBe(true);
  });

  // Corner cases
  it('should return a 404 status because there are no missions to load', async () => {
    // Search is made with no data loaded
    const response = await request(app).get('/api/missions').query({
      page: test_mission.first_page,
      limit: 2,
    });

    // Checks response
    expect(response.status).toBe(404); // 404 Not Found
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.general[0]).toBe(messages.NO_MISSIONS);
  });

  it('should return a 400 status because the page value is not valid', async () => {
    // Search is made with no data loaded
    const response = await request(app).get('/api/missions').query({
      page: '2as',
      limit: 2,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.page[0]).toBe(messages.FIELD_NUMBER('Page'));
  });

  it('should return a 400 status because the limit value is not valid', async () => {
    // Search is made with no data loaded
    const response = await request(app).get('/api/missions').query({
      page: 0,
      limit: -2,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.limit[0]).toBe(
      messages.FIELD_POSITIVE('Limit'),
    );
  });
});
