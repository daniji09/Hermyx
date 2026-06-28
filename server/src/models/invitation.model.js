import pool from '../config/db.config.js';

export const createInvitation = async (invitationData) => {
  const { missionId, senderId, receiverId, type, message } = invitationData;
  const query = `
    INSERT INTO invitation (date, type, associated_mission_id, sender_id, recipient_id, status, message)
    VALUES (NOW(), $1, $2, $3, $4, 'pending', $5)
    RETURNING iid
  `;
  const result = await pool.query(query, [
    type,
    missionId,
    senderId,
    receiverId,
    message,
  ]);
  return result.rows[0].iid;
};

export const updateInvitationStatus = async (invitationId, status) => {
  const query = 'UPDATE invitation SET status = $1 WHERE iid = $2';
  await pool.query(query, [status, invitationId]);
};

export const markAsSeen = async (invitationId) => {
  const query = `
    UPDATE invitation
    SET seen = TRUE
    WHERE iid = $1
    RETURNING *
  `;
  const result = await pool.query(query, [invitationId]);
  return result.rows[0];
};

export const findByIid = async (id) => {
  const query = 'SELECT * FROM invitation WHERE iid = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export const hasPendingInvitation = async (missionId, senderId, recipientId) => {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM invitation
      WHERE associated_mission_id = $1
        AND sender_id = $2
        AND recipient_id = $3
        AND status = 'pending'
    ) AS "hasPendingInvitation"
  `;
  const result = await pool.query(query, [missionId, senderId, recipientId]);
  return result.rows[0].hasPendingInvitation;
};

export const getByRecipientId = async (recipientId) => {
  const query = `
    SELECT
      i.iid,
      i.date,
      i.seen,
      i.type,
      i.status,
      i.message,
      i.sender_id,
      i.recipient_id,
      i.associated_mission_id,
      sender.username AS sender_username,
      sender.avatar AS sender_avatar,
      m.title AS mission_title
    FROM invitation i
    JOIN app_user sender ON sender.uid = i.sender_id
    JOIN mission m ON m.mid = i.associated_mission_id
    WHERE i.recipient_id = $1
    ORDER BY
      CASE WHEN i.seen = FALSE THEN 0 ELSE 1 END,
      CASE WHEN i.status = 'pending' THEN 0 ELSE 1 END,
      i.date DESC
  `;
  const result = await pool.query(query, [recipientId]);
  return result.rows;
};
