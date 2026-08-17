import pool from '../config/db.config.js';
import { MISSION_STATUS, MISSION_PARTICIPATION_STATUS } from '@hermyx/shared';
import { executePaginatedQuery } from '../utils/pagination.util.js';

/// INSERTS
// Crate new mission
export const create = async (missionData, client = pool) => {
  const {
    title,
    description,
    vacancies,
    status,
    ownerId,
    totalPayment,
    latitude,
    longitude,
  } = missionData;

  let query, params;
  if (!latitude || !longitude) {
    query = `INSERT INTO mission (publication_date, title, description, total_vacancies, 
      occupied_vacancies, status, owner_id, location, total_payment) 
    VALUES (NOW(), $1, $2, $3, 0, $4, $5, NULL, $6) RETURNING *`;
    params = [title, description, vacancies, status, ownerId, totalPayment];
  } else {
    query = `INSERT INTO mission (publication_date, title, description, total_vacancies,
     occupied_vacancies, status, owner_id, location, total_payment) 
    VALUES (NOW(), $1, $2, $3, 0, $4, $5, ST_MakePoint($6, $7)::geography, $8) RETURNING *`;
    params = [
      title,
      description,
      vacancies,
      status,
      ownerId,
      longitude,
      latitude,
      totalPayment,
    ];
  }

  const result = await client.query(query, params);
  return result.rows[0];
};

/// FINDS
// Get mission by its mid
export const findByMid = async (mid) => {
  const query = `SELECT *,  
    ST_Y(m.location::geometry) as latitude, 
    ST_X(m.location::geometry) as longitude 
    FROM mission m WHERE mid = $1`;
  const result = await pool.query(query, [mid]);
  return result.rows[0];
};

// Get mission by mid excluding an uid
export const findByMidExcludingUid = async (id, uid) => {
  const query = `SELECT *, 
    ST_Y(m.location::geometry) as latitude, 
    ST_X(m.location::geometry) as longitude, 
    EXISTS (
      SELECT 1 
      FROM mission_participation ma 
      WHERE ma.mid = m.mid AND ma.adventurer_id = $2
    ) AS is_joined,
    COALESCE((
      SELECT ma.status
      FROM mission_participation ma
      WHERE ma.mid = m.mid AND ma.adventurer_id = $2
      LIMIT 1
    ), NULL) AS participation_status,
    (
      SELECT c.cid
      FROM conversation c
      JOIN conversation_participant cp
        ON cp.conversation_id = c.cid
      WHERE c.mission_id = m.mid
        AND c.type = 'mission'
        AND cp.user_id = $2
        AND cp.left_at IS NULL
      LIMIT 1
    ) AS conversation_id,
    EXISTS (
      SELECT 1
      FROM notification n
      WHERE payload->>'associated_mission_id' = m.mid::text
        AND n.sender_id = $2
        AND n.recipient_id = m.owner_id
        AND n.type = 'invitation'
        AND n.status = 'pending'
    ) AS has_pending_join_request
    FROM mission m WHERE mid = $1`;
  const result = await pool.query(query, [id, uid]);
  return result.rows[0];
};

// Gets mission by uid and title
export const findByUidAndTitle = async (uid, title, mid = undefined) => {
  // If mid is not undefined, then the mission has to be different than that one
  let query, result;
  if (!mid) {
    query = `
    SELECT EXISTS (
      SELECT 1 
      FROM mission 
      WHERE owner_id = $1 
        AND LOWER(TRIM(title)) = LOWER($2)
    ) AS "hasDuplicate";
  `;
    result = await pool.query(query, [uid, title]);
  } else {
    query = `
    SELECT EXISTS (
      SELECT 1 
      FROM mission 
      WHERE owner_id = $1 
        AND LOWER(TRIM(title)) = LOWER($2) AND mid <> $3
    ) AS "hasDuplicate";
  `;
    result = await pool.query(query, [uid, title, mid]);
  }

  return result.rows[0];
};

// Gets all missions
export const findAll = async ({ title = undefined, pagination }) => {
  // COUNT(*) OVER() allows to count all rows that meet the condition without taking into account LIMIT and with no aggregation
  let query = `SELECT m.mid, m.publication_date, m.title, m.description, m.total_vacancies,
    m.occupied_vacancies, m.total_payment, m.status, a.uid, a.username, COUNT(*) OVER() AS total_count
    FROM mission AS m JOIN app_user AS a ON (m.owner_id = a.uid) WHERE 1=1`;
  const values = [];

  if (title) {
    values.push(title);
    query += ` AND unaccent(title) ILIKE unaccent('%' || $${values.length} || '%')`;
  }
  query += ` ORDER BY m.publication_date DESC`;

  return await executePaginatedQuery(query, values, pagination);
};

