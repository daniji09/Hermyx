import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { messages } from '@hermyx/shared';
import { AppError } from '../src/utils/error.util.js';

const authService = vi.hoisted(() => ({
  signup: vi.fn(),
  login: vi.fn(),
  syncGoogle: vi.fn(),
}));

vi.mock('../src/services/auth.service.js', () => authService);

import app from '../src/app.js';

const validSignup = {
  email: 'hero@example.com',
  username: 'test_hero',
  password: 'StrongPassword1!',
  confirmPassword: 'StrongPassword1!',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Authentication API', () => {
  describe('POST /api/auth/signup', () => {
    it('creates a user and does not pass confirmPassword to the service', async () => {
      const user = { uid: 7, email: validSignup.email, username: 'test_hero' };
      authService.signup.mockResolvedValue(user);

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignup);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ user });
      expect(authService.signup).toHaveBeenCalledWith(
        validSignup.email,
        validSignup.username,
        validSignup.password,
      );
    });

    it('rejects mismatching passwords before calling the service', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({ ...validSignup, confirmPassword: 'DifferentPassword1!' });

      expect(response.status).toBe(400);
      expect(response.body.errors.confirmPassword).toBeDefined();
      expect(authService.signup).not.toHaveBeenCalled();
    });

    it('maps a signup conflict returned by the service', async () => {
      authService.signup.mockRejectedValue(
        new AppError(
          messages.AUTH.SIGNUP.EMAIL_ALREADY_EXISTS(validSignup.email),
          409,
          'email',
        ),
      );

      const response = await request(app)
        .post('/api/auth/signup')
        .send(validSignup);

      expect(response.status).toBe(409);
      expect(response.body.errors.email).toEqual([
        messages.AUTH.SIGNUP.EMAIL_ALREADY_EXISTS(validSignup.email),
      ]);
    });
  });

  describe('POST /api/auth/login', () => {
    it.each([
      ['email', { email: validSignup.email }],
      ['username', { username: validSignup.username }],
    ])('logs in with %s', async (_kind, identifier) => {
      authService.login.mockResolvedValue('firebase-custom-token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({ ...identifier, password: validSignup.password });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ token: 'firebase-custom-token' });
      expect(authService.login).toHaveBeenCalledWith(
        identifier.email,
        identifier.username,
        validSignup.password,
      );
    });

    it('requires either email or username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: validSignup.password });

      expect(response.status).toBe(400);
      expect(response.body.errors.usernameEmail).toBeDefined();
      expect(authService.login).not.toHaveBeenCalled();
    });

    it('returns the service authentication error', async () => {
      authService.login.mockRejectedValue(
        new AppError(messages.AUTH.LOGIN.INVALID_CREDENTIALS, 401),
      );

      const response = await request(app).post('/api/auth/login').send({
        email: validSignup.email,
        password: validSignup.password,
      });

      expect(response.status).toBe(401);
      expect(response.body.errors.general).toEqual([
        messages.AUTH.LOGIN.INVALID_CREDENTIALS,
      ]);
    });
  });

  describe('POST /api/auth/sync-google', () => {
    const payload = {
      email: 'google@example.com',
      username: 'google_hero',
      firebaseUid: 'firebase-google-uid',
    };

    it.each([
      [true, 200],
      [false, 201],
    ])(
      'uses the correct status when isLogin is %s',
      async (isLogin, status) => {
        const user = { uid: 8, ...payload };
        authService.syncGoogle.mockResolvedValue({ user, isLogin });

        const response = await request(app)
          .post('/api/auth/sync-google')
          .send(payload);

        expect(response.status).toBe(status);
        expect(response.body).toEqual({ user });
        expect(authService.syncGoogle).toHaveBeenCalledWith(
          payload.email,
          payload.username,
          payload.firebaseUid,
        );
      },
    );

    it('rejects an empty Firebase UID', async () => {
      const response = await request(app)
        .post('/api/auth/sync-google')
        .send({ ...payload, firebaseUid: '' });

      expect(response.status).toBe(400);
      expect(response.body.errors.firebaseUid).toBeDefined();
      expect(authService.syncGoogle).not.toHaveBeenCalled();
    });
  });
});
