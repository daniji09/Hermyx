import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { messages, USER_ROLE } from '@hermyx/shared';
import { AppError } from '../src/utils/error.util.js';

const currentUser = vi.hoisted(() => ({
  uid: 41,
  username: 'notified_hero',
  role: 'USER',
}));

const notificationService = vi.hoisted(() => ({
  getMyNotifications: vi.fn(),
  markMyNotificationsAsSeen: vi.fn(),
  markMyNotificationAsSeen: vi.fn(),
  respondToNotification: vi.fn(),
}));

vi.mock('../src/services/notification.service.js', () => notificationService);
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Notification API', () => {
  it('forbids an administrator from using user notifications', async () => {
    currentUser.role = USER_ROLE.ADMIN.ID;

    const response = await request(app).get('/api/notifications/me');

    expect(response.status).toBe(403);
    expect(response.body.errors.general).toEqual([messages.GENERAL.FORBIDDEN]);
    expect(notificationService.getMyNotifications).not.toHaveBeenCalled();
  });

  it('gets all notifications for the current user', async () => {
    const notifications = [{ nid: 1, seen: false }];
    const pagination = {
      currentPage: 1,
      totalPages: 2,
      totalItems: 12,
      hasMore: true,
    };
    notificationService.getMyNotifications.mockResolvedValue({
      notifications,
      totalUnseen: 4,
      pagination,
    });

    const response = await request(app)
      .get('/api/notifications/me')
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      notifications,
      totalUnseen: 4,
      pagination,
    });
    expect(notificationService.getMyNotifications).toHaveBeenCalledWith(
      currentUser.uid,
      { page: 1, limit: 10, offset: 0 },
    );
  });

  it('rejects incomplete notification pagination', async () => {
    const response = await request(app)
      .get('/api/notifications/me')
      .query({ limit: 10 });

    expect(response.status).toBe(400);
    expect(response.body.errors.page).toBeDefined();
    expect(notificationService.getMyNotifications).not.toHaveBeenCalled();
  });

  it('marks every notification as seen', async () => {
    const notifications = [{ nid: 1, seen: true }];
    notificationService.markMyNotificationsAsSeen.mockResolvedValue(
      notifications,
    );

    const response = await request(app).post('/api/notifications/seen');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ notifications });
    expect(notificationService.markMyNotificationsAsSeen).toHaveBeenCalledWith(
      currentUser.uid,
    );
  });

  it('marks one owned notification as seen', async () => {
    const notification = { nid: 7, seen: true };
    notificationService.markMyNotificationAsSeen.mockResolvedValue(
      notification,
    );

    const response = await request(app).post('/api/notifications/7/seen');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ notification });
    expect(notificationService.markMyNotificationAsSeen).toHaveBeenCalledWith(
      7,
      currentUser.uid,
    );
  });

  it.each(['accepted', 'accept', 'rejected'])(
    'responds to a notification with %s',
    async (notificationResponse) => {
      const result = { status: notificationResponse };
      notificationService.respondToNotification.mockResolvedValue(result);

      const response = await request(app)
        .post('/api/notifications/7/respond')
        .send({ response: notificationResponse });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(result);
      expect(notificationService.respondToNotification).toHaveBeenCalledWith({
        nid: 7,
        response: notificationResponse,
        message: undefined,
        user: currentUser,
      });
    },
  );

  it('requires an explanation when a notification is disputed', async () => {
    const response = await request(app)
      .post('/api/notifications/7/respond')
      .send({ response: 'disputed' });

    expect(response.status).toBe(400);
    expect(response.body.errors.message).toBeDefined();
    expect(notificationService.respondToNotification).not.toHaveBeenCalled();
  });

  it('sends the dispute explanation to the service', async () => {
    notificationService.respondToNotification.mockResolvedValue({
      status: 'disputed',
    });

    const response = await request(app)
      .post('/api/notifications/7/respond')
      .send({ response: 'disputed', message: 'The work is incomplete.' });

    expect(response.status).toBe(200);
    expect(notificationService.respondToNotification).toHaveBeenCalledWith({
      nid: 7,
      response: 'disputed',
      message: 'The work is incomplete.',
      user: currentUser,
    });
  });

  it.each([
    [
      'the mission no longer accepts submissions',
      messages.NOTIFICATION.RESPOND_TO_SUBMIT_PARTICIPATION
        .CANNOT_SUBMIT_PARTICIPATION,
    ],
    [
      'the participation was already reviewed',
      messages.NOTIFICATION.RESPOND_TO_SUBMIT_PARTICIPATION.ALREADY_REVIEWED,
    ],
  ])('returns a conflict when %s', async (_case, message) => {
    notificationService.respondToNotification.mockRejectedValue(
      new AppError(message, 409),
    );

    const response = await request(app)
      .post('/api/notifications/7/respond')
      .send({ response: 'accepted' });

    expect(response.status).toBe(409);
    expect(response.body.errors.general).toEqual([message]);
  });

  it('rejects an invalid notification id', async () => {
    const response = await request(app).post(
      '/api/notifications/not-a-number/seen',
    );

    expect(response.status).toBe(400);
    expect(notificationService.markMyNotificationAsSeen).not.toHaveBeenCalled();
  });

  it('maps notification service errors through the shared handler', async () => {
    notificationService.markMyNotificationAsSeen.mockRejectedValue(
      new AppError(messages.NOTIFICATION.GENERAL.NOT_FOUND, 404),
    );

    const response = await request(app).post('/api/notifications/999/seen');

    expect(response.status).toBe(404);
    expect(response.body.errors.general).toEqual([
      messages.NOTIFICATION.GENERAL.NOT_FOUND,
    ]);
  });

  it('forbids changing a notification owned by another user', async () => {
    notificationService.markMyNotificationAsSeen.mockRejectedValue(
      new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403),
    );

    const response = await request(app).post('/api/notifications/7/seen');

    expect(response.status).toBe(403);
    expect(response.body.errors.general).toEqual([
      messages.GENERAL.UNAUTHORIZED_ERROR,
    ]);
  });
});

