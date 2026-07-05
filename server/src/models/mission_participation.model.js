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
