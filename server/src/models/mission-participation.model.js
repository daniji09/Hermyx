import {
  MISSION_PARTICIPATION_STATUS,
  MISSION_PARTICIPATION_PAYMENT_STATUS,
} from '@hermyx/shared';
import pool from '../config/db.config.js';
import {
  addMissionConversationParticipant,
  leaveMissionConversation,
  makeMissionConversationParticipantReadOnly,
} from './conversation-participant.model.js';

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

export const findByMidAndAdventurerId = async (mid, adventurerId) => {
  const query = `
    SELECT *
    FROM mission_participation
    WHERE mid = $1 AND adventurer_id = $2
  `;
  const result = await pool.query(query, [mid, adventurerId]);
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
export const findAllOccupied = async (mid) => {
  const query = `SELECT * FROM mission_participation WHERE mid = $1 AND adventurer_id IS NOT NULL`;
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

// Submit participation
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

export const startParticipants = async (mid) => {
  const query = `
    UPDATE mission_participation
    SET status = $2
    WHERE mid = $1 AND status = $3
    RETURNING *
  `;
  const result = await pool.query(query, [
    mid,
    MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID,
    MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
  ]);
  return result.rows;
};

export const deleteParticipant = async (mid, adventurerId) => {
  const query = `
    DROP * FROM mission_participation WHERE mid = $1 AND adventurer_id = $2`;
  const result = await pool.query(query, [mid, adventurerId]);
  return result.rows[0];
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
    MISSION_PARTICIPATION_STATUS.ACCEPTED.ID,
  ]);
  return result.rows[0] || null;
};

export const releaseParticipation = async (mid, adventurerId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        UPDATE mission_participation
        SET status = $3
        WHERE mid = $1 AND adventurer_id = $2
        RETURNING *
      `,
      [mid, adventurerId, MISSION_PARTICIPATION_STATUS.RELEASED.ID],
    );

    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    await makeMissionConversationParticipantReadOnly(mid, adventurerId, client);
    await client.query('COMMIT');

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
    MISSION_PARTICIPATION_STATUS.REJECTED.ID,
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
    MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID,
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
    MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID,
  ]);
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
      [uid, mid, vacancyId, MISSION_PARTICIPATION_STATUS.JOINED.ID],
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

    await addMissionConversationParticipant(mid, uid, client);

    await client.query('COMMIT');
    return joinedVacancy;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const unjoinVacancy = async (mid, vacancyId, adventurerId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        UPDATE mission_participation
        SET adventurer_id = NULL, status = $4
        WHERE mid = $1
          AND id = $2
          AND adventurer_id = $3
      `,
      [mid, vacancyId, adventurerId, MISSION_PARTICIPATION_STATUS.EMPTY.ID],
    );

    if (result.rowCount < 1) {
      await client.query('ROLLBACK');
      return 0;
    }

    await client.query(
      `
        UPDATE mission
        SET occupied_vacancies = occupied_vacancies - 1
        WHERE mid = $1
      `,
      [mid],
    );

    await leaveMissionConversation(mid, adventurerId, client);
    await client.query('COMMIT');

    return result.rowCount;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
    MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
  ]);
  return result.rows[0].sum;
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

export const payVacancy = async (id, amount_paid) => {
  const query = `
    UPDATE mission_participation 
    SET payment_status = $1, amount_paid = amount_paid + $5 
    WHERE id = $2 AND adventurer_id IS NOT NULL AND payment_status IN ($3, $6) AND status = $4`;

  const result = await pool.query(query, [
    MISSION_PARTICIPATION_PAYMENT_STATUS.PAID.ID,
    id,
    MISSION_PARTICIPATION_PAYMENT_STATUS.UNPAID.ID,
    MISSION_PARTICIPATION_STATUS.PENDING_PAYMENT.ID,
    amount_paid,
    MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_PAID.ID,
  ]);
  return result.rowCount;
};

export const refundVacancy = async (id, amount_refunded) => {
  const query = `
    UPDATE mission_participation 
    SET payment_status = $1, amount_paid = amount_paid - $2 
    WHERE id = $3 AND adventurer_id IS NOT NULL AND payment_status = $4`;

  const result = await pool.query(query, [
    MISSION_PARTICIPATION_PAYMENT_STATUS.PAID.ID,
    amount_refunded,
    id,
    MISSION_PARTICIPATION_PAYMENT_STATUS.PARTIALLY_REFUNDED.ID,
  ]);
  return result.rowCount;
};

export const markVacancyAsPaidOut = async (id) => {
  const query = `UPDATE mission_participation SET payment_status = $2 WHERE id = $1`;
  const result = await pool.query(query, [
    id,
    MISSION_PARTICIPATION_PAYMENT_STATUS.LIQUIDATED.ID,
  ]);
  return result.rowCount;
};

//Updates just the payment status
export const updatePaymentStatus = async (id, status) => {
  const query =
    'UPDATE mission_participation SET payment_status = $1 WHERE id = $2';
  const result = await pool.query(query, [status, id]);
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
