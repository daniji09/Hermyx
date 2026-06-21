import pool from '../config/db.config.js';

export const createInvitation = async (invitationData) => {
  const { missionId, senderId, receiverId, type } = invitationData;
  const query = `
    INSERT INTO invitation (date, type, associated_mission_id, sender_id, recipient_id, status)
    VALUES (NOW(), $1, $2, $3, $4, 'pending')
    RETURNING iid
  `;
  const result = await pool.query(query, [
    type,
    missionId,
    senderId,
    receiverId,
  ]);
  return result.rows[0].iid;
};

export const updateInvitationStatus = async (invitationId, status) => {
  const query = 'UPDATE invitation SET status = $1 WHERE iid = $2';
  await pool.query(query, [status, invitationId]);
};

export const findByIid = async (id) => {
  const query = 'SELECT * FROM invitation WHERE iid = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};
