import pool from '../config/db.config.js';
import {
  MISSION_LIFE_CYCLE,
  VACANCY_LIFE_CYCLE,
} from '@hermyx/shared/utils/missions.utils.js';

//Get mission by its ID
export const getById = async (mid) => {
  const query = 'SELECT * FROM mission WHERE mid = $1';
  const result = await pool.query(query, [mid]);
  return result.rows[0];
};

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

export const getParticipantsForDisplay = async (mid) => {
  const query = `
    SELECT 
      mp.id AS vacancy_id,
      mp.title AS vacancy_title,
      mp.description AS vacancy_description,
      mp.monetary_reward AS reward,
      mp.status,
      u.uid AS adventurer_id,
      u.username,
      u.avatar
    FROM mission_participation mp
    LEFT JOIN app_user u ON mp.adventurer_id = u.uid
    WHERE mp.mid = $1
    ORDER BY mp.id ASC
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

//Updates just the status.
export const updateStatus = async (mid, status) => {
  const query = 'UPDATE mission SET status = $1 WHERE mid = $2';
  await pool.query(query, [status, mid]);
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

export const createMission = async (missionData) => {
  const {
    title,
    description,
    vacancies,
    vacanciesData,
    totalPayment,
    status,
    latitude,
    longitude,
    ownerId,
  } = missionData;

  // This operation has to steps, so a transaction is needed. So a connection is taken.
  const client = await pool.connect();

  try {
    // Transaction begins
    await client.query('BEGIN');

    // First step, saving mission info
    let result;
    if (!latitude || !longitude) {
      const query = `
        INSERT INTO mission (publication_date, title, description, total_vacancies, occupied_vacancies, status, owner_id, location, total_payment)
        VALUES (NOW(), $1, $2, $3, 0, $4, $5, NULL, $6)
        RETURNING *
      `;
      result = await client.query(query, [
        title,
        description,
        vacancies,
        status,
        ownerId,
        totalPayment,
      ]);
    } else {
      const query = `
        INSERT INTO mission (publication_date, title, description, total_vacancies, occupied_vacancies, status, owner_id, location, total_payment)
        VALUES (NOW(), $1, $2, $3, 0, $4, $5, ST_MakePoint($6, $7)::geography, $8)
        RETURNING *
      `;
      result = await client.query(query, [
        title,
        description,
        vacancies,
        status,
        ownerId,
        longitude,
        latitude,
        totalPayment,
      ]);
    }

    const newMission = result.rows[0];
    const missionId = newMission.mid; // New mission info saved is taken

    // Second step, save mission vacancies info
    const participationQuery = `
      INSERT INTO MISSION_PARTICIPATION (mid, monetary_reward, title, description, status)
      VALUES ($1, $2, $3, $4, $5)
    `;

    // Promises array, one per vacancy
    const insertPromises = vacanciesData.map((vacancy) => {
      return client.query(participationQuery, [
        missionId,
        vacancy.reward,
        vacancy.title || null,
        vacancy.description || null,
        VACANCY_LIFE_CYCLE.EMPTY.ID,
      ]);
    });

    // All promises are executed at the same time
    await Promise.all(insertPromises);

    // Last step, confirm every operation was successful
    await client.query('COMMIT');

    return newMission;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const updateMission = async (missionData) => {
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
  const result = await pool.query(query, [
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

// TODO: Cuando haya más﹕ filtros de búsqueda hay que ver cuándo hacer para poder implementarlos dinámicamente aquí?
export const getMissions = async ({ title = undefined, pagination }) => {
  // COUNT(*) OVER() allows to count all rows that meet the condition without taking into account LIMIT and with no aggregation
  let query = `SELECT m.mid, m.publication_date, m.title, m.description, m.total_vacancies,
    m.occupied_vacancies, m.total_payment, m.status, a.uid, a.username, COUNT(*) OVER() AS total_count
    FROM mission AS m JOIN app_user AS a ON (m.owner_id = a.uid) WHERE status != 'draft'`;
  const values = [];

  if (title) {
    values.push(title);
    query += ` AND unaccent(title) ILIKE unaccent('%' || $${values.length} || '%')`;
  }
  query += ` ORDER BY m.publication_date DESC`;
  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  // Postgres returns total_count in each row so we take the first one and clear it
  const totalCount = parseInt(result.rows[0].total_count);

  // Total_count column is cleared so the mission objective is not cluttered
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...missionData } = row;
    return missionData;
  });

  return { rows, totalCount };
};

// TODO Cuando haya más﹕ filtros de búsqueda hay que ver cuándo hacer para poder implementarlos dinámicamente aquí?
export const getMissionsOpened = async ({
  title = undefined,
  pagination,
  excludeOwnerId = undefined,
}) => {
  // COUNT(*) OVER() allows to count all rows that meet the condition without taking into account LIMIT and with no aggregation
  let query = `SELECT m.mid, m.publication_date, m.title, m.description, m.total_vacancies, 
    m.occupied_vacancies, m.status, a.uid, a.username, COUNT(*) OVER() AS total_count
    FROM mission AS m JOIN app_user AS a ON (m.owner_id = a.uid) 
    WHERE status = $1 OR status = $2`;
  const values = [MISSION_LIFE_CYCLE.OPENED.ID, MISSION_LIFE_CYCLE.REOPENED.ID];

  if (title) {
    values.push(title);
    query += ` AND unaccent(title) ILIKE unaccent('%' || $${values.length} || '%')`;
    if (excludeOwnerId) {
      values.push(excludeOwnerId);
      query += ` AND m.owner_id != $${values.length}`;
    }
  }
  query += ` ORDER BY m.publication_date DESC`;
  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  // Postgres returns total_count in each row so we take the first one and clear it
  const totalCount = parseInt(result.rows[0].total_count);

  // Total_count column is cleared so the mission objective is not cluttered
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...missionData } = row;
    return missionData;
  });

  return { rows, totalCount };
};

export const getAllMissionsInDraft = async () => {
  const query = "SELECT * FROM mission WHERE status = 'draft'";
  const result = await pool.query(query, []);
  return result.rows;
};

export const getMissionById = async (id, uid) => {
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

export const updateMissionStatus = async (id, updateData) => {
  const query = `
    UPDATE mission
    SET status = $2
    WHERE mid = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id, updateData]);
  return result.rows[0];
};

