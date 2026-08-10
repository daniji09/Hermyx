import {
  NOTIFICATION_ACTION,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
} from '@hermyx/shared';
import pool from '../config/db.config.js';

export const createNotification = async (notificationData, database = pool) => {
  const { type, kind, action, status, message, senderId, receiverId, payload } =
    notificationData;
  const query = `
    INSERT INTO notification (
      date,
      type,
      kind,
      action,
      payload,
      sender_id,
      recipient_id,
      status,
      message
    )
    VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING nid
  `;
  const result = await database.query(query, [
    type,
    kind,
    action,
    payload,
    senderId,
    receiverId,
    status,
    message,
  ]);
  return result.rows[0].nid;
};

export const updateNotificationStatus = async (
  notificationId,
  status,
  database = pool,
) => {
  const query = 'UPDATE notification SET status = $1 WHERE nid = $2';
  await database.query(query, [status, notificationId]);
};

export const markAsSeen = async (notificationId, database = pool) => {
  const query = `
    UPDATE notification
    SET seen = TRUE
    WHERE nid = $1
    RETURNING *
  `;
  const result = await database.query(query, [notificationId]);
  return result.rows[0];
};

export const addAssociatedReport = async (
  notificationId,
  reportId,
  database = pool,
) => {
  const result = await database.query(
    `UPDATE notification
     SET payload = payload || jsonb_build_object('associated_report_id', $2::int)
     WHERE nid = $1
     RETURNING *`,
    [notificationId, reportId],
  );
  return result.rows[0] || null;
};

export const markAllAsSeenByRecipientId = async (recipientId) => {
  const query = `
    UPDATE notification
    SET seen = TRUE
    WHERE recipient_id = $1
      AND seen = FALSE
    RETURNING *
  `;
  const result = await pool.query(query, [recipientId]);
  return result.rows;
};

export const findById = async (id) => {
  const query = 'SELECT * FROM notification WHERE nid = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

export const hasPendingJoinNotification = async (
  missionId,
  senderId,
  recipientId,
  vacancyId,
) => {
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM notification
      WHERE payload->>'associated_mission_id' = $1::text
        AND sender_id = $2
        AND recipient_id = $3
        AND payload->>'associated_vacancy_id' = $4::text
        AND status = $5
        AND action IN ($6, $7)
    ) AS "hasPendingJoinNotification"
  `;
  const result = await pool.query(query, [
    missionId,
    senderId,
    recipientId,
    vacancyId,
    NOTIFICATION_STATUS.PENDING.ID,
    NOTIFICATION_ACTION.JOIN_REQUEST.ID,
    NOTIFICATION_ACTION.MISSION_INVITE.ID,
  ]);
  return result.rows[0].hasPendingJoinNotification;
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
      (n.payload->>'associated_mission_id')::int as associated_mission_id,
      sender.username AS sender_username,
      sender.avatar AS sender_avatar,
      m.title AS mission_title
    FROM notification n
    JOIN app_user sender ON sender.uid = n.sender_id
    JOIN mission m ON m.mid = (n.payload->>'associated_mission_id')::int
    WHERE n.recipient_id = $1
    ORDER BY
      CASE WHEN n.seen = FALSE THEN 0 ELSE 1 END,
      CASE WHEN COALESCE(n.status, '') = $2 THEN 0 ELSE 1 END,
      n.date DESC
  `;
  const result = await pool.query(query, [
    recipientId,
    NOTIFICATION_STATUS.PENDING.ID,
  ]);
  return result.rows;
};

export const countParticipationReviewAttempts = async (
  missionId,
  adventurerId,
) => {
  const query = `
    SELECT COUNT(*)::int AS attempts
    FROM notification
    WHERE payload->>'associated_mission_id' = $1::text
      AND sender_id = $2
      AND type = $3
      AND action = $4
  `;
  const result = await pool.query(query, [
    missionId,
    adventurerId,
    NOTIFICATION_TYPE.MISSION.ID,
    NOTIFICATION_ACTION.PARTICIPATION_REVIEW.ID,
  ]);
  return result.rows[0].attempts;
};

export const findByActionStatusAndVacancy = async (
  action,
  status,
  associated_vacancy_id,
) => {
  const query = `SELECT * 
  FROM notification 
  WHERE action = $1 
    AND status = $2 
    AND payload->>'associated_vacancy_id' = $3::text`;
  const result = await pool.query(query, [
    action,
    status,
    associated_vacancy_id,
  ]);
  return result.rows;
};

export const updateNotification = async (notificationData) => {
  const {
    nid,
    type,
    kind,
    action,
    status,
    message,
    senderId,
    recipientId,
    payload,
  } = notificationData;

  const query = `UPDATE notification 
  SET type = $1, kind = $2, action = $3, status = $4, message = $5, sender_id = $6, recipient_id = $7, payload = $8
  WHERE nid = $9`;
  const result = await pool.query(query, [
    type,
    kind,
    action,
    status,
    message,
    senderId,
    recipientId,
    payload,
    nid,
  ]);
  return result.rowCount;
};

export const findByActionStatusSenderAndMission = async (
  action,
  status,
  associated_mission_id,
  sender_id,
) => {
  const query = `SELECT * 
  FROM notification 
  WHERE action = $1 
    AND status = $2 
    AND payload->>'associated_mission_id' = $3::text
    AND sender_id = $4`;
  const result = await pool.query(query, [
    action,
    status,
    associated_mission_id,
    sender_id,
  ]);
  return result.rows;
};

export const findExpiredParticipationReview = async () => {
  const query = `
      SELECT * 
      FROM notification
      WHERE action = $1 AND status = $2 
        AND date <= NOW() - INTERVAL '168 hours'
    `; // 7 days
  const result = await pool.query(query, [
    NOTIFICATION_ACTION.PARTICIPATION_REVIEW.ID,
    NOTIFICATION_STATUS.PENDING.ID,
  ]);
  return result.rows;
};
