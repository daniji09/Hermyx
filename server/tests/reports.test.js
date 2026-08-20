import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { messages } from '@hermyx/shared';
import { AppError } from '../src/utils/error.util.js';

const currentUser = vi.hoisted(() => ({ uid: 71, username: 'report_hero' }));

const reportService = vi.hoisted(() => ({
  getReports: vi.fn(),
  getReport: vi.fn(),
  reportAdventurer: vi.fn(),
  reportUser: vi.fn(),
  reportMission: vi.fn(),
  acceptAdventurersWork: vi.fn(),
  rejectAdventurersWork: vi.fn(),
  dismiss: vi.fn(),
}));

vi.mock('../src/services/report.service.js', () => reportService);
vi.mock('../src/middlewares/auth.middleware.js', () => ({
  verifyToken: (req, _res, next) => {
    req.user = { ...currentUser };
    next();
  },
  verifyAdmin: (_req, _res, next) => next(),
}));

import app from '../src/app.js';

const reportPayload = {
  mid: 6,
  vacancyId: 9,
  message: 'The participation requires administrative review.',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Report API', () => {
  it('lists reports using filters and pagination', async () => {
    const reports = [{ rid: 7, status: 'pending' }];
    const pagination = { currentPage: 2, totalPages: 3 };
    reportService.getReports.mockResolvedValue({ reports, pagination });

    const response = await request(app).get('/api/reports').query({
      sortByDate: 'desc',
      status: 'pending',
      type: 'report_user',
      page: 2,
      limit: 5,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ reports, pagination });
    expect(reportService.getReports).toHaveBeenCalledWith({
      pagination: { page: 2, limit: 5, offset: 5 },
      filters: {
        sortByDate: 'desc',
        status: 'pending',
        type: 'report_user',
      },
      userId: currentUser.uid,
    });
  });

  it('gets one report', async () => {
    const report = { rid: 7, status: 'pending' };
    reportService.getReport.mockResolvedValue(report);

    const response = await request(app).get('/api/reports/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ report });
    expect(reportService.getReport).toHaveBeenCalledWith(7);
  });

  it('reports an adventurer', async () => {
    const report = { rid: 7, type: 'report_adventurer' };
    reportService.reportAdventurer.mockResolvedValue(report);

    const response = await request(app)
      .post('/api/reports/adventurer')
      .send(reportPayload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ report });
    expect(reportService.reportAdventurer).toHaveBeenCalledWith({
      message: reportPayload.message,
      missionId: reportPayload.mid,
      sender: currentUser,
      vacancyId: reportPayload.vacancyId,
    });
  });

  it('reports another user', async () => {
    const payload = { uid: 72, message: 'Repeated abusive behaviour.' };
    const report = { rid: 8, type: 'report_user' };
    reportService.reportUser.mockResolvedValue(report);

    const response = await request(app).post('/api/reports/user').send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ report });
    expect(reportService.reportUser).toHaveBeenCalledWith({
      message: payload.message,
      senderId: currentUser.uid,
      userId: payload.uid,
    });
  });

  it('reports a mission', async () => {
    const payload = { mid: 6, message: 'This mission violates the rules.' };
    const report = { rid: 9, type: 'report_mission' };
    reportService.reportMission.mockResolvedValue(report);

    const response = await request(app)
      .post('/api/reports/mission')
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ report });
    expect(reportService.reportMission).toHaveBeenCalledWith({
      message: payload.message,
      mid: payload.mid,
      senderId: currentUser.uid,
    });
  });

  it.each([
    ['accept', 'acceptAdventurersWork'],
    ['reject', 'rejectAdventurersWork'],
    ['dismiss', 'dismiss'],
  ])(
    'processes the administrative %s action',
    async (action, serviceMethod) => {
      const reason = 'The report has been reviewed.';

      const response = await request(app)
        .post(`/api/reports/7/${action}`)
        .send({ reason });

      expect(response.status).toBe(200);
      expect(reportService[serviceMethod]).toHaveBeenCalledWith({
        adminId: currentUser.uid,
        reason,
        reportId: 7,
      });
    },
  );

  it('rejects an invalid report identifier', async () => {
    const response = await request(app).get('/api/reports/not-a-number');

    expect(response.status).toBe(400);
    expect(reportService.getReport).not.toHaveBeenCalled();
  });

  it.each([
    ['mid', undefined],
    ['vacancyId', undefined],
    ['message', ''],
  ])('rejects an adventurer report with invalid %s', async (field, value) => {
    const response = await request(app)
      .post('/api/reports/adventurer')
      .send({ ...reportPayload, [field]: value });

    expect(response.status).toBe(400);
    expect(response.body.errors[field]).toBeDefined();
    expect(reportService.reportAdventurer).not.toHaveBeenCalled();
  });

  it('rejects an administrative action without a reason', async () => {
    const response = await request(app)
      .post('/api/reports/7/accept')
      .send({ reason: '' });

    expect(response.status).toBe(400);
    expect(response.body.errors.reason).toBeDefined();
    expect(reportService.acceptAdventurersWork).not.toHaveBeenCalled();
  });

  it('returns not found for a missing report', async () => {
    reportService.getReport.mockRejectedValue(
      new AppError(messages.REPORT.GENERAL.REPORT_NOT_FOUND, 404),
    );

    const response = await request(app).get('/api/reports/999');

    expect(response.status).toBe(404);
    expect(response.body.errors.general).toEqual([
      messages.REPORT.GENERAL.REPORT_NOT_FOUND,
    ]);
  });

  it.each([
    [403, messages.GENERAL.UNAUTHORIZED_ERROR],
    [409, messages.REPORT.GENERAL.APPLICANT_ALREADY_REPORTED],
  ])(
    'maps an adventurer report error with status %s',
    async (status, message) => {
      reportService.reportAdventurer.mockRejectedValue(
        new AppError(message, status),
      );

      const response = await request(app)
        .post('/api/reports/adventurer')
        .send(reportPayload);

      expect(response.status).toBe(status);
      expect(response.body.errors.general).toEqual([message]);
    },
  );
});
