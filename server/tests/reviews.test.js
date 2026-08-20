import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { consts, messages } from '@hermyx/shared';
import { AppError } from '../src/utils/error.util.js';

const currentUser = vi.hoisted(() => ({ uid: 81, username: 'review_owner' }));

const reviewService = vi.hoisted(() => ({
  getUserReviews: vi.fn(),
  reviewAdventurer: vi.fn(),
  reviewOwner: vi.fn(),
}));

vi.mock('../src/services/review.service.js', () => reviewService);
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

describe('Review API', () => {
  it('gets a paginated page of user reviews', async () => {
    const result = {
      averageRating: 4.5,
      totalReviews: 6,
      reviews: [{ id: 1, rating: 5 }],
      reviewsVisible: true,
      pagination: { currentPage: 2, totalPages: 2 },
    };
    reviewService.getUserReviews.mockResolvedValue(result);

    const response = await request(app)
      .get('/api/reviews/users/82')
      .query({ page: 2, limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(result);
    expect(reviewService.getUserReviews).toHaveBeenCalledWith(82, {
      page: 2,
      limit: 5,
      offset: 5,
    });
  });

  it('reviews an adventurer', async () => {
    const review = { id: 1, rating: 4, comment: 'Good work.' };
    reviewService.reviewAdventurer.mockResolvedValue(review);

    const response = await request(app)
      .post('/api/reviews/missions/6/adventurers/82')
      .send({ rating: review.rating, comment: review.comment });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ review });
    expect(reviewService.reviewAdventurer).toHaveBeenCalledWith({
      mid: 6,
      adventurerId: 82,
      ownerId: currentUser.uid,
      rating: review.rating,
      comment: review.comment,
    });
  });

  it('reviews a mission owner', async () => {
    const review = { id: 2, rating: 5, comment: 'Clear instructions.' };
    reviewService.reviewOwner.mockResolvedValue(review);

    const response = await request(app)
      .post('/api/reviews/missions/6/owner')
      .send({ rating: review.rating, comment: review.comment });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ review });
    expect(reviewService.reviewOwner).toHaveBeenCalledWith({
      mid: 6,
      adventurerId: currentUser.uid,
      rating: review.rating,
      comment: review.comment,
    });
  });

  it('rejects incomplete review pagination', async () => {
    const response = await request(app)
      .get('/api/reviews/users/82')
      .query({ page: 2 });

    expect(response.status).toBe(400);
    expect(reviewService.getUserReviews).not.toHaveBeenCalled();
  });

  it.each(['not-a-number', '1.5', '-1'])(
    'rejects the invalid reviewed user identifier %s',
    async (uid) => {
      const response = await request(app).get(`/api/reviews/users/${uid}`);

      expect(response.status).toBe(400);
      expect(reviewService.getUserReviews).not.toHaveBeenCalled();
    },
  );

  it.each([consts.REVIEW.RATING_MIN - 1, consts.REVIEW.RATING_MAX + 1])(
    'rejects the out-of-range rating %s',
    async (rating) => {
      const response = await request(app)
        .post('/api/reviews/missions/6/adventurers/82')
        .send({ rating, comment: 'Invalid rating.' });

      expect(response.status).toBe(400);
      expect(response.body.errors.rating).toBeDefined();
      expect(reviewService.reviewAdventurer).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['/api/reviews/missions/invalid/adventurers/82', 'mid'],
    ['/api/reviews/missions/6/adventurers/invalid', 'adventurerId'],
  ])('rejects invalid review parameter %s', async (url, field) => {
    const response = await request(app)
      .post(url)
      .send({ rating: 4, comment: 'Good work.' });

    expect(response.status).toBe(400);
    expect(response.body.errors[field]).toBeDefined();
    expect(reviewService.reviewAdventurer).not.toHaveBeenCalled();
  });

  it.each([
    [403, messages.REVIEW.GENERAL.MISSION_REVIEW_NOT_ALLOWED],
    [404, messages.MISSION.VACANCY.NOT_FOUND],
    [409, messages.REVIEW.GENERAL.MISSION_COMPLETED],
  ])('maps a review service error with status %s', async (status, message) => {
    reviewService.reviewAdventurer.mockRejectedValue(
      new AppError(message, status),
    );

    const response = await request(app)
      .post('/api/reviews/missions/6/adventurers/82')
      .send({ rating: 4, comment: 'Good work.' });

    expect(response.status).toBe(status);
    expect(response.body.errors.general).toEqual([message]);
    expect(reviewService.reviewAdventurer).toHaveBeenCalledWith({
      mid: 6,
      adventurerId: 82,
      ownerId: currentUser.uid,
      rating: 4,
      comment: 'Good work.',
    });
  });
});
