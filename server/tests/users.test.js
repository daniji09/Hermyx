import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import pool from '../src/config/db.config.js';
import { messages, consts } from '@hermyx/shared';
import { createFirebaseUser } from '../src/services/auth.service.js';

// Test fake data
const test_user = vi.hoisted(() => {
  return {
    email: 'test@email.com',
    emailAlternative: 'test2@email.com',
    emailInvalid: 'test@email.c',
    username: 'testUser',
    usernameAlternative: 'testUser2',
    usernameTooLong: 'username'.repeat(3),
    usernameInvalid: '@username?',
    password: 'testPassword123_',
    passwordAlternative: 'testPassword123__',
    passwordInvalid: 'reallyStrongPassword',
    passwordTooShort: 'pass',
    passwordTooLong: 'password'.repeat(1000),
    confirmPassword: 'testPassword123_',
    confirmPasswordAlternative: 'testPassword123__',
    confirmPasswordInvalid: 'confirmPassword',
    firebaseUid: 'test-firebase-uid-123',
  };
});

// Mocks for Firebase API
vi.mock('../src/services/auth.service.js', () => {
  return {
    createFirebaseUser: vi
      .fn()
      .mockResolvedValue({ uid: test_user.firebaseUid }),

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
    expect(dbCheck.rows[0].firebase_uid).toBe(test_user.firebaseUid);
  });

  // Corner cases
  // Field validation errors
  it('should return a 400 status without modifying db because email field is required', async () => {
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

  it('should return a 400 status without modifying db because email field is invalid', async () => {
    const response = await request(app).post('/api/users').send({
      email: test_user.emailInvalid,
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

  it('should return a 400 status without modifying db because username field is required', async () => {
    const response = await request(app).post('/api/users').send({
      username: '',
      email: test_user.email,
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

  it('should return a 400 status without modifying db because username field is too long', async () => {
    const response = await request(app).post('/api/users').send({
      username: test_user.usernameTooLong,
      email: test_user.email,
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

  it('should return a 400 status without modifying db because username field is invalid', async () => {
    const response = await request(app).post('/api/users').send({
      username: test_user.usernameInvalid,
      email: test_user.email,
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

  it('should return a 400 status without modifying db because password field is required', async () => {
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: '',
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.password[0]).toBe(messages.FIELD_REQUIRED);

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status without modifying db because password field is too short', async () => {
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.passwordTooShort,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.password[0]).toBe(
      messages.FIELD_TOO_SHORT('Password', consts.PASSWORD_MIN_LENGTH),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status without modifying db because password field is too long', async () => {
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.passwordTooLong,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.password[0]).toBe(
      messages.FIELD_TOO_LONG('Password', consts.PASSWORD_MAX_LENGTH),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status without modifying db because password field restrictions are not satisfied', async () => {
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.passwordInvalid,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.password[0]).toBe(
      messages.FIELD_NOT_VALID('password'),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status without modifying db because confirm password field is required', async () => {
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.password,
      confirmPassword: '',
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.confirmPassword[0]).toBe(
      messages.CONFIRM_PASSWORD,
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status without modifying db because password and confirm password fields do not match', async () => {
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.password,
      confirmPassword: test_user.confirmPasswordInvalid,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.confirmPassword[0]).toBe(
      messages.PASSWORDS_NOT_MATCH,
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  // Logic errors
  it('should return a 400 status without modifying db because new users email is already in use', async () => {
    // First a correct new user is added
    await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Then, another user with same email is tried to be added
    const response = await request(app).post('/api/users').send({
      username: test_user.usernameAlternative,
      email: test_user.email,
      password: test_user.passwordAlternative,
      confirmPassword: test_user.confirmPasswordAlternative,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.email[0]).toBe(
      messages.EMAIL_ALREADY_EXISTS(test_user.email),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(1);

    const dbCheck2 = await pool.query(
      'SELECT * FROM app_user WHERE username = $1',
      [test_user.usernameAlternative],
    );
    expect(dbCheck2.rows.length).toBe(0);
  });

  it('should return a 400 status without modifying db because new users username is already in use', async () => {
    // First a correct new user is added
    await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Then, another user with same username is tried to be added
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.emailAlternative,
      password: test_user.passwordAlternative,
      confirmPassword: test_user.confirmPasswordAlternative,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.username[0]).toBe(
      messages.USERNAME_ALREADY_EXISTS(test_user.username),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE username = $1',
      [test_user.username],
    );
    expect(dbCheck.rows.length).toBe(1);

    const dbCheck2 = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.emailAlternative],
    );
    expect(dbCheck2.rows.length).toBe(0);
  });

  // Firebase errors
  it('should return a 400 status without modifying db because new users email already exists in Firebase', async () => {
    // First, the Firebase error is emulated
    const firebaseError = new Error();
    firebaseError.code = 'auth/email-already-exists';

    // Mock should reject this time the petition
    createFirebaseUser.mockRejectedValueOnce(firebaseError);

    // Then a new user is added
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.email[0]).toBe(
      messages.EMAIL_ALREADY_EXISTS(test_user.email),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status without modifying db because new users email is already in use in Firebase', async () => {
    // First, the Firebase error is emulated
    const firebaseError = new Error();
    firebaseError.code = 'auth/email-already-in-use';

    // Mock should reject this time the petition
    createFirebaseUser.mockRejectedValueOnce(firebaseError);

    // Then a new user is added
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.email[0]).toBe(
      messages.EMAIL_ALREADY_EXISTS(test_user.email),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status without modifying db because new users email is invalid for Firebase', async () => {
    // First, the Firebase error is emulated
    const firebaseError = new Error();
    firebaseError.code = 'auth/invalid-email';

    // Mock should reject this time the petition
    createFirebaseUser.mockRejectedValueOnce(firebaseError);

    // Then a new user is added
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
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

  it('should return a 400 status without modifying db because new users password is invalid for Firebase', async () => {
    // First, the Firebase error is emulated
    const firebaseError = new Error();
    firebaseError.code = 'auth/invalid-password';

    // Mock should reject this time the petition
    createFirebaseUser.mockRejectedValueOnce(firebaseError);

    // Then a new user is added
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.password[0]).toBe(
      messages.FIELD_NOT_VALID('password'),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status without modifying db because new users email is missing for Firebase', async () => {
    // First, the Firebase error is emulated
    const firebaseError = new Error();
    firebaseError.code = 'auth/missing-email';

    // Mock should reject this time the petition
    createFirebaseUser.mockRejectedValueOnce(firebaseError);

    // Then a new user is added
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.email[0]).toBe(messages.FIELD_REQUIRED);

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status without modifying db because new users password is missing for Firebase', async () => {
    // First, the Firebase error is emulated
    const firebaseError = new Error();
    firebaseError.code = 'auth/missing-password';

    // Mock should reject this time the petition
    createFirebaseUser.mockRejectedValueOnce(firebaseError);

    // Then a new user is added
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.password[0]).toBe(messages.FIELD_REQUIRED);

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 502 status without modifying db because network failed for Firebase', async () => {
    // First, the Firebase error is emulated
    const firebaseError = new Error();
    firebaseError.code = 'auth/network-request-failed';

    // Mock should reject this time the petition
    createFirebaseUser.mockRejectedValueOnce(firebaseError);

    // Then a new user is added
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(502); // 502 Bad Gateway
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.general[0]).toBe(messages.CONNECTION_ERROR);

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });

  it('should return a 400 status without modifying db because users password is weak for Firebase', async () => {
    // First, the Firebase error is emulated
    const firebaseError = new Error();
    firebaseError.code = 'auth/weak-password';

    // Mock should reject this time the petition
    createFirebaseUser.mockRejectedValueOnce(firebaseError);

    // Then a new user is added
    const response = await request(app).post('/api/users').send({
      username: test_user.username,
      email: test_user.email,
      password: test_user.password,
      confirmPassword: test_user.confirmPassword,
    });

    // Checks response
    expect(response.status).toBe(400); // 400 Bad Request
    expect(response.headers['content-type']).toEqual(
      expect.stringContaining('json'),
    );
    expect(response.body.errors.password[0]).toBe(
      messages.FIELD_NOT_VALID('password'),
    );

    // Checks db
    const dbCheck = await pool.query(
      'SELECT * FROM app_user WHERE email = $1',
      [test_user.email],
    );
    expect(dbCheck.rows.length).toBe(0);
  });
});
