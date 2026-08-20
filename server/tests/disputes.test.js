import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { messages } from '@hermyx/shared';
import { AppError } from '../src/utils/error.util.js';

const currentUser = vi.hoisted(() => ({ uid: 61, username: 'dispute_hero' }));

const disputeService = vi.hoisted(() => ({
  getMyDisputes: vi.fn(),
  getMyDisputeUnreadCount: vi.fn(),
  getDispute: vi.fn(),
}));

vi.mock('../src/services/dispute.service.js', () => disputeService);
vi.mock('../src/middlewares/auth.middleware.js', () => ({
  verifyToken: (req, _res, next) => {
    req.user = { ...currentUser };
    next();
  },
  verifyAdmin: (_req, _res, next) => next(),
}));

import app from '../src/app.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Dispute API', () => {
  it('lists the current user disputes with pagination', async () => {
    const result = {
      disputes: [{ rid: 7, type: 'report_adventurer' }],
      pagination: {
        currentPage: 2,
        totalPages: 3,
        totalItems: 12,
        hasMore: true,
      },
    };
    disputeService.getMyDisputes.mockResolvedValue(result);

    const response = await request(app)
      .get('/api/disputes')
      .query({ page: 2, limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(result);
    expect(disputeService.getMyDisputes).toHaveBeenCalledWith(currentUser.uid, {
      page: 2,
      limit: 5,
      offset: 5,
    });
  });

  it('gets the current user unread dispute count', async () => {
    disputeService.getMyDisputeUnreadCount.mockResolvedValue(4);

    const response = await request(app).get('/api/disputes/unread-count');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ unreadCount: 4 });
    expect(disputeService.getMyDisputeUnreadCount).toHaveBeenCalledWith(
      currentUser.uid,
    );
  });

  it('gets a dispute in which the current user participates', async () => {
    const dispute = { rid: 7, conversation_id: 20 };
    disputeService.getDispute.mockResolvedValue(dispute);

    const response = await request(app).get('/api/disputes/7');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ dispute });
    expect(disputeService.getDispute).toHaveBeenCalledWith(7, currentUser.uid);
  });

  it('rejects incomplete dispute pagination', async () => {
    const response = await request(app).get('/api/disputes').query({ page: 2 });

    expect(response.status).toBe(400);
    expect(disputeService.getMyDisputes).not.toHaveBeenCalled();
  });

  it.each(['not-a-number', '1.5', '-1'])(
    'rejects the invalid dispute identifier %s',
    async (rid) => {
      const response = await request(app).get(`/api/disputes/${rid}`);

      expect(response.status).toBe(400);
      expect(disputeService.getDispute).not.toHaveBeenCalled();
    },
  );

  it.each([
    [403, messages.GENERAL.UNAUTHORIZED_ERROR],
    [404, messages.REPORT.GENERAL.REPORT_NOT_FOUND],
    [409, messages.REPORT.GENERAL.APPLICANT_ALREADY_REPORTED],
  ])('maps a dispute service error with status %s', async (status, message) => {
    disputeService.getDispute.mockRejectedValue(new AppError(message, status));

    const response = await request(app).get('/api/disputes/7');

    expect(response.status).toBe(status);
    expect(response.body.errors.general).toEqual([message]);
    expect(disputeService.getDispute).toHaveBeenCalledWith(7, currentUser.uid);
  });
});
