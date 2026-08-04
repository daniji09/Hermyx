import pool from '../config/db.config.js';

export const insertPhoto = async (mid, photoURL) => {
  const query = `INSERT INTO mission_photo(mid, url) VALUES($1, $2)`;
  const result = await pool.query(query, [mid, photoURL]);
  return result.rowCount;
};
