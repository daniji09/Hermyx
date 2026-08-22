import { REPORT_STATUS, REPORT_TYPE } from '@hermyx/shared';
import pool from '../config/db.config.js';
import { executePaginatedQuery } from '../utils/pagination.util.js';

/// INSERTS
// Creates a report
export const create = async (
  { senderId, message, type, payload, conversationId = null },
  client = pool,
) => {
  const query = `INSERT INTO report (
      date,
      sender_id,
      message,
      status,
      type,
      payload,
      conversation_id
    )
    VALUES (NOW(), $1, $2, $3, $4, $5, $6)
    RETURNING *`;
  const result = await client.query(query, [
    senderId,
    message,
    REPORT_STATUS.SENT.ID,
    type,
    payload,
    conversationId,
  ]);
  return result.rows[0];
};

/// FINDS
// Get report by id
export const findById = async (id, client = pool) => {
  const query = `
    SELECT
      r.*,
      m.title AS mission_title,
      mp.title AS vacancy_title,
      u.username AS other_username,
      s.username AS sender_username,
      (
        r.status = 'SENT'
        AND r.conversation_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM conversation_message admin_message
          JOIN app_user admin_user
            ON admin_user.uid = admin_message.sender_id
          WHERE admin_message.conversation_id = r.conversation_id
            AND admin_user.role = 'ADMIN'
        )
      ) AS needs_admin_attention
    FROM report r
    LEFT JOIN mission m
      ON m.mid = NULLIF(r.payload->>'associated_mission_id', '')::int
    LEFT JOIN mission_participation mp
      ON mp.id = NULLIF(r.payload->>'associated_vacancy_id', '')::int
    LEFT JOIN app_user u 
      ON u.uid = NULLIF(r.payload->>'associated_user_id', '')::int
    LEFT JOIN app_user s
      on s.uid = r.sender_id
    WHERE r.rid = $1
  `;
  const result = await client.query(query, [id]);
  return result.rows[0];
};

