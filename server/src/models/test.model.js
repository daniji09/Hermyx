// External modules
const pool = require("../config/db.config");

const getAll = async () => {
  try {
    const query = "SELECT * FROM app_user";
    const result = await pool.query(query);
    return result.rows;
  } catch (e) {
    throw e;
  }
};

module.exports = { getAll };