// Get all missions opened
export const findAllOpened = async ({
  title = undefined,
  pagination,
  excludeOwnerId = undefined,
  minPayment = undefined,
  maxPayment = undefined,
  maxDistanceKm = undefined,
  originUserId = undefined,
}) => {
  // COUNT(*) OVER() allows to count all rows that meet the condition without taking into account LIMIT and with no aggregation
  const values = [MISSION_STATUS.OPENED.ID, MISSION_STATUS.REOPENED.ID];
  const shouldFilterByDistance =
    maxDistanceKm !== undefined && originUserId !== undefined;
  let requesterJoin = '';
  let distanceSelect = '';

  if (shouldFilterByDistance) {
    values.push(originUserId);
    requesterJoin = ` JOIN app_user AS requester ON requester.uid = $${values.length}`;
    distanceSelect = `,
    ROUND((ST_Distance(m.location, requester.location) / 1000)::numeric, 1) AS distance_km`;
  }

  let query = `SELECT m.mid, m.publication_date, m.title, m.description, m.total_vacancies, 
    m.occupied_vacancies, m.total_payment, m.status, a.uid, a.username${distanceSelect}, COUNT(*) OVER() AS total_count
    FROM mission AS m
    JOIN app_user AS a ON (m.owner_id = a.uid)
    ${requesterJoin}
    WHERE (m.status = $1 OR m.status = $2)`;

  if (title) {
    values.push(title);
    query += ` AND unaccent(title) ILIKE unaccent('%' || $${values.length} || '%')`;
    if (excludeOwnerId) {
      values.push(excludeOwnerId);
      query += ` AND m.owner_id != $${values.length}`;
    }
  }

  if (minPayment !== undefined || maxPayment !== undefined) {
    const vacancyPaymentConditions = [
      'mp_payment.mid = m.mid',
      'mp_payment.adventurer_id IS NULL',
    ];

    if (minPayment !== undefined) {
      values.push(minPayment);
      vacancyPaymentConditions.push(
        `mp_payment.monetary_reward >= $${values.length}`,
      );
    }

    if (maxPayment !== undefined) {
      values.push(maxPayment);
      vacancyPaymentConditions.push(
        `mp_payment.monetary_reward <= $${values.length}`,
      );
    }

    query += `
      AND EXISTS (
        SELECT 1
        FROM mission_participation AS mp_payment
        WHERE ${vacancyPaymentConditions.join(' AND ')}
      )
    `;
  }

  if (shouldFilterByDistance) {
    values.push(maxDistanceKm);
    query += `
      AND m.location IS NOT NULL
      AND requester.location IS NOT NULL
      AND ST_DWithin(
        m.location,
        requester.location,
        $${values.length}::double precision * 1000
      )
    `;
  }

  if (shouldFilterByDistance) {
    query += ` ORDER BY ST_Distance(m.location, requester.location) ASC`;
  } else {
    query += ` ORDER BY m.publication_date DESC`;
  }
  return await executePaginatedQuery(query, values, pagination);
};

// Get missions published by user
export const findPublishedByUid = async (uid, pagination = null) => {
  // COUNT(*) OVER() allows to count all rows that meet the condition without taking into account LIMIT and with no aggregation
  const query = `SELECT m.mid, m.publication_date, m.title, m.description, m.total_vacancies,
    m.occupied_vacancies, m.status, a.uid, a.username, COUNT(*) OVER() AS total_count
    FROM mission AS m JOIN app_user AS a ON (m.owner_id = a.uid) WHERE m.status != $2 AND m.owner_id = $1 
    ORDER BY m.publication_date DESC`;
  const values = [uid, MISSION_STATUS.DELETED.ID];

  return await executePaginatedQuery(query, values, pagination);
};

// Get missions joined by user
export const findJoinedByUid = async (uid, pagination = null) => {
  // COUNT(*) OVER() allows to count all rows that meet the condition without taking into account LIMIT and with no aggregation
  const query = `SELECT m.mid, m.publication_date, m.title, m.description, m.total_vacancies, 
    m.occupied_vacancies, m.status, owner_user.uid, owner_user.username, COUNT(*) OVER() AS total_count
    FROM mission_participation AS ma
    JOIN mission AS m ON (m.mid = ma.mid)
    JOIN app_user AS owner_user ON (m.owner_id = owner_user.uid)
    WHERE adventurer_id = $1 AND m.status != $2
    ORDER BY m.publication_date DESC`;
  const values = [uid, MISSION_STATUS.DELETED.ID];

  return await executePaginatedQuery(query, values, pagination);
};

