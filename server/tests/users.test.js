import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.config.js';
import { messages, consts } from '@hermyx/shared';

// Test fake data
const test_user = vi.hoisted(() => {
  return {
    email: 'test@email.com',
    email_invalid: 'test@email.c',
    username: 'testUser',
    username_too_long: 'username'.repeat(1000),
    username_invalid: '@username?',
    password: 'testPassword123_',
    confirmPassword: 'testPassword123_',
    firebase_uid: 'test-firebase-uid-123',
  };
});

// Mocks for Firebase API
vi.mock('../src/services/auth.service.js', () => {
  return {
    createFirebaseUser: vi
      .fn()
      .mockResolvedValue({ uid: test_user.firebase_uid }),

    deleteFirebaseUser: vi.fn().mockResolvedValue(),
  };
});

// Tests
describe('POST /api/users - Sign Up', () => {
  // Before each test, test db data is cleansed
  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE app_user CASCADE');
  });

  // After all tests pool is ended
  afterAll(async () => {
    await pool.end();
  });

  // Happy path
  it('should sign up a user successfully and return a 201 status', async () => {
    const response = await request(app).post('/api/users').send({
      email: test_user.email,
      username: test_user.username,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(201); // 201 Created
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.user.username).toBeDefined();
    expect(response.body.user.email).toBeDefined();
    expect(response.body.user.firebase_uid).toBeDefined();

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(1);
    expect(dbCheck.rows[0].username).toBe(test_user.username);
    expect(dbCheck.rows[0].firebase_uid).toBe(test_user.firebase_uid);
  });

  // Corner cases
  it('should return a 400 status because email field is required', async () => {
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.email[0]).toBe(
      messages.FIELD_NOT_VALID('email'),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status because email field is invalid', async () => {
    const response = await request(app).post('/api/users').send({
      email: test_user.email_invalid,
      username: test_user.username,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.email[0]).toBe(
      messages.FIELD_NOT_VALID('email'),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status because username field is required', async () => {
    const response = await request(app).post('/api/users').send({
      username: '',
      email: test_user.email_invalid,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.username[0]).toBe(messages.FIELD_REQUIRED);

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status because username field is too long', async () => {
    const response = await request(app).post('/api/users').send({
      username: test_user.username_too_long,
      email: test_user.email_invalid,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.username[0]).toBe(
      messages.FIELD_TOO_LONG('Username', consts.USERNAME_MAX_LENGTH),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status because username field is invalid', async () => {
    const response = await request(app).post('/api/users').send({
      username: test_user.username_invalid,
      email: test_user.email_invalid,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.username[0]).toBe(
      messages.USERNAME_INVALID_CHARACTERS,
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });
});
