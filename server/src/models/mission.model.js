import pool from '../config/db.config.js';

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
    SELECT u.uid, u.stripe_connected_id, u.email 
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
    AND status = 'accepted' 
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
    AND status IN ('funded', 'in_progress', 'delivered', 'accepted')
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
  const { title, description, vacancies, reward, difficulty, status, ownerId } =
    missionData;

  const query = `
    INSERT INTO mission (publication_date, title, description, total_vacancies, occupied_vacancies, monetary_reward, difficulty, status, owner_id)
    VALUES (NOW(), $1, $2, $3, 0, $4, $5, $6, $7)
    RETURNING *
  `;
  const result = await pool.query(query, [
    title,
    description,
    vacancies,
    reward,
    difficulty,
    status,
    ownerId,
  ]);
  return result.rows[0];
};

// TODO Cuando haya más filtros de búsqueda hay que ver cómo hacer para poder implementarlos dinámicamente aquí
export const getMissions = async ({ title = undefined, pagination }) => {
  // COUNT(*) OVER() permite contar todas las filas que cumplen la condición sin tener en cuenta el LIMIT y sin tener que agregar
  let query = `SELECT m.mid, m.publication_date, m.title, m.description, m.difficulty, m.total_vacancies, 
    m.occupied_vacancies, m.monetary_reward, m.status, a.uid, a.username, COUNT(*) OVER() AS total_count
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

  // Si no hay resultados, rows está vacío y totalCount es 0
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  // Postgres devuelve total_count en cada fila, cogemos el primero y lo limpiamos
  const totalCount = parseInt(result.rows[0].total_count);

  // Limpiamos la columna total_count para no ensuciar el objeto de la misión
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...missionData } = row;
    return missionData;
  });

  return { rows, totalCount };
};

// TODO Cuando haya más filtros de búsqueda hay que ver cómo hacer para poder implementarlos dinámicamente aquí
export const getMissionsFunded = async ({ title = undefined, pagination }) => {
  // COUNT(*) OVER() permite contar todas las filas que cumplen la condición sin tener en cuenta el LIMIT y sin tener que agregar
  let query = `SELECT m.mid, m.publication_date, m.title, m.description, m.difficulty, m.total_vacancies, 
    m.occupied_vacancies, m.monetary_reward, m.status, a.uid, a.username, COUNT(*) OVER() AS total_count
    FROM mission AS m JOIN app_user AS a ON (m.owner_id = a.uid) WHERE status = 'funded'`;
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

  // Si no hay resultados, rows está vacío y totalCount es 0
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  // Postgres devuelve total_count en cada fila, cogemos el primero y lo limpiamos
  const totalCount = parseInt(result.rows[0].total_count);

  // Limpiamos la columna total_count para no ensuciar el objeto de la misión
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
  const query = `SELECT *, EXISTS (
      SELECT 1 
      FROM mission_participation ma 
      WHERE ma.mid = m.mid AND ma.adventurer_id = $2
    ) AS is_joined FROM mission m WHERE mid = $1`;
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

export const deleteMission = async (id) => {
  const query = 'DELETE FROM mission WHERE mid = $1 RETURNING *';
  const result = await pool.query(query, [id]);
  return result.rows[0];
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
  return result.rows[0];
};

export const getMissionsByUid = async (uid, pagination = null) => {
  // COUNT(*) OVER() permite contar todas las filas que cumplen la condición sin tener en cuenta el LIMIT y sin tener que agregar
  let query = `SELECT m.mid, m.publication_date, m.title, m.description, m.difficulty, m.total_vacancies, m.occupied_vacancies, 
    m.occupied_vacancies, m.monetary_reward, m.status, a.uid, a.username, COUNT(*) OVER() AS total_count
    FROM mission AS m JOIN app_user AS a ON (m.owner_id = a.uid) WHERE status != 'draft' AND m.owner_id = $1 
    ORDER BY m.publication_date DESC`;
  const values = [uid];

  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(query, values);

  // Si no hay resultados, rows está vacío y totalCount es 0
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  // Postgres devuelve total_count en cada fila, cogemos el primero y lo limpiamos
  const totalCount = parseInt(result.rows[0].total_count);

  // Limpiamos la columna total_count para no ensuciar el objeto de la misión
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...missionData } = row;
    return missionData;
  });

  return { rows, totalCount };
};

export const getMissionsJoinedByUser = async (uid, pagination = null) => {
  // COUNT(*) OVER() permite contar todas las filas que cumplen la condición sin tener en cuenta el LIMIT y sin tener que agregar
  let query = `SELECT m.mid, m.publication_date, m.title, m.description, m.difficulty, m.total_vacancies, 
    m.occupied_vacancies, m.monetary_reward, m.status, a.uid, a.username, COUNT(*) OVER() AS total_count
    FROM (mission_participation AS ma JOIN app_user AS a ON (ma.adventurer_id = a.uid)) JOIN mission AS m ON (m.mid = ma.mid) 
    WHERE adventurer_id = $1 ORDER BY m.publication_date DESC`;
  const values = [uid];

  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(query, values);

  // Si no hay resultados, rows está vacío y totalCount es 0
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  // Postgres devuelve total_count en cada fila, cogemos el primero y lo limpiamos
  const totalCount = parseInt(result.rows[0].total_count);

  // Limpiamos la columna total_count para no ensuciar el objeto de la misión
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...missionData } = row;
    return missionData;
  });

  return { rows, totalCount };
};

// Gets mission by uid and title
export const getByUidAndTitle = async (uid, title) => {
  const query = `
    SELECT EXISTS (
      SELECT 1 
      FROM mission 
      WHERE owner_id = $1 
        AND LOWER(TRIM(title)) = LOWER($2)
    ) AS "hasDuplicate";
  `;
  const result = await pool.query(query, [uid, title]);
  return result.rows[0];
};

// Closes mission
export const closeMission = async (mid) => {
  const query = `UPDATE mission SET status = 'accepted' WHERE mid = $1 RETURNING *`;
  const result = await pool.query(query, [mid]);
  return result.rows[0];
};

export const getCompletedMission = async (userId) => {
  const query = `
    SELECT 
      m.mid, 
      m.title, 
      m.difficulty, 
      u.username AS requester_name,
      m.publication_date,
      m.completion_date,
      mp.review
    FROM MISSION m
    JOIN MISSION_PARTICIPATION mp ON m.mid = mp.mid
    JOIN APP_USER u ON m.owner_id = u.uid
    WHERE mp.adventurer_id = $1 
      AND m.status = 'released'
    ORDER BY m.completion_date DESC NULLS LAST;
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
};

// Active missions where the user is the owner
export const getActiveMissionsByOwner = async (id) => {
  const query = `SELECT
      m.mid,
      m.title,
      m.difficulty,
      m.status,
      m.publication_date,
      m.monetary_reward
    FROM mission m
    WHERE m.owner_id = $1
      AND m.status IN (
        'pending_payment',
        'funded',
        'in_progress',
        'delivered',
        'accepted'
      )
    ORDER BY m.publication_date DESC`;

  const result = await pool.query(query, [id]);
  return result.rows;
};

// Active missions in which the user participates as an adventurer
export const getActiveMissionsByAdventurer = async (id) => {
  const query = `
    SELECT
      m.mid,
      m.title,
      m.difficulty,
      m.status,
      m.publication_date,
      m.monetary_reward,
      owner_user.username AS requester_name
    FROM mission m
    JOIN mission_participation mp ON mp.mid = m.mid
    JOIN app_user owner_user ON owner_user.uid = m.owner_id
    WHERE mp.adventurer_id = $1
      AND m.status IN (
        'funded',
        'in_progress',
        'delivered',
        'accepted'
      )
    ORDER BY m.publication_date DESC
  `;

  const result = await pool.query(query, [id]);
  return result.rows;
};
