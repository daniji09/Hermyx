import pool from '../config/db.config.js';

/// INSERTS
// Create new mission photo
export const create = async (mid, photoURL, client = pool) => {
  const query = `INSERT INTO mission_photo(mid, url) VALUES($1, $2)`;
  const result = await client.query(query, [mid, photoURL]);
  return result.rowCount;
};

/// FINDS
// Get all photos from mission
export const findAllByMid = async (mid) => {
  const query = `SELECT * FROM mission_photo WHERE mid = $1`;
  const result = await pool.query(query, [mid]);
  return result.rows;
};

/// DELETES
// Delete photo
export const deleteById = async (id, client = pool) => {
  const query = `DELETE FROM mission_photo WHERE id = $1`;
  const result = await client.query(query, [id]);
  return result.rowCount;
};
