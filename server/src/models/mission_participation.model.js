const pool = require("../config/db.config");

//Records that a specific adventurer has been paid.
const updateTransferInfo = async (mid, uid, transferId, amount) => {
  const query = `
    UPDATE mission_participation 
    SET transfer_id = $1, amount_paid = $2 
    WHERE mid = $3 AND adventurer_id = $4
  `;
  await pool.query(query, [transferId, amount, mid, uid]);
};

module.exports = { updateTransferInfo };
