// External modules
import pool from '../config/db.config.js';

export const getAll = async () => {
  try {
    const query = 'SELECT * FROM app_user';
    const result = await pool.query(query);
    return result.rows;
  } catch (e) {
    throw e;
  }
};
