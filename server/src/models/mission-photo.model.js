import pool from '../config/db.config.js';

/// Inserts
// Create new mission photo
export const create = async (mid, photoURL, client = pool) => {
  const query = `INSERT INTO mission_photo(mid, url) VALUES($1, $2)`;
  const result = await client.query(query, [mid, photoURL]);
  return result.rowCount;
};

/// Finds
// Get all photos from mission
export const findAllByMid = async (mid) => {
  const query = `SELECT * FROM mission_photo WHERE mid = $1`;
  const result = await pool.query(query, [mid]);
  return result.rows;
};

//---

export const deletePhoto = async (id) => {
  const query = `DELETE FROM mission_photo WHERE id = $1`;
  const result = await pool.query(query, [id]);
  return result.rowCount;
};