describe('Notification automatic participation review', () => {
  it('reports a Stripe payout failure without announcing a false approval', async () => {
    const actualNotificationService = await vi.importActual(
      '../src/services/notification.service.js',
    );
    const notificationModel = await vi.importActual(
      '../src/models/notification.model.js',
    );
    const missionService = await vi.importActual(
      '../src/services/service.service.js',
    );
    const userService = await vi.importActual(
      '../src/services/user.service.js',
    );
    const paymentProvider = await vi.importActual(
      '../src/providers/payment.provider.js',
    );
    const stripeError = new Error('Stripe idempotency conflict');
    const notification = {
      nid: 5,
      sender_id: 3,
      payload: { associated_mission_id: 1 },
    };
    const mission = { mid: 1, title: 'Test mission' };
    const participation = {
      id: 1,
      mid: 1,
      adventurer_id: 3,
      status: 'SUBMITTED',
      monetary_reward: 22,
    };
    const adventurer = {
      uid: 3,
      username: 'adventurer',
      stripe_connected_id: 'acct_test',
    };

    vi.spyOn(
      notificationModel,
      'findExpiredParticipationReviews',
    ).mockResolvedValue([notification]);
    vi.spyOn(missionService, 'getMissionByIdOrThrow').mockResolvedValue(
      mission,
    );
    vi.spyOn(
      missionService,
      'getMissionParticipationByMidAndAdventurerIdOrThrow',
    ).mockResolvedValue(participation);
    vi.spyOn(userService, 'getUserByUidOrThrow').mockImplementation(
      async (uid) =>
        uid === adventurer.uid
          ? adventurer
          : { uid, username: 'Hermyx_system' },
    );
    vi.spyOn(
      missionService,
      'updateParticipationStatusByMidAndAdventurer',
    ).mockResolvedValue({ ...participation, status: 'ACCEPTED' });
    const restoreParticipation = vi
      .spyOn(missionService, 'restoreParticipationAfterFailedAcceptance')
      .mockResolvedValue({ ...participation, status: 'SUBMITTED' });
    vi.spyOn(paymentProvider, 'createTransfer').mockRejectedValue(stripeError);
    const createNotification = vi
      .spyOn(notificationModel, 'create')
      .mockResolvedValue(99);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await actualNotificationService.autoAcceptParticipation();

    expect(result.successes).toEqual([]);
    expect(result.errors).toEqual([
      'Stripe idempotency conflict. Notification: 5.',
    ]);
    expect(restoreParticipation).toHaveBeenCalledWith(1, 3);
    expect(createNotification).not.toHaveBeenCalled();
  });
});
