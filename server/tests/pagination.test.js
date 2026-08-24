import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const currentUser = vi.hoisted(() => ({ uid: 71, username: 'page_hero' }));

const reviewService = vi.hoisted(() => ({
  getUserReviews: vi.fn(),
  reviewAdventurer: vi.fn(),
  reviewOwner: vi.fn(),
}));

const disputeService = vi.hoisted(() => ({
  getMyDisputes: vi.fn(),
  getMyDisputeUnreadCount: vi.fn(),
  getDispute: vi.fn(),
}));

vi.mock('../src/services/review.service.js', () => reviewService);
vi.mock('../src/services/dispute.service.js', () => disputeService);
vi.mock('../src/middlewares/auth.middleware.js', () => ({
  verifyToken: (req, _res, next) => {
    req.user = { ...currentUser };
    next();
  },
  verifyAdmin: (_req, _res, next) => next(),
  verifyRegularUser: (_req, _res, next) => next(),
}));

import app from '../src/app.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Paginated API endpoints', () => {
  it('passes validated pagination to user reviews', async () => {
    const result = {
      reviews: [{ id: 1 }],
      averageRating: 5,
      totalReviews: 1,
      reviewsVisible: true,
      pagination: {
        currentPage: 2,
        totalPages: 2,
        totalItems: 6,
        hasMore: false,
      },
    };
    reviewService.getUserReviews.mockResolvedValue(result);

    const response = await request(app)
      .get('/api/reviews/users/8')
      .query({ page: 2, limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(result);
    expect(reviewService.getUserReviews).toHaveBeenCalledWith(8, {
      page: 2,
      limit: 5,
      offset: 5,
    });
  });

  it('rejects user review pagination without a limit', async () => {
    const response = await request(app)
      .get('/api/reviews/users/8')
      .query({ page: 1 });

    expect(response.status).toBe(400);
    expect(response.body.errors.limit).toBeDefined();
    expect(reviewService.getUserReviews).not.toHaveBeenCalled();
  });

  it.each([
    ['page', 0],
    ['limit', 0],
  ])('rejects a non-positive review %s', async (field, value) => {
    const response = await request(app)
      .get('/api/reviews/users/8')
      .query({ page: 1, limit: 5, [field]: value });

    expect(response.status).toBe(400);
    expect(response.body.errors[field]).toBeDefined();
    expect(reviewService.getUserReviews).not.toHaveBeenCalled();
  });

  it('passes validated pagination to current user disputes', async () => {
    const result = {
      disputes: [{ rid: 4 }],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        hasMore: false,
      },
    };
    disputeService.getMyDisputes.mockResolvedValue(result);

    const response = await request(app)
      .get('/api/disputes')
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(result);
    expect(disputeService.getMyDisputes).toHaveBeenCalledWith(currentUser.uid, {
      page: 1,
      limit: 10,
      offset: 0,
    });
  });

  it('rejects incomplete dispute pagination', async () => {
    const response = await request(app)
      .get('/api/disputes')
      .query({ limit: 10 });

    expect(response.status).toBe(400);
    expect(response.body.errors.page).toBeDefined();
    expect(disputeService.getMyDisputes).not.toHaveBeenCalled();
  });
});
