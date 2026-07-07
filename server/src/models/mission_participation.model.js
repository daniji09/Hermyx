import pool from '../config/db.config.js';

export const updateTransferInfo = async (mid, uid, transferId, amount) => {
  const query = `
    UPDATE mission_participation 
    SET transfer_id = $1, amount_paid = $2 
    WHERE mid = $3 AND adventurer_id = $4
  `;
  await pool.query(query, [transferId, amount, mid, uid]);
};

export const addParticipant = async (mid, adventurerId) => {
  const query = `
    INSERT INTO mission_participation (mid, adventurer_id) 
    VALUES ($1, $2)
  `;
  const result = await pool.query(query, [mid, adventurerId]);
  return result.rowCount;
};

export const deleteParticipant = async (mid, adventurerId) => {
  const query = `
    DROP * FROM mission_participation WHERE mid = $1 AND adventurer_id = $2`;
  const result = await pool.query(query, [mid, adventurerId]);
  return result.rows[0];
};

export const getById = async (mid, adventurerId) => {
  const query = `SELECT COUNT(*) FROM mission_participation WHERE mid = $1 AND adventurer_id = $2`;
  const result = await pool.query(query, [mid, adventurerId]);
  return result.rows[0].count;
};

export const getVacancy = async (mid, vacancyId) => {
  console.log(mid, vacancyId);
  const query = `SELECT COUNT(*) FROM mission_participation WHERE mid = $1 AND id = $2`;
  const result = await pool.query(query, [mid, vacancyId]);
  return result.rows[0].count;
};

export const joinVacancy = async (mid, vacancyId, uid) => {
  const query = `UPDATE mission_participation SET adventurer_id = $1 WHERE mid = $2 AND id = $3`;
  const result = await pool.query(query, [uid, mid, vacancyId]);
  return result.rowCount;
};

export const unjoinVacancy = async (mid, vacancyId) => {
  const query = `UPDATE mission_participation SET adventurer_id = NULL WHERE mid = $1 AND id = $2`;
  const result = await pool.query(query, [mid, vacancyId]);
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
    SET monetary_reward = $1, title = $2, description = $3
    WHERE id = $4 AND mid = $5
      AND (
        monetary_reward != $1 OR 
        title IS DISTINCT FROM $2 OR 
        description IS DISTINCT FROM $3
      )
    RETURNING id, adventurer_id, title, description;
  `;

  const result = await pool.query(updateQuery, [
    vacancy.reward,
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
      INSERT INTO mission_participation (mid, monetary_reward, title, description)
      VALUES ($1, $2, $3, $4)
    `;
    return pool.query(insertQuery, [
      mid,
      vacancy.reward,
      vacancy.title || null,
      vacancy.description || null,
    ]);
  });
  const result = await Promise.all([...insertPromises]);
  return result;
};
