import { VACANCY_LIFE_CYCLE } from '@hermyx/shared/utils/missions.utils.js';
import pool from '../config/db.config.js';
import { VACANCY_PAYMENT_STATUS } from '@hermyx/shared/utils/payment.utils.js';

export const updateTransferInfo = async (mid, uid, transferId, amount) => {
  const query = `
    UPDATE mission_participation 
    SET transfer_id = $1, amount_paid = $2 
    WHERE mid = $3 AND adventurer_id = $4
  `;
  await pool.query(query, [transferId, amount, mid, uid]);
};

export const startParticipants = async (mid) => {
  const query = `
    UPDATE mission_participation
    SET status = $2
    WHERE mid = $1 AND status = $3
    RETURNING *
  `;
  const result = await pool.query(query, [
    mid,
    VACANCY_LIFE_CYCLE.IN_PROGRESS.ID,
    VACANCY_LIFE_CYCLE.PENDING_PAYMENT.ID,
  ]);
  return result.rows;
};

export const deleteParticipant = async (mid, adventurerId) => {
  const query = `
    DROP * FROM mission_participation WHERE mid = $1 AND adventurer_id = $2`;
  const result = await pool.query(query, [mid, adventurerId]);
  return result.rows[0];
};

export const getById = async (mid, adventurerId) => {
  const query = `
    SELECT *
    FROM mission_participation
    WHERE mid = $1 AND adventurer_id = $2
  `;
  const result = await pool.query(query, [mid, adventurerId]);
  return result.rows[0] || null;
};

export const submitParticipation = async (mid, adventurerId) => {
  const query = `
    UPDATE mission_participation
    SET status = $3
    WHERE mid = $1 AND adventurer_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [
    mid,
    adventurerId,
    VACANCY_LIFE_CYCLE.SUBMITTED.ID,
  ]);
  return result.rows[0] || null;
};

export const approveParticipation = async (mid, adventurerId) => {
  const query = `
    UPDATE mission_participation
    SET status = $3
    WHERE mid = $1 AND adventurer_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [
    mid,
    adventurerId,
    VACANCY_LIFE_CYCLE.ACCEPTED.ID,
  ]);
  return result.rows[0] || null;
};

export const releaseParticipation = async (mid, adventurerId) => {
  const query = `
    UPDATE mission_participation
    SET status = $3
    WHERE mid = $1 AND adventurer_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [
    mid,
    adventurerId,
    VACANCY_LIFE_CYCLE.RELEASED.ID,
  ]);
  return result.rows[0] || null;
};

export const requestParticipationRevision = async (mid, adventurerId) => {
  const query = `
    UPDATE mission_participation
    SET status = $3
    WHERE mid = $1 AND adventurer_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [
    mid,
    adventurerId,
    VACANCY_LIFE_CYCLE.REJECTED.ID,
  ]);
  return result.rows[0] || null;
};

