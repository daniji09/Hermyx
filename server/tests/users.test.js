import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { messages, USER_ROLE } from '@hermyx/shared';
import { AppError } from '../src/utils/error.util.js';

const currentUser = vi.hoisted(() => ({
  uid: 11,
  email: 'current@example.com',
  username: 'current_hero',
  firebase_uid: 'firebase-current',
  stripe_customer_id: 'cus_current',
  role: 'USER',
}));

const userService = vi.hoisted(() => ({
  searchUserByUsername: vi.fn(),
  getMyProfile: vi.fn(),
  getUserMissions: vi.fn(),
  getUserPublicProfile: vi.fn(),
  getUserPublicMissions: vi.fn(),
  updateMyProfile: vi.fn(),
  updateMyAvatar: vi.fn(),
  updateMyEmail: vi.fn(),
  updateMyConfiguration: vi.fn(),
  addEmailAuthentication: vi.fn(),
  deleteMe: vi.fn(),
  banUser: vi.fn(),
  getUserByUidOrThrow: vi.fn(),
  updateUserStripeCustomerIdByUid: vi.fn(),
}));

vi.mock('../src/services/user.service.js', () => userService);
vi.mock('../src/middlewares/auth.middleware.js', async (importOriginal) => ({
  ...(await importOriginal()),
  verifyToken: (req, _res, next) => {
    req.user = { ...currentUser };
    req.firebaseToken = { admin: currentUser.role === USER_ROLE.ADMIN.ID };
    next();
  },
  verifyAdmin: (_req, _res, next) => next(),
}));

import app from '../src/app.js';

beforeEach(() => {
  vi.clearAllMocks();
  currentUser.role = USER_ROLE.USER.ID;
});

