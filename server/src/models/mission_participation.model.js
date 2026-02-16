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
  await pool.query(query, [mid, adventurerId]);
};