// Gets created missions displayed in another user's public profile.
export const findPublicPublishedByUid = async (userId, pagination = null) => {
  const query = `
    SELECT
      m.mid,
      m.title,
      owner_user.username,
      m.description,
      m.total_vacancies,
      m.occupied_vacancies,
      m.total_payment,
      CASE
        WHEN m.status = 'funded' THEN 'looking_for_adventurers'
        WHEN m.status IN (
          'in_progress',
          'accepted',
          'finished',
          'releasing',
          'in_dispute'
        ) THEN 'in_progress'
        WHEN m.status IN (
          'released',
          'partially_released'
        ) THEN 'closed'
      END AS public_status,
      CASE
        WHEN m.completion_date IS NULL THEN NULL
        ELSE m.completion_date - m.publication_date
      END AS completion_time,
      m.publication_date,
      m.completion_date,
      COUNT(*) OVER() AS total_count
    FROM mission m
    JOIN app_user owner_user ON owner_user.uid = m.owner_id
    WHERE m.owner_id = $1
      AND m.status != $2
    ORDER BY m.publication_date DESC
  `;
  const values = [userId, MISSION_STATUS.DELETED.ID];

  return await executePaginatedQuery(query, values, pagination);
};

// Gets joined missions displayed in another user's public profile.
export const findPublicJoinedByUid = async (userId, pagination = null) => {
  const query = `
    SELECT
      m.mid,
      m.title,
      owner_user.username,
      m.description,
      m.total_vacancies,
      m.occupied_vacancies,
      m.total_payment,
      CASE
        WHEN m.completion_date IS NULL THEN NULL
        ELSE m.completion_date - m.publication_date
      END AS completion_time,
      m.publication_date,
      m.completion_date,
      COUNT(*) OVER() AS total_count
    FROM mission_participation mp
    JOIN mission m ON m.mid = mp.mid
    JOIN app_user owner_user ON owner_user.uid = m.owner_id
    WHERE mp.adventurer_id = $1 AND m.status != $2
    ORDER BY m.completion_date DESC NULLS LAST, m.publication_date DESC
  `;
  const values = [userId, MISSION_STATUS.DELETED.ID];

  return await executePaginatedQuery(query, values, pagination);
};

// Gets mission status summary
export const getMissionStatusSummary = async (mid, client = pool) => {
  const summaryQuery = `
    SELECT
      COUNT(*)::int AS participant_count,
      COUNT(*) FILTER (
        WHERE status IN ($2, $3, $4)
      )::int AS active_count,
      COUNT(*) FILTER (WHERE status = $5)::int AS dispute_count
    FROM mission_participation
    WHERE mid = $1
  `;
  const result = await client.query(summaryQuery, [
    mid,
    MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID,
    MISSION_PARTICIPATION_STATUS.SUBMITTED.ID,
    MISSION_PARTICIPATION_STATUS.REJECTED.ID,
    MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID,
  ]);
  return result.rows[0];
};

/// UPDATES
// Update mission
export const update = async (missionData, client = pool) => {
  const {
    mid,
    title,
    description,
    vacancies,
    longitude,
    latitude,
    totalPayment,
  } = missionData;

  const query = `
    UPDATE mission 
    SET title = $2, description = $3, total_vacancies = $4, location = ST_MakePoint($5, $6)::geography, total_payment = $7
    WHERE mid = $1 
    RETURNING *
  `;
  const result = await client.query(query, [
    mid,
    title,
    description,
    vacancies,
    longitude,
    latitude,
    totalPayment,
  ]);
  return result.rows[0];
};

// Update mission status
export const updateStatusByMid = async (mid, status, client = pool) => {
  const query = `
    UPDATE mission
    SET status = $1
    WHERE mid = $2
    RETURNING *
  `;
  const result = await client.query(query, [status, mid]);
  return result.rows[0];
};

// Updated occupied vacancies
export const updateOccupiedVacancies = async (mid, amount, client = pool) => {
  const query = `UPDATE mission 
    SET occupied_vacancies = occupied_vacancies + $2
    WHERE mid = $1`;
  const result = await client.query(query, [mid, amount]);
  return result.rowCount;
};

// Updates mission payment by mid
export const updateMissionPayment = async (mid, payment, client = pool) => {
  const query = `
    UPDATE mission
    SET total_payment = $2
    WHERE mid = $1
    RETURNING *
  `;
  const result = await client.query(query, [mid, payment]);
  return result.rows[0] || null;
};

