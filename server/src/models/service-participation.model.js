import {
  MISSION_PARTICIPATION_STATUS,
  MISSION_PARTICIPATION_PAYMENT_STATUS,
  NOTIFICATION_ACTION,
  NOTIFICATION_STATUS,
} from '@hermyx/shared';
import pool from '../config/db.config.js';

/// INSERTS
// Create service participation
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

// Get participation by id for update
export const findByIdForUpdate = async (vacancyId, client = pool) => {
  const query = `
    SELECT *
    FROM mission_participation
    WHERE id = $1
    FOR UPDATE
  `;
  const result = await client.query(query, [vacancyId]);
  return result.rows[0] || null;
};

// Finds by mid and collaborator id
export const findByMidAndAdventurerId = async (mid, adventurerId) => {
  const query = `
    SELECT *
    FROM mission_participation
    WHERE mid = $1 AND adventurer_id = $2
  `;
  const result = await pool.query(query, [mid, adventurerId]);
  return result.rows[0] || null;
};

// Get all participants from service
export const findAllByMid = async (mid, viewerId = null) => {
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
      u.avatar,
      pending_offer.pending_reward_offer,
      pending_review.review_deadline
    FROM mission_participation mp
    LEFT JOIN app_user u ON mp.adventurer_id = u.uid
    LEFT JOIN review owner_review ON owner_review.id = mp.owner_review_id
    LEFT JOIN review adventurer_review ON adventurer_review.id = mp.adventurer_review_id
    LEFT JOIN LATERAL (
      SELECT (n.payload->>'new_offer')::numeric AS pending_reward_offer
      FROM notification n
      WHERE n.action = $2
        AND n.status = $3
        AND n.sender_id = $4
        AND n.recipient_id = mp.adventurer_id
        AND n.payload->>'associated_vacancy_id' = mp.id::text
      ORDER BY n.date DESC, n.nid DESC
      LIMIT 1
    ) pending_offer ON TRUE
    LEFT JOIN LATERAL (
      SELECT n.date + INTERVAL '168 hours' AS review_deadline
      FROM notification n
      WHERE n.action = $5
        AND n.status = $3
        AND n.sender_id = mp.adventurer_id
        AND n.payload->>'associated_mission_id' = mp.mid::text
        AND $4 = mp.adventurer_id
      ORDER BY n.date DESC, n.nid DESC
      LIMIT 1
    ) pending_review ON TRUE
    WHERE mp.mid = $1
    ORDER BY mp.id ASC
  `;
  const result = await pool.query(query, [
    mid,
    NOTIFICATION_ACTION.MISSION_EDIT.ID,
    NOTIFICATION_STATUS.PENDING.ID,
    viewerId,
    NOTIFICATION_ACTION.PARTICIPATION_REVIEW.ID,
  ]);
  return result.rows;
};

// Finds service payment by mid
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

// Gets waiting for payment participants
export const findAllWaitingForPaymentByMid = async (mid, client = pool) => {
  const query =
    'SELECT * FROM mission_participation WHERE status = $1 AND payment_status IN ($2, $3) AND mid = $4';
  const result = await client.query(query, [
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

// Gets unoccupied participations
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

// Gets service participation when reviewing
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

/// UPDATES
// Update service participation
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

// Update service participation status
export const updateStatus = async (id, status, client = pool) => {
  // Finds allowed previous status of status passed. This ensures concurrency, so the service state machines actually works
  const allowedPreviousStates = Object.values(MISSION_PARTICIPATION_STATUS)
    .filter((config) => config.VALID_NEXT_STATES.includes(status))
    .map((config) => config.ID);

  const query =
    'UPDATE mission_participation SET status = $1 WHERE id = $2 AND status = ANY($3::text[])';
  const result = await client.query(query, [status, id, allowedPreviousStates]);
  return result.rowCount;
};

// Update status by mid and collaborator
export const updateStatusByMidAndAdventurer = async (
  mid,
  adventurerId,
  status,
  client = pool,
) => {
  // Finds allowed previous status of status passed. This ensures concurrency, so the service state machines actually works
  const allowedPreviousStates = Object.values(MISSION_PARTICIPATION_STATUS)
    .filter((config) => config.VALID_NEXT_STATES.includes(status))
    .map((config) => config.ID);
  console.log(
    'Next status:',
    status,
    'Allowed previous:',
    allowedPreviousStates,
  );
  const query = `
    UPDATE mission_participation
    SET status = $3
    WHERE mid = $1 AND adventurer_id = $2 AND status = ANY($4::text[])
    RETURNING *
  `;
  const result = await client.query(query, [
    mid,
    adventurerId,
    status,
    allowedPreviousStates,
  ]);
  return result.rows[0] || null;
};

// Restores a submitted participation when its acceptance failed before payment
export const restoreSubmittedAfterFailedAcceptance = async (
  mid,
  adventurerId,
  client = pool,
) => {
  const query = `
    UPDATE mission_participation
    SET status = $3
    WHERE mid = $1 AND adventurer_id = $2 AND status = $4
    RETURNING *
  `;
  const result = await client.query(query, [
    mid,
    adventurerId,
    MISSION_PARTICIPATION_STATUS.SUBMITTED.ID,
    MISSION_PARTICIPATION_STATUS.ACCEPTED.ID,
  ]);
  return result.rows[0] || null;
};

// Update payment status by id
export const updatePaymentStatusById = async (id, status, client = pool) => {
  const query = `UPDATE mission_participation SET payment_status = $2 WHERE id = $1`;
  const result = await client.query(query, [id, status]);
  return result.rowCount;
};

// Update collaborator and status
export const updateAdventurerAndStatus = async (
  id,
  adventurerId,
  status,
  client = pool,
) => {
  // Finds allowed previous status of status passed. This ensures concurrency, so the service state machines actually works
  const allowedPreviousStates = Object.values(MISSION_PARTICIPATION_STATUS)
    .filter((config) => config.VALID_NEXT_STATES.includes(status))
    .map((config) => config.ID);
  const query = `
    UPDATE mission_participation
    SET adventurer_id = $2, status = $3
    WHERE id = $1 AND status = ANY($4::text[]) 
    RETURNING *
  `;

  const result = await client.query(query, [
    id,
    adventurerId,
    status,
    allowedPreviousStates,
  ]);
  return result.rows[0] || null;
};

// Updates monetary reward
export const updateMonetaryReward = async (
  id,
  monetaryReward,
  client = pool,
) => {
  const query = `UPDATE mission_participation SET monetary_reward = $2 WHERE id = $1 RETURNING *`;
  const result = await client.query(query, [id, monetaryReward]);
  return result.rows[0];
};

// Updates payment status
export const updatePaymentStatus = async (id, status, client = pool) => {
  const query =
    'UPDATE mission_participation SET payment_status = $1 WHERE id = $2';
  const result = await client.query(query, [status, id]);
  return result.rowCount;
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

// Updates applicant review
export const updateOwnerReview = async (id, reviewId, client = pool) => {
  const result = await client.query(
    `UPDATE mission_participation SET owner_review_id = $2
     WHERE id = $1 RETURNING *`,
    [id, reviewId],
  );
  return result.rows[0] || null;
};

// Updates collaborator review
export const updateAdventurerReview = async (id, reviewId, client = pool) => {
  const result = await client.query(
    `UPDATE mission_participation SET adventurer_review_id = $2
     WHERE id = $1 RETURNING *`,
    [id, reviewId],
  );
  return result.rows[0] || null;
};

// Refunds partial payment of service participation
export const refundVacancyPartially = async (
  id,
  amountRefunded,
  client = pool,
) => {
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

// Refunds banned vacancy
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
export const unjoinParticipant = async (mid, uid, client = pool) => {
  const query = `UPDATE mission_participation SET adventurer_id = NULL, status = $1 WHERE mid = $2 AND status NOT IN ($3, $4, $5) AND adventurer_id = $6`;
  const result = await client.query(query, [
    MISSION_PARTICIPATION_STATUS.EMPTY.ID,
    mid,
    MISSION_PARTICIPATION_STATUS.EMPTY.ID,
    MISSION_PARTICIPATION_STATUS.ACCEPTED.ID,
    MISSION_PARTICIPATION_STATUS.RELEASED.ID,
    uid,
  ]);
  return result.rowCount;
};

/// DELETES
// Deletes vacancies removed from the service edit form
export const deleteAllUnoccupied = async (
  mid,
  existingIds,
  canDeleteAdventurers,
  client = pool,
) => {
  let query = 'DELETE FROM mission_participation WHERE mid = $1';
  const values = [mid];

  if (existingIds.length > 0) {
    query += ' AND id != ALL($2::int[])';
    values.push(existingIds);
  }

  const canDeleteAdventurersParameter = values.length + 1;
  query += ` AND ($${canDeleteAdventurersParameter} = TRUE OR adventurer_id IS NULL)`;
  values.push(canDeleteAdventurers);

  const result = await client.query(query, values);
  return result.rowCount;
};
