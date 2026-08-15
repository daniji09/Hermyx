import {
  MISSION_PARTICIPATION_STATUS,
  MISSION_PARTICIPATION_PAYMENT_STATUS,
} from '@hermyx/shared';
import pool from '../config/db.config.js';

/// INSERTS
// Create mission participation
export const create = async (mid, vacancy, client = pool) => {
  const query = `
    INSERT INTO mission_participation (mid, monetary_reward, title, description, status, amount_paid)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  await client.query(query, [
    mid,
    vacancy.reward,
    vacancy.title || null,
    vacancy.description || null,
    MISSION_PARTICIPATION_STATUS.EMPTY.ID,
    0,
  ]);
};

/// FINDS
// Get participation by id
export const findById = async (vacancyId, client = pool) => {
  const query = `
    SELECT *
    FROM mission_participation
    WHERE id = $1
  `;
  const result = await client.query(query, [vacancyId]);
  return result.rows[0] || null;
};

// Finds mission payment by mid
export const findMissionPaymentByMid = async (mid) => {
  const query = `SELECT SUM(monetary_reward - amount_paid) 
  FROM mission_participation 
  WHERE mid = $1 AND adventurer_id IS NOT NULL AND status = $2`;
  const result = await pool.query(query, [
    mid,
    MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
  ]);
  return result.rows[0].sum;
};

// Pays a vacancy
export const payParticipant = async (id, amount_paid, client = pool) => {
  const query = `
    UPDATE mission_participation 
    SET payment_status = $1, amount_paid = amount_paid + $5 
    WHERE id = $2 AND adventurer_id IS NOT NULL AND payment_status IN ($3, $6) AND status = $4`;

  const result = await client.query(query, [
    MISSION_PARTICIPATION_PAYMENT_STATUS.PAID.ID,
    id,
    MISSION_PARTICIPATION_PAYMENT_STATUS.UNPAID.ID,
    MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
    amount_paid,
    MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_PAID.ID,
  ]);
  return result.rowCount;
};

// Start a participant
export const startParticipants = async (mid, client = pool) => {
  const query = `
    UPDATE mission_participation
    SET status = $2
    WHERE mid = $1 AND status = $3
    RETURNING *
  `;
  const result = await client.query(query, [
    mid,
    MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID,
    MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
  ]);
  return result.rows;
};

export const findByMidAndAdventurerId = async (mid, adventurerId) => {
  const query = `
    SELECT *
    FROM mission_participation
    WHERE mid = $1 AND adventurer_id = $2
  `;
  const result = await pool.query(query, [mid, adventurerId]);
  return result.rows[0] || null;
};

export const findReviewContext = async (mid, adventurerId, client = pool) => {
  const result = await client.query(
    `SELECT mp.id, mp.status AS participation_status,
       mp.owner_review_id, mp.adventurer_review_id, m.owner_id
     FROM mission_participation mp
     JOIN mission m ON m.mid = mp.mid
     WHERE mp.mid = $1 AND mp.adventurer_id = $2
     FOR UPDATE OF mp`,
    [mid, adventurerId],
  );
  return result.rows[0] || null;
};

export const updateOwnerReview = async (id, reviewId, client = pool) => {
  const result = await client.query(
    `UPDATE mission_participation SET owner_review_id = $2
     WHERE id = $1 RETURNING *`,
    [id, reviewId],
  );
  return result.rows[0] || null;
};

export const updateAdventurerReview = async (id, reviewId, client = pool) => {
  const result = await client.query(
    `UPDATE mission_participation SET adventurer_review_id = $2
     WHERE id = $1 RETURNING *`,
    [id, reviewId],
  );
  return result.rows[0] || null;
};

// Get all participants from mission
export const findAllByMid = async (mid) => {
  const query = `
    SELECT 
      mp.id AS vacancy_id,
      mp.title AS vacancy_title,
      mp.description AS vacancy_description,
      mp.monetary_reward AS reward,
      mp.status,
      owner_review.id AS owner_review_id,
      owner_review.rating AS owner_review_rating,
      owner_review.comment AS owner_review_comment,
      owner_review.created_at AS owner_review_created_at,
      adventurer_review.id AS adventurer_review_id,
      adventurer_review.rating AS adventurer_review_rating,
      adventurer_review.comment AS adventurer_review_comment,
      adventurer_review.created_at AS adventurer_review_created_at,
      u.uid AS adventurer_id,
      u.username,
      u.avatar
    FROM mission_participation mp
    LEFT JOIN app_user u ON mp.adventurer_id = u.uid
    LEFT JOIN review owner_review ON owner_review.id = mp.owner_review_id
    LEFT JOIN review adventurer_review ON adventurer_review.id = mp.adventurer_review_id
    WHERE mp.mid = $1
    ORDER BY mp.id ASC
  `;
  const result = await pool.query(query, [mid]);
  return result.rows;
};

// Gets waiting for payment participants
export const findAllWaitingForPaymentByMid = async (mid) => {
  const query =
    'SELECT * FROM mission_participation WHERE status = $1 AND payment_status IN ($2, $3) AND mid = $4';
  const result = await pool.query(query, [
    MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
    MISSION_PARTICIPATION_PAYMENT_STATUS.UNPAID.ID,
    MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_PAID.ID,
    mid,
  ]);
  return result.rows;
};

// Gets occupied participations
export const findAllOccupiedByMid = async (mid, client = pool) => {
  const query = `SELECT * FROM mission_participation WHERE mid = $1 AND adventurer_id IS NOT NULL`;
  const result = await client.query(query, [mid]);
  return result.rows;
};

export const findAllUnoccupied = async (mid) => {
  const query = `SELECT * FROM mission_participation WHERE mid = $1 AND adventurer_id IS NULL`;
  const result = await pool.query(query, [mid]);
  return result.rows;
};

// Gets joined participations
export const findAllJoined = async (mid) => {
  const query = `SELECT * FROM mission_participation WHERE mid = $1 AND adventurer_id IS NOT NULL AND status = $2`;
  const result = await pool.query(query, [
    mid,
    MISSION_PARTICIPATION_STATUS.JOINED.ID,
  ]);
  return result.rows;
};

/// UPDATES
// Update mission participation
export const update = async (mid, vacancy, client = pool) => {
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

  const result = await client.query(updateQuery, [
    vacancy.title || null,
    vacancy.description || null,
    vacancy.id,
    mid,
  ]);

  return result.rows[0];
};

// Update mission participation status
export const updateStatus = async (id, status, client = pool) => {
  const query = 'UPDATE mission_participation SET status = $1 WHERE id = $2';
  const result = await client.query(query, [status, id]);
  return result.rowCount;
};

// Update status by mid and adventurer
export const updateStatusByMidAndAdventurer = async (
  mid,
  adventurerId,
  status,
  client = pool,
) => {
  const query = `
    UPDATE mission_participation
    SET status = $3
    WHERE mid = $1 AND adventurer_id = $2
    RETURNING *
  `;
  const result = await client.query(query, [mid, adventurerId, status]);
  return result.rows[0] || null;
};

// Update payment status by id
export const updatePaymentStatusById = async (id, status, client = pool) => {
  const query = `UPDATE mission_participation SET payment_status = $2 WHERE id = $1`;
  const result = await client.query(query, [id, status]);
  return result.rowCount;
};

// Unjoin vacancy
export const updateAdventurerAndStatus = async (
  id,
  adventurerId,
  status,
  client = pool,
) => {
  const query = `
    UPDATE mission_participation
    SET adventurer_id = $2, status = $3
    WHERE id = $1
    RETURNING *
  `;

  const result = await client.query(query, [id, adventurerId, status]);
  return result.rows[0] || null;
};

/// DELETES
export const deleteAllUnoccupied = async (mid, existingIds, client = pool) => {
  let query, result;
  if (existingIds.length > 0) {
    // Vacancies that are deleted have to be unoccupied
    query = `
      DELETE FROM mission_participation 
      WHERE mid = $1 AND id != ALL($2::int[]) AND adventurer_id IS NULL
    `;
    result = await client.query(query, [mid, existingIds]);
  } else {
    // If there is no vacancies that stayed the same, all of them are deleted
    query = `
      DELETE FROM mission_participation 
      WHERE mid = $1 AND adventurer_id IS NULL
    `;
    result = await client.query(query, [mid]);
  }
  return result.rowCount;
};

//-----
export const updateTransferInfo = async (mid, uid, transferId, amount) => {
  const query = `
    UPDATE mission_participation 
    SET transfer_id = $1, amount_paid = $2 
    WHERE mid = $3 AND adventurer_id = $4
  `;
  await pool.query(query, [transferId, amount, mid, uid]);
};

export const deleteParticipant = async (mid, adventurerId) => {
  const query = `
    DROP * FROM mission_participation WHERE mid = $1 AND adventurer_id = $2`;
  const result = await pool.query(query, [mid, adventurerId]);
  return result.rows[0];
};

export const releaseParticipation = async (mid, adventurerId, client = pool) =>
  updateStatusByMidAndAdventurer(
    mid,
    adventurerId,
    MISSION_PARTICIPATION_STATUS.RELEASED.ID,
    client,
  );

export const disputeParticipation = async (
  mid,
  adventurerId,
  client = pool,
) => {
  const query = `
    UPDATE mission_participation
    SET status = $3
    WHERE mid = $1 AND adventurer_id = $2
    RETURNING *
  `;
  const result = await client.query(query, [
    mid,
    adventurerId,
    MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID,
  ]);
  return result.rows[0] || null;
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
      MISSION_PARTICIPATION_STATUS.EMPTY.ID,
    ]);
  });
  const result = await Promise.all([...insertPromises]);
  return result;
};

export const updateVacancyMonetaryReward = async (
  id,
  monetaryReward,
  client = pool,
) => {
  const query = `UPDATE mission_participation SET monetary_reward = $2 WHERE id = $1 RETURNING *`;
  const result = await client.query(query, [id, monetaryReward]);
  return result.rows[0];
};

export const payVacancies = async (mid, amount_paid) => {
  const query = `UPDATE mission_participation SET payment_status = $1, amount_paid = $5 WHERE mid = $2 AND adventurer_id IS NOT NULL AND payment_status = $3 AND status = $4`;
  const result = await pool.query(query, [
    MISSION_PARTICIPATION_PAYMENT_STATUS.PAID.ID,
    mid,
    MISSION_PARTICIPATION_PAYMENT_STATUS.UNPAID.ID,
    MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
    amount_paid,
  ]);
  return result.rowCount;
};

export const refundVacancy = async (id, amountRefunded, client = pool) => {
  const query = `
    UPDATE mission_participation 
    SET payment_status = $1, amount_paid = amount_paid - $2 
    WHERE id = $3 AND adventurer_id IS NOT NULL AND payment_status = $4`;

  const result = await client.query(query, [
    MISSION_PARTICIPATION_PAYMENT_STATUS.PAID.ID,
    amountRefunded,
    id,
    MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
  ]);
  return result.rowCount;
};

//Updates just the payment status
export const updatePaymentStatus = async (id, status, client = pool) => {
  const query =
    'UPDATE mission_participation SET payment_status = $1 WHERE id = $2';
  const result = await client.query(query, [status, id]);
  return result.rowCount;
};

// Unjoin every participant
export const cleanMissionParticipation = async (mid) => {
  const query = `UPDATE mission_participation SET adventurer_id = NULL, status = $1 WHERE mid = $2 AND status = $3`;
  const result = await pool.query(query, [
    MISSION_PARTICIPATION_STATUS.EMPTY.ID,
    mid,
    MISSION_PARTICIPATION_STATUS.JOINED.ID,
  ]);
  return result.rowCount;
};

// Unjoin specific participant
export const unjoinParticipant = async (mid, uid) => {
  const query = `UPDATE mission_participation SET adventurer_id = NULL, status = $1 WHERE mid = $2 AND status NOT IN ($3, $4, $5) AND adventurer_id = $6`;
  const result = await pool.query(query, [
    MISSION_PARTICIPATION_STATUS.EMPTY.ID,
    mid,
    MISSION_PARTICIPATION_STATUS.EMPTY.ID,
    MISSION_PARTICIPATION_STATUS.ACCEPTED.ID,
    MISSION_PARTICIPATION_STATUS.RELEASED.ID,
    uid,
  ]);
  return result.rowCount;
};

export const refundBannedVacancy = async (id, amount_refunded) => {
  const query = `
    UPDATE mission_participation 
    SET payment_status = $1, amount_paid = amount_paid - $2 
    WHERE id = $3 AND payment_status = $4`;

  const result = await pool.query(query, [
    MISSION_PARTICIPATION_PAYMENT_STATUS.UNPAID.ID,
    amount_refunded,
    id,
    MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
  ]);
  return result.rowCount;
};