export const reopenParticipation = async (mid, adventurerId) => {
  const query = `
    UPDATE mission_participation
    SET status = $3
    WHERE mid = $1 AND adventurer_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [
    mid,
    adventurerId,
    VACANCY_LIFE_CYCLE.IN_PROGRESS.ID,
  ]);
  return result.rows[0] || null;
};

export const disputeParticipation = async (mid, adventurerId) => {
  const query = `
    UPDATE mission_participation
    SET status = $3
    WHERE mid = $1 AND adventurer_id = $2
    RETURNING *
  `;
  const result = await pool.query(query, [
    mid,
    adventurerId,
    VACANCY_LIFE_CYCLE.IN_DISPUTE.ID,
  ]);
  return result.rows[0] || null;
};

export const getVacancyById = async (mid, vacancyId) => {
  const query = `
    SELECT *
    FROM mission_participation
    WHERE mid = $1 AND id = $2
  `;
  const result = await pool.query(query, [mid, vacancyId]);
  return result.rows[0] || null;
};

export const joinVacancy = async (mid, vacancyId, uid) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `
        UPDATE mission_participation
        SET adventurer_id = $1, status = $4
        WHERE mid = $2 AND id = $3 AND adventurer_id IS NULL
        RETURNING *
      `,
      [uid, mid, vacancyId, VACANCY_LIFE_CYCLE.JOINED.ID],
    );
    const joinedVacancy = result.rows[0];

    if (!joinedVacancy) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query(
      `
        UPDATE mission
        SET occupied_vacancies = occupied_vacancies + 1
        WHERE mid = $1
      `,
      [mid],
    );
    await client.query('COMMIT');
    return joinedVacancy;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const unjoinVacancy = async (mid, vacancyId) => {
  const query = `UPDATE mission_participation SET adventurer_id = NULL, status = $3 WHERE mid = $1 AND id = $2`;
  const result = await pool.query(query, [
    mid,
    vacancyId,
    VACANCY_LIFE_CYCLE.EMPTY.ID,
  ]);
  return result.rowCount;
};

export const deleteUnoccupiedVacancies = async (mid, existingIds) => {
  let query, result;
  if (existingIds.length > 0) {
    // Vacancies that are deleted have to be unoccupied
    query = `
      DELETE FROM mission_participation 
      WHERE mid = $1 AND id != ALL($2::int[]) AND adventurer_id IS NULL
    `;
    result = await pool.query(query, [mid, existingIds]);
  } else {
    // If there is no vacancies that stayed the same, all of them are deleted
    query = `
      DELETE FROM mission_participation 
      WHERE mid = $1 AND adventurer_id IS NULL
    `;
    result = await pool.query(query, [mid]);
  }
  return result.rowCount;
};

export const updateVacancy = async (mid, vacancy) => {
  // Only makes update if its actually different
  const updateQuery = `
    UPDATE mission_participation 
    SET title = $1, description = $2
    WHERE id = $3 AND mid = $4
      AND (
        title IS DISTINCT FROM $1 OR 
        description IS DISTINCT FROM $2
      )
    RETURNING id, adventurer_id, title, description, monetary_reward;
  `;

  const result = await pool.query(updateQuery, [
    vacancy.title || null,
    vacancy.description || null,
    vacancy.id,
    mid,
  ]);

  return result.rows[0];
};

export const insertVacancies = async (mid, vacancies) => {
  const insertPromises = vacancies.map((vacancy) => {
    const insertQuery = `
      INSERT INTO mission_participation (mid, monetary_reward, title, description, status, amount_paid)
      VALUES ($1, $2, $3, $4, $5, 0)
    `;
    return pool.query(insertQuery, [
      mid,
      vacancy.reward,
      vacancy.title || null,
      vacancy.description || null,
      VACANCY_LIFE_CYCLE.EMPTY.ID,
    ]);
  });
  const result = await Promise.all([...insertPromises]);
  return result;
};

export const getJoinedVacancies = async (mid) => {
  const query = `SELECT * FROM mission_participation WHERE mid = $1 AND adventurer_id IS NOT NULL AND status = $2`;
  const result = await pool.query(query, [mid, VACANCY_LIFE_CYCLE.JOINED.ID]);
  return result.rows;
};

export const getOccupiedVacancies = async (mid) => {
  const query = `SELECT * FROM mission_participation WHERE mid = $1 AND adventurer_id IS NOT NULL`;
  const result = await pool.query(query, [mid]);
  return result.rows;
};

export const getEmptyVacancies = async (mid) => {
  const query = `SELECT * FROM mission_participation WHERE mid = $1 AND adventurer_id IS NULL`;
  const result = await pool.query(query, [mid]);
  return result.rows;
};

export const updateVacancyMonetaryReward = async (id, monetary_reward) => {
  const query = `UPDATE mission_participation SET monetary_reward = $2 WHERE id = $1 RETURNING *`;
  const result = await pool.query(query, [id, monetary_reward]);
  return result.rows[0];
};

export const getMissionPayment = async (mid) => {
  const query = `SELECT SUM(monetary_reward - amount_paid) FROM mission_participation WHERE mid = $1 AND adventurer_id IS NOT NULL AND status = $2`;
  const result = await pool.query(query, [
    mid,
    VACANCY_LIFE_CYCLE.PENDING_PAYMENT.ID,
  ]);
  return result.rows[0].sum;
};

export const payVacancies = async (mid, amount_paid) => {
  const query = `UPDATE mission_participation SET payment_status = $1, amount_paid = $5 WHERE mid = $2 AND adventurer_id IS NOT NULL AND payment_status = $3 AND status = $4`;
  const result = await pool.query(query, [
    VACANCY_PAYMENT_STATUS.PAID.ID,
    mid,
    VACANCY_PAYMENT_STATUS.UNPAID.ID,
    VACANCY_LIFE_CYCLE.PENDING_PAYMENT.ID,
    amount_paid,
  ]);
  return result.rowCount;
};

export const payVacancy = async (id, amount_paid) => {
  const query = `
    UPDATE mission_participation 
    SET payment_status = $1, amount_paid = amount_paid + $5 
    WHERE id = $2 AND adventurer_id IS NOT NULL AND payment_status IN ($3, $6) AND status = $4`;

  const result = await pool.query(query, [
    VACANCY_PAYMENT_STATUS.PAID.ID,
    id,
    VACANCY_PAYMENT_STATUS.UNPAID.ID,
    VACANCY_LIFE_CYCLE.PENDING_PAYMENT.ID,
    amount_paid,
    VACANCY_PAYMENT_STATUS.PARTIALLY_PAID.ID,
  ]);
  return result.rowCount;
};

export const refundVacancy = async (id, amount_refunded) => {
  const query = `
    UPDATE mission_participation 
    SET payment_status = $1, amount_paid = amount_paid - $2 
    WHERE id = $3 AND adventurer_id IS NOT NULL AND payment_status = $4`;

  const result = await pool.query(query, [
    VACANCY_PAYMENT_STATUS.PAID.ID,
    amount_refunded,
    id,
    VACANCY_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
  ]);
  return result.rowCount;
};

export const markVacancyAsPaidOut = async (id) => {
  const query = `UPDATE mission_participation SET payment_status = $2 WHERE id = $1`;
  const result = await pool.query(query, [
    id,
    VACANCY_PAYMENT_STATUS.LIQUIDATED.ID,
  ]);
  return result.rowCount;
};

//Updates just the status
export const updateStatus = async (id, status) => {
  const query = 'UPDATE mission_participation SET status = $1 WHERE id = $2';
  const result = await pool.query(query, [status, id]);
  return result.rowCount;
};

//Updates just the payment status
export const updatePaymentStatus = async (id, status) => {
  const query =
    'UPDATE mission_participation SET payment_status = $1 WHERE id = $2';
  const result = await pool.query(query, [status, id]);
  return result.rowCount;
};

// Gets waiting for payment vacancies
export const getWaitingForPaymentVacancies = async () => {
  const query =
    'SELECT * FROM mission_participation WHERE status = $1 AND payment_status IN ($2, $3)';
  const result = await pool.query(query, [
    VACANCY_LIFE_CYCLE.PENDING_PAYMENT.ID,
    VACANCY_PAYMENT_STATUS.UNPAID.ID,
    VACANCY_PAYMENT_STATUS.PARTIALLY_PAID.ID,
  ]);
  return result.rows;
};