export const syncMissionCompletionStatus = async (mid) => {
  const summaryQuery = `
    SELECT
      COUNT(*)::int AS participant_count,
      COUNT(*) FILTER (
        WHERE status IN ($2, $3, $4)
      )::int AS active_count,
      COUNT(*) FILTER (WHERE status = $5)::int AS dispute_count,
      COUNT(*) FILTER (WHERE status IN ($6, $7, $8))::int AS accepted_count
    FROM mission_participation
    WHERE mid = $1
  `;
  const summaryResult = await pool.query(summaryQuery, [
    mid,
    VACANCY_LIFE_CYCLE.IN_PROGRESS.ID,
    VACANCY_LIFE_CYCLE.SUBMITTED.ID,
    VACANCY_LIFE_CYCLE.REJECTED.ID,
    VACANCY_LIFE_CYCLE.IN_DISPUTE.ID,
    VACANCY_LIFE_CYCLE.ACCEPTED.ID,
    VACANCY_LIFE_CYCLE.RELEASING.ID,
    VACANCY_LIFE_CYCLE.RELEASED.ID,
  ]);
  const summary = summaryResult.rows[0];

  if (!summary || summary.participant_count === 0) {
    return null;
  }

  let nextStatus = null;

  if (summary.active_count > 0) {
    nextStatus = MISSION_LIFE_CYCLE.IN_PROGRESS.ID;
  } else if (summary.dispute_count > 0) {
    nextStatus = MISSION_LIFE_CYCLE.IN_DISPUTE.ID;
  } else if (summary.accepted_count === summary.participant_count) {
    nextStatus = MISSION_LIFE_CYCLE.FINISHED.ID;
  }

  if (!nextStatus) {
    return null;
  }

  const updateQuery = `
    UPDATE mission
    SET
      status = $2::varchar,
      completion_date = CASE
        WHEN $2::varchar = $3 THEN COALESCE(completion_date, NOW())
        ELSE NULL
      END
    WHERE mid = $1
      AND status IN ($4, $3, $5)
    RETURNING *
  `;
  const updateResult = await pool.query(updateQuery, [
    mid,
    nextStatus,
    MISSION_LIFE_CYCLE.FINISHED.ID,
    MISSION_LIFE_CYCLE.IN_PROGRESS.ID,
    MISSION_LIFE_CYCLE.IN_DISPUTE.ID,
  ]);
  return updateResult.rows[0] || null;
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

export const adventurerUnjoined = async (mid) => {
  const query =
    'UPDATE mission SET occupied_vacancies = occupied_vacancies - 1 WHERE mid = $1 RETURNING occupied_vacancies';
  const result = await pool.query(query, [mid]);
  return result.rowCount;
};

export const getMissionsByUid = async (uid, pagination = null) => {
  // COUNT(*) OVER() allows to count all rows that meet the condition without taking into account LIMIT and with no aggregation
  let query = `SELECT m.mid, m.publication_date, m.title, m.description, m.total_vacancies,
    m.occupied_vacancies, m.status, a.uid, a.username, COUNT(*) OVER() AS total_count
    FROM mission AS m JOIN app_user AS a ON (m.owner_id = a.uid) WHERE status != 'draft' AND status != $2 AND m.owner_id = $1 
    ORDER BY m.publication_date DESC`;
  const values = [uid, MISSION_LIFE_CYCLE.DELETED.ID];

  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  // Postgres returns total_count in each row so we take the first one and clear it
  const totalCount = parseInt(result.rows[0].total_count);

  // Total_count column is cleared so the mission objective is not cluttered
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...missionData } = row;
    return missionData;
  });

  return { rows, totalCount };
};

