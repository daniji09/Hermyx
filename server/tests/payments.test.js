import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { messages } from '@hermyx/shared';
import { AppError } from '../src/utils/error.util.js';

const currentUser = vi.hoisted(() => ({
  uid: 31,
  email: 'payer@example.com',
  username: 'payer',
  stripe_customer_id: 'cus_test',
  stripe_connected_id: 'acct_test',
}));

const paymentService = vi.hoisted(() => ({
  listCards: vi.fn(),
  addCard: vi.fn(),
  setDefaultCard: vi.fn(),
  payDefault: vi.fn(),
  payNew: vi.fn(),
  confirmPayment: vi.fn(),
  connectOnBoard: vi.fn(),
  getDashboardLink: vi.fn(),
  deleteCard: vi.fn(),
}));

const userService = vi.hoisted(() => ({
  getUserByUidOrThrow: vi.fn(),
  updateUserStripeCustomerIdByUid: vi.fn(),
}));

const paymentProvider = vi.hoisted(() => ({
  checkStripeCustomer: vi.fn(),
}));

vi.mock('../src/services/payment.service.js', () => paymentService);
vi.mock('../src/services/user.service.js', () => userService);
vi.mock('../src/providers/payment.provider.js', async (importOriginal) => ({
  ...(await importOriginal()),
  ...paymentProvider,
}));
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
  currentUser.stripe_customer_id = 'cus_test';
  userService.getUserByUidOrThrow.mockResolvedValue(currentUser);
});