describe('User API', () => {
  it('forbids an administrator from editing an account profile', async () => {
    currentUser.role = USER_ROLE.ADMIN.ID;

    const response = await request(app)
      .patch('/api/users/me/profile')
      .send({ description: 'Administrative profile edit.' });

    expect(response.status).toBe(403);
    expect(response.body.errors.general).toEqual([messages.GENERAL.FORBIDDEN]);
    expect(userService.updateMyProfile).not.toHaveBeenCalled();
  });

  it('searches users by partial username with pagination', async () => {
    const users = [{ uid: 12, username: 'current_friend' }];
    const pagination = { currentPage: 2, totalPages: 3 };
    userService.searchUserByUsername.mockResolvedValue({ users, pagination });

    const response = await request(app)
      .get('/api/users/search')
      .query({ username: 'current', page: 2, limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ users, pagination });
    expect(userService.searchUserByUsername).toHaveBeenCalledWith(
      'current',
      currentUser.uid,
      expect.objectContaining({ page: 2, limit: 5 }),
    );
  });

  it('rejects an incomplete search pagination pair', async () => {
    const response = await request(app)
      .get('/api/users/search')
      .query({ username: 'current', page: 2 });

    expect(response.status).toBe(400);
    expect(userService.searchUserByUsername).not.toHaveBeenCalled();
  });

  it('returns the authenticated user without another lookup', async () => {
    const response = await request(app).get('/api/users/me');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(currentUser);
  });

  it('gets the current user profile', async () => {
    const profile = { username: currentUser.username, rating: 4.5 };
    userService.getMyProfile.mockResolvedValue(profile);

    const response = await request(app).get('/api/users/me/profile');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(profile);
    expect(userService.getMyProfile).toHaveBeenCalledWith(currentUser);
  });

  it('gets a user mission page', async () => {
    const missions = [{ mid: 31, title: 'Mission' }];
    const pagination = { currentPage: 1, totalPages: 1 };
    userService.getUserMissions.mockResolvedValue({ missions, pagination });

    const response = await request(app)
      .get('/api/users/12/missions')
      .query({ type: 'joined', page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ missions, pagination });
    expect(userService.getUserMissions).toHaveBeenCalledWith(
      12,
      'joined',
      expect.objectContaining({ page: 1, limit: 10 }),
    );
  });

  it('gets only the public profile fields', async () => {
    const user = { username: 'public_hero', description: 'Hello' };
    userService.getUserPublicProfile.mockResolvedValue({
      user,
      missionsVisible: true,
    });

    const response = await request(app).get('/api/users/public_hero/profile');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user, missionsVisible: true });
    expect(userService.getUserPublicProfile).toHaveBeenCalledWith(
      'public_hero',
    );
  });

  it('gets public profile missions', async () => {
    const missions = [{ mid: 32 }];
    const pagination = { currentPage: 1 };
    userService.getUserPublicMissions.mockResolvedValue({
      missions,
      pagination,
    });

    const response = await request(app)
      .get('/api/users/public_hero/profile/missions')
      .query({ type: 'published', page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ missions, pagination });
    expect(userService.getUserPublicMissions).toHaveBeenCalledWith(
      'public_hero',
      'published',
      expect.objectContaining({ page: 1, limit: 10 }),
    );
  });

  it('updates editable profile fields', async () => {
    const payload = {
      username: 'updated_hero',
      name: 'Updated',
      surnames: 'Hero',
      description: 'New bio',
      latitude: 40.4,
      longitude: -3.7,
    };
    userService.updateMyProfile.mockResolvedValue(payload);

    const response = await request(app)
      .patch('/api/users/me/profile')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.profile).toEqual({
      username: payload.username,
      name: payload.name,
      surnames: payload.surnames,
      description: payload.description,
    });
    expect(userService.updateMyProfile).toHaveBeenCalledWith(
      currentUser,
      payload,
    );
  });

  it('updates the avatar through the upload endpoint', async () => {
    userService.updateMyAvatar.mockResolvedValue('/uploads/avatars/avatar.png');

    const response = await request(app).patch('/api/users/me/avatar');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ avatar: '/uploads/avatars/avatar.png' });
    expect(userService.updateMyAvatar).toHaveBeenCalledWith(
      currentUser.uid,
      undefined,
    );
  });

  it('updates the account email', async () => {
    const changedUser = { ...currentUser, email: 'changed@example.com' };
    userService.updateMyEmail.mockResolvedValue(changedUser);

    const response = await request(app)
      .patch('/api/users/me/email')
      .send({ email: changedUser.email });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(changedUser);
    expect(userService.updateMyEmail).toHaveBeenCalledWith(
      currentUser,
      changedUser.email,
    );
  });

  it('updates user configuration', async () => {
    const configuration = { show_missions_to_others: false };
    userService.updateMyConfiguration.mockResolvedValue(configuration);

    const response = await request(app)
      .patch('/api/users/me/configuration')
      .send({ configuration });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ configuration });
    expect(userService.updateMyConfiguration).toHaveBeenCalledWith(
      currentUser.uid,
      configuration,
    );
  });

  it('adds email credentials to a Google account', async () => {
    const payload = {
      email: 'credentials@example.com',
      password: 'StrongPassword1!',
      confirmPassword: 'StrongPassword1!',
    };
    userService.addEmailAuthentication.mockResolvedValue({
      ...currentUser,
      email: payload.email,
    });

    const response = await request(app)
      .post('/api/users/me/credentials')
      .send(payload);

    expect(response.status).toBe(200);
    expect(userService.addEmailAuthentication).toHaveBeenCalledWith(
      currentUser,
      payload.email,
      payload.password,
    );
  });

  it.each([
    ['active missions', messages.USER.DELETE_ME.ACTIVE_MISSIONS],
    ['active disputes', messages.USER.DELETE_ME.ACTIVE_DISPUTES],
  ])('prevents account deletion with %s', async (_case, message) => {
    userService.deleteMe.mockRejectedValue(new AppError(message, 409));

    const response = await request(app).delete('/api/users/me');

    expect(response.status).toBe(409);
    expect(response.body.errors.general).toEqual([message]);
    expect(userService.deleteMe).toHaveBeenCalledWith(currentUser);
  });

  it('forbids banning a user without sufficient permissions', async () => {
    userService.banUser.mockRejectedValue(
      new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403),
    );

    const response = await request(app)
      .post('/api/users/12/ban')
      .send({ rid: 7, reason: 'Administrative review.' });

    expect(response.status).toBe(403);
    expect(response.body.errors.general).toEqual([
      messages.GENERAL.UNAUTHORIZED_ERROR,
    ]);
    expect(userService.banUser).toHaveBeenCalledWith(
      12,
      7,
      'Administrative review.',
      currentUser,
    );
  });

  it('returns an internal error when a user operation fails unexpectedly', async () => {
    userService.getMyProfile.mockRejectedValue(
      new AppError(messages.GENERAL.UNEXPECTED_ERROR, 500),
    );

    const response = await request(app).get('/api/users/me/profile');

    expect(response.status).toBe(500);
    expect(response.body.errors.general).toEqual([
      messages.GENERAL.UNEXPECTED_ERROR,
    ]);
  });

  it('uses the shared error handler for service failures', async () => {
    userService.getMyProfile.mockRejectedValue(
      new AppError(messages.USER.GENERAL.USER_NOT_FOUND, 404),
    );

    const response = await request(app).get('/api/users/me/profile');

    expect(response.status).toBe(404);
    expect(response.body.errors.general).toEqual([
      messages.USER.GENERAL.USER_NOT_FOUND,
    ]);
  });
});
