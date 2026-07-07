import pool from '../config/db.config.js';

export const createInvitation = async (invitationData) => {
  const {
    missionId,
    senderId,
    receiverId,
    type,
    action = 'mission_invite',
    message,
    payload = {},
  } = invitationData;
  const query = `
    INSERT INTO notification (
      date,
      type,
      kind,
      action,
      payload,
      associated_mission_id,
      sender_id,
      recipient_id,
      status,
      message
    )
    VALUES (NOW(), $1, 'actionable', $2, $3, $4, $5, $6, 'pending', $7)
    RETURNING nid
  `;
  const result = await pool.query(query, [
    type,
    action,
    payload,
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
    kind = 'informational',
    action = 'participation_approved',
    payload = {},
    status = null,
  } = notificationData;
  const query = `
    INSERT INTO notification (
      date,
      type,
      kind,
      action,
      payload,
      associated_mission_id,
      sender_id,
      recipient_id,
      status,
      message
    )
    VALUES (NOW(), 'mission', $1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING nid
  `;
  const result = await pool.query(query, [
    kind,
    action,
    payload,
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
        AND action IN ('join_request', 'mission_invite')
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
      n.kind,
      n.action,
      n.payload,
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

export const countParticipationReviewAttempts = async (
  missionId,
  adventurerId,
) => {
  const query = `
    SELECT COUNT(*)::int AS attempts
    FROM notification
    WHERE associated_mission_id = $1
      AND sender_id = $2
      AND type = 'mission'
      AND action = 'participation_review'
  `;
  const result = await pool.query(query, [missionId, adventurerId]);
  return result.rows[0].attempts;
};
