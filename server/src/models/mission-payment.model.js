import { MISSION_PAYMENT_STATUS, TRANSACTION_TYPE } from '@hermyx/shared';
import pool from '../config/db.config.js';

/// INSERTS
// Create new mission payment
export const create = async (missionPaymentData, client = pool) => {
  const {
    mid,
    vacancy_id,
    sender_id,
    receiver_id,
    stripe_transaction_id,
    transaction_type,
    amount_paid,
  } = missionPaymentData;
  const query = `INSERT INTO mission_payment (mid, vacancy_id, sender_id, receiver_id, stripe_transaction_id, transaction_type, amount_paid, amount_refunded, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, NOW())
    RETURNING *`;
  const result = await client.query(query, [
    mid,
    vacancy_id,
    sender_id,
    receiver_id,
    stripe_transaction_id,
    transaction_type,
    amount_paid,
    MISSION_PAYMENT_STATUS.SUCCEEDED.ID,
  ]);
  return result.rows[0];
};

// ------

export const findByMissionId = async (mid, client = pool) => {
  const query = `SELECT * FROM mission_payment WHERE mid = $1`;
  const result = await client.query(query, [mid]);
  return result.rows;
};

export const findByStripeTransactionId = async (
  stripeTransactionId,
  client = pool,
) => {
  const query = `SELECT * FROM mission_payment WHERE stripe_transaction_id = $1`;
  const result = await client.query(query, [stripeTransactionId]);
  return result.rows;
};

export const findByVacancyId = async (vacancyId, client = pool) => {
  const query = `SELECT * 
  FROM mission_payment 
  WHERE vacancy_id = $1 AND status != $2 AND transaction_type IN ($3, $4, $5) ORDER BY created_at DESC`;
  const result = await client.query(query, [
    vacancyId,
    MISSION_PAYMENT_STATUS.REFUNDED.ID,
    TRANSACTION_TYPE.INITIAL_FUNDING.ID,
    TRANSACTION_TYPE.NEGOTIATION_EXTRA.ID,
    TRANSACTION_TYPE.NEW_ADVENTURER_FUNDING.ID,
  ]);
  return result.rows;
};

export const refund = async (amount, paymentId, client = pool) => {
  const query = `
        UPDATE MISSION_PAYMENT 
        SET amount_refunded = amount_refunded + $1,
            status = CASE 
                       WHEN (amount_refunded + $1) >= amount_paid THEN 'REFUNDED' 
                       ELSE 'PARTIALLY_REFUNDED' 
                     END
        WHERE pid = $2`;
  const result = await client.query(query, [amount, paymentId]);
  return result.rowCount;
};