describe('Payment API', () => {
  it('lists cards and identifies the default card', async () => {
    const cards = { data: [{ id: 'pm_1' }, { id: 'pm_2' }] };
    const customer = {
      invoice_settings: { default_payment_method: 'pm_2' },
    };
    paymentService.listCards.mockResolvedValue({ customer, cards });

    const response = await request(app).get('/api/stripe/cards');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      defaultPaymentMethodId: 'pm_2',
      cards: cards.data,
    });
    expect(paymentService.listCards).toHaveBeenCalledWith('cus_test');
  });

  it('creates a card setup intent', async () => {
    paymentService.addCard.mockResolvedValue({ client_secret: 'seti_secret' });

    const response = await request(app).post('/api/stripe/cards');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ clientSecret: 'seti_secret' });
    expect(paymentService.addCard).toHaveBeenCalledWith('cus_test');
  });

  it('sets the default payment method', async () => {
    const response = await request(app)
      .post('/api/stripe/cards/default')
      .send({ paymentMethodId: 'pm_default' });

    expect(response.status).toBe(200);
    expect(paymentService.setDefaultCard).toHaveBeenCalledWith(
      'cus_test',
      'pm_default',
    );
  });

  it('rejects an empty default payment method id', async () => {
    const response = await request(app)
      .post('/api/stripe/cards/default')
      .send({ paymentMethodId: '' });

    expect(response.status).toBe(400);
    expect(paymentService.setDefaultCard).not.toHaveBeenCalled();
  });

  it('creates a payment intent with the default card', async () => {
    paymentService.payDefault.mockResolvedValue({
      pi: { id: 'pi_default', client_secret: 'pi_default_secret' },
      defaultPm: 'pm_default',
    });

    const response = await request(app).post(
      '/api/stripe/missions/42/pay/default',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      clientSecret: 'pi_default_secret',
      paymentIntentId: 'pi_default',
      paymentMethodId: 'pm_default',
    });
    expect(paymentService.payDefault).toHaveBeenCalledWith(42, currentUser);
  });

  it('returns a conflict when paying without a default card', async () => {
    paymentService.payDefault.mockRejectedValue(
      new AppError(messages.PAYMENT.GENERAL.NO_DEFAULT_CARD, 409),
    );

    const response = await request(app).post(
      '/api/stripe/missions/42/pay/default',
    );

    expect(response.status).toBe(409);
    expect(response.body.errors.general).toEqual([
      messages.PAYMENT.GENERAL.NO_DEFAULT_CARD,
    ]);
  });

  it.each([true, false])(
    'creates a new-card payment intent with saveCard=%s',
    async (saveCard) => {
      paymentService.payNew.mockResolvedValue({
        id: 'pi_new',
        client_secret: 'pi_new_secret',
      });

      const response = await request(app)
        .post('/api/stripe/missions/42/pay/new')
        .send({ saveCard });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        clientSecret: 'pi_new_secret',
        paymentIntentId: 'pi_new',
      });
      expect(paymentService.payNew).toHaveBeenCalledWith(
        42,
        currentUser,
        saveCard,
      );
    },
  );

  it('confirms a successful mission payment', async () => {
    const response = await request(app)
      .post('/api/stripe/missions/42/confirm')
      .send({ paymentIntentId: 'pi_confirmed' });

    expect(response.status).toBe(201);
    expect(paymentService.confirmPayment).toHaveBeenCalledWith(
      42,
      'pi_confirmed',
      currentUser,
    );
  });

  it('returns a conflict when the payment intent has not succeeded', async () => {
    const paymentStatus = 'requires_payment_method';
    const message =
      messages.PAYMENT.GENERAL.PAYMENT_NOT_SUCCEEDED(paymentStatus);
    paymentService.confirmPayment.mockRejectedValue(new AppError(message, 409));

    const response = await request(app)
      .post('/api/stripe/missions/42/confirm')
      .send({ paymentIntentId: 'pi_failed' });

    expect(response.status).toBe(409);
    expect(response.body.errors.general).toEqual([message]);
  });

  it('starts Stripe Connect onboarding', async () => {
    paymentService.connectOnBoard.mockResolvedValue({
      url: 'https://connect.stripe.test/onboard',
    });

    const response = await request(app).post('/api/stripe/connect/onboard');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      url: 'https://connect.stripe.test/onboard',
    });
    expect(paymentService.connectOnBoard).toHaveBeenCalledWith(currentUser);
  });

  it('returns the Connect success response', async () => {
    const response = await request(app).get('/api/stripe/connect/success');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Onboarding completed');
  });

  it('creates a Stripe dashboard link', async () => {
    paymentService.getDashboardLink.mockResolvedValue({
      url: 'https://dashboard.stripe.test/login',
    });

    const response = await request(app).post(
      '/api/stripe/connect/dashboard-link',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      url: 'https://dashboard.stripe.test/login',
    });
    expect(paymentService.getDashboardLink).toHaveBeenCalledWith(currentUser);
  });

  it('forbids dashboard access before Connect onboarding is complete', async () => {
    paymentService.getDashboardLink.mockRejectedValue(
      new AppError(messages.GENERAL.STRIPE_ONBOARDING_NOT_COMPLETED, 403),
    );

    const response = await request(app).post(
      '/api/stripe/connect/dashboard-link',
    );

    expect(response.status).toBe(403);
    expect(response.body.errors.general).toEqual([
      messages.GENERAL.STRIPE_ONBOARDING_NOT_COMPLETED,
    ]);
  });

  it('deletes the card identified in the validated request body', async () => {
    const response = await request(app)
      .delete('/api/stripe/cards')
      .send({ paymentMethodId: 'pm_delete' });

    expect(response.status).toBe(200);
    expect(paymentService.deleteCard).toHaveBeenCalledWith(
      'cus_test',
      'pm_delete',
    );
  });

  it('creates and persists a Stripe customer when one is missing', async () => {
    currentUser.stripe_customer_id = null;
    userService.getUserByUidOrThrow.mockResolvedValue({
      ...currentUser,
      stripe_customer_id: null,
    });
    paymentProvider.checkStripeCustomer.mockResolvedValue('cus_created');
    paymentService.addCard.mockResolvedValue({ client_secret: 'seti_secret' });

    const response = await request(app).post('/api/stripe/cards');

    expect(response.status).toBe(200);
    expect(paymentProvider.checkStripeCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ uid: currentUser.uid }),
    );
    expect(userService.updateUserStripeCustomerIdByUid).toHaveBeenCalledWith(
      currentUser.uid,
      'cus_created',
    );
    expect(paymentService.addCard).toHaveBeenCalledWith('cus_created');
  });

  it('maps payment service failures with the shared error handler', async () => {
    paymentService.listCards.mockRejectedValue(
      new AppError(messages.GENERAL.STRIPE_CUSTOMER_ERROR, 404),
    );

    const response = await request(app).get('/api/stripe/cards');

    expect(response.status).toBe(404);
    expect(response.body.errors.general).toEqual([
      messages.GENERAL.STRIPE_CUSTOMER_ERROR,
    ]);
  });

  it('returns an internal error for an unexpected payment failure', async () => {
    paymentService.listCards.mockRejectedValue(
      new AppError(messages.GENERAL.UNEXPECTED_ERROR, 500),
    );

    const response = await request(app).get('/api/stripe/cards');

    expect(response.status).toBe(500);
    expect(response.body.errors.general).toEqual([
      messages.GENERAL.UNEXPECTED_ERROR,
    ]);
  });
});