// Empties a mission
export const emptyMission = async (mid) => {
  const query = `UPDATE mission SET occupied_vacancies = 0 WHERE mid = $1 RETURNING *`;
  const result = pool.query(query, [mid]);
  return result.rowCount;
};

/// ......

//Updates the Stripe Payment Intent ID and the mission status. Uses COALESCE to prevent overwriting the ID with null if only status needs update.
export const updatePaymentInfo = async (mid, pi_id, status) => {
  const query = `
    UPDATE mission 
    SET stripe_pi_id = COALESCE($1, stripe_pi_id), status = $2 
    WHERE mid = $3
  `;
  await pool.query(query, [pi_id, status, mid]);
};

//Get all adventurers in a mission, essential for knowing who to send money to.
export const getParticipantsForRelease = async (mid) => {
  const query = `
    SELECT
      u.uid,
      u.stripe_connected_id,
      u.email,
      mp.monetary_reward,
      mp.transfer_id
    FROM app_user u
    JOIN mission_participation mp ON u.uid = mp.adventurer_id
    WHERE mp.mid = $1
  `;
  const result = await pool.query(query, [mid]);
  return result.rows;
};

//Tries to set status to "releasing" only if current status is 'accepted', this prevents double payments. Returns the row if successful.
export const lockForRelease = async (mid, ownerId) => {
  const query = `
    UPDATE mission 
    SET status = 'releasing' 
    WHERE mid = $1 
    AND owner_id = $2 
    AND status = 'finished'
    RETURNING *
  `;
  const result = await pool.query(query, [mid, ownerId]);
  return result.rows[0];
};

//Tries to set status to 'refunding'. Validates that the mission is in a state where a refund is allowed.
export const lockForRefund = async (mid, ownerId) => {
  const query = `
    UPDATE mission 
    SET status = 'refunding' 
    WHERE mid = $1 
    AND owner_id = $2 
    AND status IN ('funded', 'in_progress', 'finished', 'accepted')
    RETURNING *
  `;
  const result = await pool.query(query, [mid, ownerId]);
  return result.rows[0];
};

// Updates mission status and stores completion date for paid-out missions.
export const updateReleaseStatus = async (mid, status) => {
  const query = `
    UPDATE mission
    SET status = $1, completion_date = NOW()
    WHERE mid = $2
  `;
  await pool.query(query, [status, mid]);
};

//Set the mission as 'refunded' and saves the Stripe Refund ID for reference.
export const finalizeRefund = async (mid, refundId) => {
  const query = `
    UPDATE mission 
    SET status = 'refunded', stripe_refund_id = $1 
    WHERE mid = $2
  `;
  await pool.query(query, [refundId, mid]);
};

export const getAllMissionsInDraft = async () => {
  const query = "SELECT * FROM mission WHERE status = 'draft'";
  const result = await pool.query(query, []);
  return result.rows;
};

export const countMissions = async () => {
  const query = 'SELECT COUNT(*) FROM mission';
  const result = await pool.query(query, []);
  return parseInt(result.rows[0].count);
};

export const adventurerJoined = async (mid) => {
  const query =
    'UPDATE mission SET occupied_vacancies = occupied_vacancies + 1 WHERE mid = $1 RETURNING occupied_vacancies';
  const result = await pool.query(query, [mid]);
  return result.rowCount;
};

// Gets user active missions, created or joined
export const getUserActiveMissions = async (uid) => {
  const query = `
  SELECT m.mid, 
      m.publication_date, 
      m.title, 
      m.description, 
      m.total_vacancies,
      m.occupied_vacancies,
      m.location,
      m.total_payment,
      m.completion_date,
      ma.monetary_reward,
      ma.amount_paid,
      ma.payment_status,
      ma.owner_review_id,
      ma.adventurer_review_id,
      m.owner_id, m.status AS status, ma.status AS participation_status, ma.id AS vacancy_id, COUNT(*) OVER() AS total_active
  FROM mission m
    LEFT JOIN mission_participation ma ON m.mid = ma.mid AND ma.adventurer_id = $1
  WHERE m.status NOT IN ($2, $3, $4, $5)
    AND (m.owner_id = $1 OR ma.adventurer_id = $1)
  `;
  const result = await pool.query(query, [
    uid,
    MISSION_STATUS.DELETED.ID,
    MISSION_STATUS.CANCELLING.ID,
    MISSION_STATUS.CANCELLED.ID,
    MISSION_STATUS.FINISHED.ID,
  ]);
  return result.rows;
};

// Gets number of participants in mission
export const getMissionParticipation = async (mid) => {
  const query = `SELECT count(*) FROM mission_participation WHERE mid = $1`;
  const result = await pool.query(query, [mid]);
  return result.rows[0].count;
};
