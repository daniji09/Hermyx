import pool from '../config/db.config.js';

export const createInvitation = async (invitationData) => {
  const { missionId, senderId, receiverId, type, message } = invitationData;
  const query = `
    INSERT INTO notification (date, type, associated_mission_id, sender_id, recipient_id, status, message)
    VALUES (NOW(), $1, $2, $3, $4, 'pending', $5)
    RETURNING nid
  `;
  const result = await pool.query(query, [
    type,
    missionId,
    senderId,
    receiverId,
    message,
  ]);
  return result.rows[0].nid;
};

export const createMissionNotification = async (notificationData) => {
  const {
    missionId,
    senderId,
    receiverId,
    message,
    status = null,
  } = notificationData;
  const query = `
    INSERT INTO notification (
      date,
      type,
      associated_mission_id,
      sender_id,
      recipient_id,
      status,
      message
    )
    VALUES (NOW(), 'mission', $1, $2, $3, $4, $5)
    RETURNING nid
  `;
  const result = await pool.query(query, [
    missionId,
    senderId,
    receiverId,
    status,
    message,
  ]);
  return result.rows[0].nid;
};

export const updateInvitationStatus = async (notificationId, status) => {
  const query = 'UPDATE notification SET status = $1 WHERE nid = $2';
  await pool.query(query, [status, notificationId]);
};

export const markAsSeen = async (notificationId) => {
  const query = `
    UPDATE notification
    SET seen = TRUE
    WHERE nid = $1
    RETURNING *
  `;
  const result = await pool.query(query, [notificationId]);
  return result.rows[0];
};

export const findById = async (id) => {
  const query = 'SELECT * FROM notification WHERE nid = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export const hasPendingInvitation = async (
  missionId,
  senderId,
  recipientId,
) => {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM notification
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
      n.nid,
      n.date,
      n.seen,
      n.type,
      n.status,
      n.message,
      n.sender_id,
      n.recipient_id,
      n.associated_mission_id,
      sender.username AS sender_username,
      sender.avatar AS sender_avatar,
      m.title AS mission_title
    FROM notification n
    JOIN app_user sender ON sender.uid = n.sender_id
    JOIN mission m ON m.mid = n.associated_mission_id
    WHERE n.recipient_id = $1
    ORDER BY
      CASE WHEN n.seen = FALSE THEN 0 ELSE 1 END,
      CASE WHEN COALESCE(n.status, '') = 'pending' THEN 0 ELSE 1 END,
      n.date DESC
  `;
  const result = await pool.query(query, [recipientId]);
  return result.rows;
};
