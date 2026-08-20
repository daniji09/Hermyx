import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { consts, messages } from '@hermyx/shared';
import { AppError } from '../src/utils/error.util.js';

const currentUser = vi.hoisted(() => ({
  uid: 21,
  username: 'mission_owner',
}));

const missionService = vi.hoisted(() => ({
  getMissions: vi.fn(),
  getOpenedMissions: vi.fn(),
  getMissionByMid: vi.fn(),
  publishMission: vi.fn(),
  closeMission: vi.fn(),
  joinMission: vi.fn(),
  inviteToMission: vi.fn(),
  unjoinMission: vi.fn(),
  submitMissionParticipation: vi.fn(),
  reopenMission: vi.fn(),
  finishMission: vi.fn(),
  editMission: vi.fn(),
}));

vi.mock('../src/services/mission.service.js', () => missionService);
vi.mock('../src/middlewares/auth.middleware.js', () => ({
  verifyToken: (req, _res, next) => {
    req.user = { ...currentUser };
    next();
  },
  verifyAdmin: (_req, _res, next) => next(),
}));

import app from '../src/app.js';

const vacancy = {
  id: 'temporary-1',
  reward: 50,
  title: 'Adventurer',
  description: 'Complete the mission',
};

const missionPayload = {
  title: 'Deliver the relic',
  description: 'Carry the relic safely to its destination.',
  vacancies: 1,
  vacanciesData: JSON.stringify([vacancy]),
  latitude: 40.4168,
  longitude: -3.7038,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Mission API', () => {
  it('lists missions with title and pagination', async () => {
    const missions = [{ mid: 1, title: missionPayload.title }];
    const paginationData = {
      currentPage: 1,
      totalPages: 1,
      totalItems: 1,
      hasMore: false,
    };
    missionService.getMissions.mockResolvedValue({ missions, paginationData });

    const response = await request(app)
      .get('/api/missions')
      .query({ title: 'relic', page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ missions, pagination: paginationData });
    expect(missionService.getMissions).toHaveBeenCalledWith(
      'relic',
      expect.objectContaining({ page: 1, limit: 10 }),
    );
  });

  it.each([
    ['page', 'not-a-number'],
    ['limit', -1],
  ])('rejects invalid %s pagination values', async (field, value) => {
    const response = await request(app)
      .get('/api/missions')
      .query({ page: 1, limit: 10, [field]: value });

    expect(response.status).toBe(400);
    expect(response.body.errors[field]).toBeDefined();
    expect(missionService.getMissions).not.toHaveBeenCalled();
  });

  it('lists opened missions with filters and excludes the current owner', async () => {
    missionService.getOpenedMissions.mockResolvedValue({
      missions: [],
      paginationData: { currentPage: 1 },
    });

    const response = await request(app).get('/api/missions/opened').query({
      title: 'relic',
      minPayment: '10,5',
      maxPayment: 100,
      maxDistanceKm: 20,
      page: 1,
      limit: 10,
    });

    expect(response.status).toBe(200);
    expect(missionService.getOpenedMissions).toHaveBeenCalledWith(
      'relic',
      10.5,
      100,
      20,
      expect.objectContaining({ page: 1, limit: 10 }),
      currentUser.uid,
      currentUser,
    );
  });

  it('rejects an inverted payment range', async () => {
    const response = await request(app)
      .get('/api/missions/opened')
      .query({ minPayment: 100, maxPayment: 10 });

    expect(response.status).toBe(400);
    expect(missionService.getOpenedMissions).not.toHaveBeenCalled();
  });

  it('gets one mission for the current user', async () => {
    const mission = {
      mission: {
        mid: 5,
        is_joined: false,
        has_pending_join_request: false,
      },
      isOwner: false,
    };
    missionService.getMissionByMid.mockResolvedValue(mission);

    const response = await request(app).get('/api/missions/5');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mission);
    expect(missionService.getMissionByMid).toHaveBeenCalledWith(
      5,
      currentUser.uid,
    );
  });

  it('returns whether the current user joined the mission', async () => {
    missionService.getMissionByMid.mockResolvedValue({
      mission: { mid: 5, is_joined: true },
      isOwner: false,
    });

    const response = await request(app).get('/api/missions/5');

    expect(response.status).toBe(200);
    expect(response.body.mission.is_joined).toBe(true);
  });

  it('returns whether the current user has a pending join request', async () => {
    missionService.getMissionByMid.mockResolvedValue({
      mission: { mid: 5, has_pending_join_request: true },
      isOwner: false,
    });

    const response = await request(app).get('/api/missions/5');

    expect(response.status).toBe(200);
    expect(response.body.mission.has_pending_join_request).toBe(true);
  });

  it.each(['not-a-number', '1.5', '-1'])(
    'rejects the invalid mission identifier %s',
    async (missionId) => {
      const response = await request(app).get(`/api/missions/${missionId}`);

      expect(response.status).toBe(400);
      expect(response.body.errors.mid).toBeDefined();
      expect(missionService.getMissionByMid).not.toHaveBeenCalled();
    },
  );

  it('publishes a validated mission', async () => {
    const mission = { mid: 6, title: missionPayload.title };
    missionService.publishMission.mockResolvedValue(mission);

    const response = await request(app)
      .post('/api/missions')
      .send(missionPayload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ mission });
    expect(missionService.publishMission).toHaveBeenCalledWith(
      currentUser.uid,
      missionPayload.title,
      missionPayload.description,
      missionPayload.vacancies,
      [expect.objectContaining(vacancy)],
      missionPayload.latitude,
      missionPayload.longitude,
      [],
    );
  });

  it('rejects a mission with malformed vacancy data', async () => {
    const response = await request(app)
      .post('/api/missions')
      .send({ ...missionPayload, vacanciesData: '{invalid-json' });

    expect(response.status).toBe(400);
    expect(response.body.errors.vacanciesData).toBeDefined();
    expect(missionService.publishMission).not.toHaveBeenCalled();
  });

  it.each([
    ['title', ''],
    ['description', ''],
    ['vacancies', undefined],
    ['vacanciesData', undefined],
  ])('rejects a published mission without valid %s', async (field, value) => {
    const response = await request(app)
      .post('/api/missions')
      .send({ ...missionPayload, [field]: value });

    expect(response.status).toBe(400);
    expect(response.body.errors[field]).toBeDefined();
    expect(missionService.publishMission).not.toHaveBeenCalled();
  });

  it.each([
    ['title', 'a'.repeat(consts.MISSION.TITLE.MAX_LENGTH + 1)],
    ['description', 'a'.repeat(consts.MISSION.DESCRIPTION.MAX_LENGTH + 1)],
    ['vacancies', consts.MISSION.VACANCIES.MIN - 1],
    ['vacancies', consts.MISSION.VACANCIES.MAX + 1],
    ['vacancies', 1.5],
  ])(
    'rejects a published mission when %s is outside its current contract',
    async (field, value) => {
      const response = await request(app)
        .post('/api/missions')
        .send({ ...missionPayload, [field]: value });

      expect(response.status).toBe(400);
      expect(response.body.errors[field]).toBeDefined();
      expect(missionService.publishMission).not.toHaveBeenCalled();
    },
  );

  it('forwards a duplicate mission title error', async () => {
    missionService.publishMission.mockRejectedValue(
      new AppError(messages.MISSION.PUBLISH.MISSION_WITH_SAME_TITLE, 400),
    );

    const response = await request(app)
      .post('/api/missions')
      .send(missionPayload);

    expect(response.status).toBe(400);
    expect(response.body.errors.general).toEqual([
      messages.MISSION.PUBLISH.MISSION_WITH_SAME_TITLE,
    ]);
  });

  it('closes a mission', async () => {
    const result = { status: 'in_progress', participants: [{ id: 1 }] };
    missionService.closeMission.mockResolvedValue(result);

    const response = await request(app).post('/api/missions/6/close');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(result);
    expect(missionService.closeMission).toHaveBeenCalledWith(6, currentUser);
  });

  it('rejects closing a mission by a non-owner', async () => {
    missionService.closeMission.mockRejectedValue(
      new AppError(messages.GENERAL.UNAUTHORIZED_ERROR, 403),
    );

    const response = await request(app).post('/api/missions/6/close');

    expect(response.status).toBe(403);
    expect(response.body.errors.general).toEqual([
      messages.GENERAL.UNAUTHORIZED_ERROR,
    ]);
  });

  it('returns not found when closing a missing mission', async () => {
    missionService.closeMission.mockRejectedValue(
      new AppError(messages.MISSION.GENERAL.MISSION_NOT_FOUND, 404),
    );

    const response = await request(app).post('/api/missions/999/close');

    expect(response.status).toBe(404);
    expect(response.body.errors.general).toEqual([
      messages.MISSION.GENERAL.MISSION_NOT_FOUND,
    ]);
  });

  it.each([
    ['has no adventurers', messages.MISSION.CLOSE.CANNOT_WITHOUT_ADVENTURERS],
    [
      'is in an incompatible state',
      messages.MISSION.CLOSE.CANNOT_ON_CURRENT_STATE,
    ],
  ])(
    'returns a conflict when closing a mission that %s',
    async (_case, message) => {
      missionService.closeMission.mockRejectedValue(new AppError(message, 409));

      const response = await request(app).post('/api/missions/6/close');

      expect(response.status).toBe(409);
      expect(response.body.errors.general).toEqual([message]);
    },
  );

  it('sends a join request', async () => {
    const response = await request(app).post('/api/missions/6/join').send({
      vacancyId: 9,
      message: 'I can help.',
    });

    expect(response.status).toBe(200);
    expect(missionService.joinMission).toHaveBeenCalledWith(
      6,
      currentUser,
      'I can help.',
      9,
    );
  });

  it.each([
    ['the mission is full', messages.MISSION.JOIN.FILLED],
    ['a request was already sent', messages.MISSION.JOIN.REQUEST_ALREADY_SENT],
  ])('returns a conflict when joining because %s', async (_case, message) => {
    missionService.joinMission.mockRejectedValue(new AppError(message, 409));

    const response = await request(app).post('/api/missions/6/join').send({
      vacancyId: 9,
      message: 'I can help.',
    });

    expect(response.status).toBe(409);
    expect(response.body.errors.general).toEqual([message]);
  });

  it('invites a user to a vacancy', async () => {
    missionService.inviteToMission.mockResolvedValue(41);

    const response = await request(app).post('/api/missions/6/invite').send({
      receiverId: 22,
      vacancyId: 9,
      message: 'Join us.',
    });

    expect(response.status).toBe(200);
    expect(response.body).toBe(41);
    expect(missionService.inviteToMission).toHaveBeenCalledWith(
      6,
      9,
      currentUser.uid,
      22,
      'Join us.',
      currentUser,
    );
  });

  it.each([
    [
      'the owner invites themselves',
      messages.MISSION.INVITE.CANNOT_INVITE_YOURSELF,
    ],
    [
      'the vacancy is occupied',
      messages.MISSION.INVITE.VACANCY_ALREADY_OCCUPIED,
    ],
    [
      'the invitation was already sent',
      messages.MISSION.INVITE.INVITATION_ALREADY_SENT,
    ],
  ])('returns a conflict when %s', async (_case, message) => {
    missionService.inviteToMission.mockRejectedValue(
      new AppError(message, 409),
    );

    const response = await request(app).post('/api/missions/6/invite').send({
      receiverId: 22,
      vacancyId: 9,
      message: 'Join us.',
    });

    expect(response.status).toBe(409);
    expect(response.body.errors.general).toEqual([message]);
  });

  it('unjoins a vacancy', async () => {
    const response = await request(app)
      .post('/api/missions/6/unjoin')
      .send({ vacancyId: 9 });

    expect(response.status).toBe(200);
    expect(missionService.unjoinMission).toHaveBeenCalledWith(
      6,
      9,
      currentUser,
    );
  });

  it('returns an internal error when unjoining fails unexpectedly', async () => {
    missionService.unjoinMission.mockRejectedValue(
      new AppError(messages.GENERAL.UNEXPECTED_ERROR, 500),
    );

    const response = await request(app)
      .post('/api/missions/6/unjoin')
      .send({ vacancyId: 9 });

    expect(response.status).toBe(500);
    expect(response.body.errors.general).toEqual([
      messages.GENERAL.UNEXPECTED_ERROR,
    ]);
  });

  it('submits the current participation for review', async () => {
    const participation = { id: 9, status: 'submitted' };
    missionService.submitMissionParticipation.mockResolvedValue(participation);

    const response = await request(app).post('/api/missions/6/submit');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      participation,
    });
    expect(missionService.submitMissionParticipation).toHaveBeenCalledWith(
      6,
      currentUser,
    );
  });

  it('finishes a mission', async () => {
    const response = await request(app).post('/api/missions/6/finish');

    expect(response.status).toBe(200);
    expect(missionService.finishMission).toHaveBeenCalledWith(6, currentUser);
  });

  it('reopens a mission', async () => {
    const response = await request(app).post('/api/missions/6/reopen');

    expect(response.status).toBe(200);
    expect(missionService.reopenMission).toHaveBeenCalledWith(6, currentUser);
  });

  it('edits a mission and keeps existing photo URLs', async () => {
    const payload = {
      ...missionPayload,
      mid: 6,
      existingPhotos: ['/uploads/mission-photos/existing.png'],
    };
    const mission = { mid: 6, title: payload.title };
    missionService.editMission.mockResolvedValue(mission);

    const response = await request(app).put('/api/missions/6').send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ mission });
    expect(missionService.editMission).toHaveBeenCalledWith(
      currentUser,
      expect.objectContaining({ mid: 6, vacanciesData: [vacancy] }),
      [],
      payload.existingPhotos,
    );
  });

  it('forwards mission service errors through the API error contract', async () => {
    missionService.getMissionByMid.mockRejectedValue(
      new AppError(messages.MISSION.GENERAL.MISSION_NOT_FOUND, 404),
    );

    const response = await request(app).get('/api/missions/999');

    expect(response.status).toBe(404);
    expect(response.body.errors.general).toEqual([
      messages.MISSION.GENERAL.MISSION_NOT_FOUND,
    ]);
  });
});