// Gets all reports paginated
export const findAll = async ({ pagination, filters, userId }) => {
  // COUNT(*) OVER() allows to count all rows that meet the condition without taking into account LIMIT and with no aggregation
  let query = `SELECT
      r.*,
      m.title AS mission_title,
      mp.title AS vacancy_title,
      u.username AS other_username,
      s.username AS sender_username,
      COALESCE((
        SELECT COUNT(*)::int
        FROM conversation_participant cp
        JOIN conversation_message cm
          ON cm.conversation_id = cp.conversation_id
        WHERE cp.conversation_id = r.conversation_id
          AND cp.user_id = $1
          AND cp.left_at IS NULL
          AND cm.sender_id <> $1
          AND cm.created_at > cp.last_read_at
      ), 0)::int AS unread_count,
      (
        r.status = 'SENT'
        AND r.conversation_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM conversation_message admin_message
          JOIN app_user admin_user
            ON admin_user.uid = admin_message.sender_id
          WHERE admin_message.conversation_id = r.conversation_id
            AND admin_user.role = 'ADMIN'
        )
      ) AS needs_admin_attention,
      COUNT(*) OVER() AS total_count
    FROM report AS r
    LEFT JOIN mission m
      ON m.mid = NULLIF(r.payload->>'associated_mission_id', '')::int
    LEFT JOIN mission_participation mp
      ON mp.id = NULLIF(r.payload->>'associated_vacancy_id', '')::int
    LEFT JOIN app_user u 
      ON u.uid = NULLIF(r.payload->>'associated_user_id', '')::int
    LEFT JOIN app_user s
      ON s.uid = r.sender_id
    WHERE 1=1`;

  const values = [userId];

  if (filters?.status) {
    values.push(filters.status);
    query += ` AND r.status = $${values.length}`;
  }

  if (filters?.type) {
    values.push(filters.type);
    query += ` AND r.type = $${values.length}`;
  }

  const sortDirection = filters?.sortByDate === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY r.date ${sortDirection}`;

  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  // Postgres returns total_count in each row so we take the first one and clear it
  const totalCount = parseInt(result.rows[0].total_count);

  // Total_count column is cleared so the report objective is not cluttered
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...reportData } = row;
    return reportData;
  });

  return { rows, totalCount };
};

// Gets all active specified reports of a user
export const checkActiveReport = async (
  { senderId, type, payload },
  client = pool,
) => {
  let query = `
    SELECT rid FROM REPORT 
    WHERE sender_id = $1 
      AND status = $2
      AND type = $3
  `;

  let result;
  if (
    type === REPORT_TYPE.REPORT_ADVENTURER.ID ||
    type === REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID ||
    type === REPORT_TYPE.REVIEW_DISPUTE.ID
  ) {
    query += `AND payload->>'associated_mission_id' = $4
      AND payload->>'associated_vacancy_id' = $5`;
    result = await client.query(query, [
      senderId,
      REPORT_STATUS.SENT.ID,
      type,
      payload.missionId,
      payload.vacancyId,
    ]);
  } else if (type === REPORT_TYPE.REPORT_PROFILE.ID) {
    query += `AND payload->>'associated_user_id' = $4`;
    result = await client.query(query, [
      senderId,
      REPORT_STATUS.SENT.ID,
      type,
      payload.userId,
    ]);
  } else if (type === REPORT_TYPE.REPORT_MISSION.ID) {
    query += `AND payload->>'associated_mission_id' = $4`;
    result = await client.query(query, [
      senderId,
      REPORT_STATUS.SENT.ID,
      type,
      payload.missionId,
    ]);
  }

  return result.rowCount;
};

// Find disputes by user id
export const findDisputesByUserId = async (userId, pagination) => {
  const query = `SELECT
       r.*,
       c.closed_at,
       m.title AS mission_title,
       mp.title AS vacancy_title,
       counterpart.uid AS counterpart_id,
       counterpart.username AS counterpart_username,
       counterpart.avatar AS counterpart_avatar,
       last_message.content AS last_message_content,
       last_message.attachment_type AS last_message_attachment_type,
       last_message.created_at AS last_message_created_at,
       COALESCE(unread.unread_count, 0)::int AS unread_count,
       COUNT(*) OVER()::int AS total_count
     FROM report r
     JOIN conversation c ON c.cid = r.conversation_id
     JOIN conversation_participant current_participant
       ON current_participant.conversation_id = c.cid
      AND current_participant.user_id = $1
      AND current_participant.left_at IS NULL
     LEFT JOIN mission m
       ON m.mid = NULLIF(r.payload->>'associated_mission_id', '')::int
     LEFT JOIN mission_participation mp
       ON mp.id = NULLIF(r.payload->>'associated_vacancy_id', '')::int
     LEFT JOIN LATERAL (
       SELECT u.uid, u.username, u.avatar
       FROM conversation_participant cp
       JOIN app_user u ON u.uid = cp.user_id
       WHERE cp.conversation_id = c.cid
         AND cp.user_id <> $1
         AND u.role = 'USER'
         AND cp.left_at IS NULL
       ORDER BY cp.joined_at ASC
       LIMIT 1
     ) counterpart ON true
     LEFT JOIN LATERAL (
       SELECT cm.content, cm.attachment_type, cm.created_at
       FROM conversation_message cm
       WHERE cm.conversation_id = c.cid
       ORDER BY cm.created_at DESC, cm.mid DESC
       LIMIT 1
     ) last_message ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS unread_count
       FROM conversation_message cm
       WHERE cm.conversation_id = c.cid
         AND cm.sender_id <> $1
         AND cm.created_at > current_participant.last_read_at
     ) unread ON true
     WHERE r.type IN ($2, $3, $4)
     ORDER BY
       last_message.created_at DESC NULLS LAST,
       r.date DESC,
       r.rid DESC`;
  return executePaginatedQuery(
    query,
    [
      userId,
      REPORT_TYPE.REPORT_ADVENTURER.ID,
      REPORT_TYPE.REVIEW_DISPUTE.ID,
      REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID,
    ],
    pagination,
  );
};

// Finds all active disputes by uid
export const findAllActiveDisputesByUid = async (uid, client = pool) => {
  const result = await client.query(
    `SELECT
       r.*,
       c.closed_at,
       m.title AS mission_title,
       mp.title AS vacancy_title,
       counterpart.uid AS counterpart_id,
       counterpart.username AS counterpart_username,
       counterpart.avatar AS counterpart_avatar,
       last_message.content AS last_message_content,
       last_message.attachment_type AS last_message_attachment_type,
       last_message.created_at AS last_message_created_at,
       COALESCE(unread.unread_count, 0)::int AS unread_count
     FROM report r
     JOIN conversation c ON c.cid = r.conversation_id
     JOIN conversation_participant current_participant
       ON current_participant.conversation_id = c.cid
      AND current_participant.user_id = $1
      AND current_participant.left_at IS NULL
     LEFT JOIN mission m
       ON m.mid = NULLIF(r.payload->>'associated_mission_id', '')::int
     LEFT JOIN mission_participation mp
       ON mp.id = NULLIF(r.payload->>'associated_vacancy_id', '')::int
     LEFT JOIN LATERAL (
       SELECT u.uid, u.username, u.avatar
       FROM conversation_participant cp
       JOIN app_user u ON u.uid = cp.user_id
       WHERE cp.conversation_id = c.cid
         AND cp.user_id <> $1
         AND u.role = 'USER'
         AND cp.left_at IS NULL
       ORDER BY cp.joined_at ASC
       LIMIT 1
     ) counterpart ON true
     LEFT JOIN LATERAL (
       SELECT cm.content, cm.attachment_type, cm.created_at
       FROM conversation_message cm
       WHERE cm.conversation_id = c.cid
       ORDER BY cm.created_at DESC
       LIMIT 1
     ) last_message ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS unread_count
       FROM conversation_message cm
       WHERE cm.conversation_id = c.cid
         AND cm.sender_id <> $1
         AND cm.created_at > current_participant.last_read_at
     ) unread ON true
     WHERE r.type IN ($2, $3, $4) AND r.status = $5
     ORDER BY last_message.created_at DESC NULLS LAST, r.date DESC`,
    [
      uid,
      REPORT_TYPE.REPORT_ADVENTURER.ID,
      REPORT_TYPE.REVIEW_DISPUTE.ID,
      REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID,
      REPORT_STATUS.SENT.ID,
    ],
  );
  return result.rows;
};

/// UPDATES
// Closes a report
export const close = async (
  rid,
  decision,
  reason,
  resolvedBy,
  client = pool,
) => {
  const result = await client.query(
    `UPDATE report
       SET status = $1, decision = $3, decision_reason = $4, resolved_by = $5
       WHERE rid = $2
       RETURNING *`,
    [REPORT_STATUS.ANSWERED.ID, rid, decision, reason, resolvedBy],
  );
  return result.rows[0];
};

// Updates status depending on current one, used for concurrency
export const updateStatusIfCurrent = async (rid, status, client = pool) => {
  const result = await client.query(
    `UPDATE report
       SET status = $1
       WHERE rid = $2 AND status = $3
       RETURNING *`,
    [
      status,
      rid,
      status === REPORT_STATUS.ANSWERED.ID
        ? REPORT_STATUS.SENT.ID
        : REPORT_STATUS.ANSWERED.ID,
    ],
  );
  return result.rows[0];
};
