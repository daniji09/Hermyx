import pool from '../config/db.config';

export const createInvitation = async (invitationData) => {
  const { missionId, senderId, receiverId } = invitationData;
  const query = `INSERT INTO invitations (associated_mission_id, sender_id, recipient_id, status) VALUES ($1, $2, $3, 'pending') RETURNING id`;
  const result = await pool.query(query, [missionId, senderId, receiverId]);
  return result.rows[0].id;
};

export const updateInvitationStatus = async (invitationId, status) => {
  const query = 'UPDATE invitations SET status = $1 WHERE id = $2';
  await pool.query(query, [status, invitationId]);
};

export const findByIid = async (id) => {
  const query = 'SELECT * FROM invitations WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};
