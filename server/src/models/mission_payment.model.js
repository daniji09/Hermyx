import { MISSION_PAYMENT_STATUS } from '@hermyx/shared/utils/payment.utils.js';
import pool from '../config/db.config.js';

export const createMissionPayment = async (missionPaymentData) => {
  const { mid, stripe_pi_id, amount_paid } = missionPaymentData;
  const query = `INSERT INTO mission_payment (mid, stripe_pi_id, amount_paid, amount_refunded, status, created_at)
    VALUES ($1, $2, $3, 0, $4, NOW())
    RETURNING *`;
  const result = await pool.query(query, [
    mid,
    stripe_pi_id,
    amount_paid,
    MISSION_PAYMENT_STATUS.SUCCEEDED.ID,
  ]);
  return result.rows[0];
};

export const getMissionPayments = async (mid) => {
  const query = `SELECT * FROM mission_payment WHERE mid = $1`;
  const result = await pool.query(query, [mid]);
  return result.rows;
};
