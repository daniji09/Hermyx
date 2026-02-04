const pool = require("../config/db.config");

//Get mission by its ID
const getById = async (mid) => {
  const query = "SELECT * FROM mission WHERE mid = $1";
  const result = await pool.query(query, [mid]);
  return result.rows[0];
};

//Updates the Stripe Payment Intent ID and the mission status. Uses COALESCE to prevent overwriting the ID with null if only status needs update.
const updatePaymentInfo = async (mid, pi_id, status) => {
  const query = `
    UPDATE mission 
    SET stripe_pi_id = COALESCE($1, stripe_pi_id), status = $2 
    WHERE mid = $3
  `;
  await pool.query(query, [pi_id, status, mid]);
};

//Get all adventurers in a mission, essential for knowing who to send money to.
const getParticipantsForRelease = async (mid) => {
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
const lockForRelease = async (mid, ownerId) => {
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
const lockForRefund = async (mid, ownerId) => {
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
const updateStatus = async (mid, status) => {
  const query = "UPDATE mission SET status = $1 WHERE mid = $2";
  await pool.query(query, [status, mid]);
};

//Set the mission as 'refunded' and saves the Stripe Refund ID for reference.
const finalizeRefund = async (mid, refundId) => {
  const query = `
    UPDATE mission 
    SET status = 'refunded', stripe_refund_id = $1 
    WHERE mid = $2
  `;
  await pool.query(query, [refundId, mid]);
};

const createMission = async (missionDate) => {
  const { title, description, vacancies, reward, status, ownerId } = missionDate;

  const query = `
    INSERT INTO mission (title, description, vacancies, monetary_reward, status, owner_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const result = await pool.query(query, [
    title,
    description,
    vacancies,
    reward,
    status,
    ownerId,
  ]);
  return result.rows[0];
};

const getAllMissions = async () => {
  const query = "SELECT * FROM mission WHERE status != 'draft'";
  const result = await pool.query(query, []);
  return result.rows;
};

const getAllMissionsInDraft = async () => {
  const query = "SELECT * FROM mission WHERE status = 'draft'";
  const result = await pool.query(query, []);
  return result.rows;
};

const getMissionById = async (mid) => {
  const query = "SELECT * FROM mission WHERE mid = $1";
  const result = await pool.query(query, [mid]);
  return result.rows[0];
};

const updateMission = async (mid, updateData) => {
  const { title, description, vacancies, reward } = updateData;

  const query = `
    UPDATE mission
    SET title = $1, description = $2, vacancies = $3, monetary_reward = $4
    WHERE mid = $5
    RETURNING *
  `;
  const result = await pool.query(query, [
    title,
    description,
    vacancies,
    reward,
    mid,
  ]);
  return result.rows[0];
};

const deleteMission = async (mid) => {
  const query = "DELETE FROM mission WHERE mid = $1 RETURNING *";
  const result = await pool.query(query, [mid]);
  return result.rows[0];
};

module.exports = {
  getById,
  updatePaymentInfo,
  getMissionById,
  getAllMissions,
  getAllMissionsInDraft,
  createMission,
  updateMission,
  deleteMission,
  getParticipantsForRelease,
  lockForRelease,
  lockForRefund,
  updateStatus,
  finalizeRefund,
};