export const getMissionsJoinedByUser = async (uid, pagination = null) => {
  // COUNT(*) OVER() allows to count all rows that meet the condition without taking into account LIMIT and with no aggregation
  let query = `SELECT m.mid, m.publication_date, m.title, m.description, m.total_vacancies, 
    m.occupied_vacancies, m.status, owner_user.uid, owner_user.username, COUNT(*) OVER() AS total_count
    FROM mission_participation AS ma
    JOIN mission AS m ON (m.mid = ma.mid)
    JOIN app_user AS owner_user ON (m.owner_id = owner_user.uid)
    WHERE adventurer_id = $1 AND m.status != $2
    ORDER BY m.publication_date DESC`;
  const values = [uid, MISSION_LIFE_CYCLE.DELETED.ID];

  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  // Postgres returns total_count in each row so we take the first one and clear it
  const totalCount = parseInt(result.rows[0].total_count);

  // Total_count column is cleared so the mission objective is not cluttered
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...missionData } = row;
    return missionData;
  });

  return { rows, totalCount };
};

// Gets mission by uid and title
export const getByUidAndTitle = async (uid, title, mid = undefined) => {
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

// Gets created missions displayed in another user's public profile.
export const getPublicProfileCreatedMissions = async (
  userId,
  pagination = null,
) => {
  let query = `
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
  const values = [userId, MISSION_LIFE_CYCLE.DELETED.ID];

  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  const totalCount = parseInt(result.rows[0].total_count);
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...missionData } = row;
    return missionData;
  });

  return { rows, totalCount };
};

// Gets joined missions displayed in another user's public profile.
export const getPublicProfileJoinedMissions = async (
  userId,
  pagination = null,
) => {
  let query = `
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
    WHERE mp.adventurer_id = $1 AND status != $2
    ORDER BY m.completion_date DESC NULLS LAST, m.publication_date DESC
  `;
  const values = [userId, MISSION_LIFE_CYCLE.DELETED.ID];

  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  const totalCount = parseInt(result.rows[0].total_count);
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...missionData } = row;
    return missionData;
  });

  return { rows, totalCount };
};

// Gets user active missions, created or joined
export const getUserActiveMissions = async (uid) => {
  const query = `
  SELECT COUNT(DISTINCT m.mid) AS total_active
  FROM mission m
    LEFT JOIN mission_participation ma ON m.mid = ma.mid AND ma.adventurer_id = $1
  WHERE m.status = 'in_progress'
    AND (m.owner_id = $1 OR ma.adventurer_id = $1)
  `;
  const result = await pool.query(query, [uid]);
  return result.rows[0];
};

// Gets number of participants in mission
export const getMissionParticipation = async (mid) => {
  const query = `SELECT count(*) FROM mission_participation WHERE mid = $1`;
  const result = await pool.query(query, [mid]);
  return result.rows[0].count;
};
