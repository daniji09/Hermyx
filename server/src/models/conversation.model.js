import pool from '../config/db.config.js';
import { executePaginatedQuery } from '../utils/pagination.util.js';

/// INSERTS
// Creates a new conversation
export const create = async (type, missionId = null, client = pool) => {
  // Mission case
  if (type === 'mission') {
    const query = `
      INSERT INTO conversation (type, mission_id)
      VALUES ($1, $2)
      ON CONFLICT (mission_id) DO UPDATE
        SET mission_id = EXCLUDED.mission_id
      RETURNING *
    `;
    const result = await client.query(query, [type, missionId]);
    return result.rows[0];
  }

  // Rest
  const query = `
    INSERT INTO conversation (type)
    VALUES ($1)
    RETURNING *
  `;
  const result = await client.query(query, [type]);
  return result.rows[0];
};

/// SELECTS
// Find conversation by id
export const findById = async (conversationId, client = pool) => {
  const query = `
    SELECT
      c.*,
      m.title AS mission_title
    FROM conversation c
    LEFT JOIN mission m ON m.mid = c.mission_id
    WHERE c.cid = $1
  `;
  const result = await client.query(query, [conversationId]);
  return result.rows[0];
};

// Checks whether a user can access a mission conversation
export const isMissionConversationParticipant = async (
  conversationId,
  userId,
  client = pool,
) => {
  const query = `
    SELECT 1
    FROM conversation c
    JOIN mission m ON m.mid = c.mission_id
    WHERE c.cid = $1
      AND c.type = 'mission'
      AND (
        m.owner_id = $2
        OR EXISTS (
          SELECT 1
          FROM mission_participation mp
          WHERE mp.mid = m.mid
            AND mp.adventurer_id = $2
        )
      )
    LIMIT 1
  `;
  const result = await client.query(query, [conversationId, userId]);
  return result.rowCount > 0;
};

// Find conversation by uid
export const findAllByUid = async (userId, pagination) => {
  const query = `
SELECT
      c.cid,
      c.type,
      c.mission_id,
      c.created_at,
      c.closed_at,
      current_participant.can_send,
      current_participant.history_until,
      mission_details.title AS mission_title,
      participant_summary.participant_count,
      other_user.uid AS other_user_id,
      other_user.username AS other_username,
      other_user.avatar AS other_avatar,
      last_message.mid AS last_message_id,
      last_message.content AS last_message_content,
      last_message.attachment_type AS last_message_attachment_type,
      last_message.created_at AS last_message_created_at,
      last_sender.uid AS last_message_sender_id,
      last_sender.username AS last_message_sender_username,
      COALESCE(unread.unread_count, 0)::int AS unread_count,
      COUNT(*) OVER()::int AS total_count
    FROM conversation c
    JOIN conversation_participant current_participant
      ON current_participant.conversation_id = c.cid
    LEFT JOIN mission mission_details
      ON mission_details.mid = c.mission_id
    LEFT JOIN LATERAL (
      SELECT
        u.uid,
        u.username,
        u.avatar
      FROM conversation_participant other_participant
      JOIN app_user u ON u.uid = other_participant.user_id
      WHERE other_participant.conversation_id = c.cid
        AND other_participant.user_id <> $1
      ORDER BY other_participant.joined_at ASC
      LIMIT 1
    ) other_user ON c.type = 'private'
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS participant_count
      FROM conversation_participant participant
      WHERE participant.conversation_id = c.cid
        AND participant.left_at IS NULL
        AND participant.can_send = TRUE
        AND participant.history_until IS NULL
    ) participant_summary ON true
    LEFT JOIN LATERAL (
      SELECT m.*
      FROM conversation_message m
      WHERE m.conversation_id = c.cid
        AND (
          current_participant.history_until IS NULL
          OR m.created_at <= current_participant.history_until
        )
      ORDER BY m.created_at DESC, m.mid DESC
      LIMIT 1
    ) last_message ON true
    LEFT JOIN app_user last_sender
      ON last_sender.uid = last_message.sender_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS unread_count
      FROM conversation_message cm
      WHERE cm.conversation_id = c.cid
        AND cm.sender_id <> $1
        AND cm.created_at > current_participant.last_read_at
        AND (
          current_participant.history_until IS NULL
          OR cm.created_at <= current_participant.history_until
        )
    ) unread ON true
    WHERE current_participant.user_id = $1
      AND current_participant.left_at IS NULL
      AND c.type <> 'dispute'
      AND (
        c.type <> 'mission'
        OR mission_details.owner_id = $1
        OR EXISTS (
          SELECT 1
          FROM mission_participation mp
          WHERE mp.mid = c.mission_id
            AND mp.adventurer_id = $1
        )
      )
    ORDER BY
      last_message.created_at DESC NULLS LAST,
      c.created_at DESC,
      c.cid DESC
  `;

  return executePaginatedQuery(query, [userId], pagination);
};

// Find private
export const findPrivateConversation = async (
  userAId,
  userBId,
  client = pool,
) => {
  const query = `
    SELECT c.*
    FROM conversation c
    JOIN conversation_participant cp1
      ON cp1.conversation_id = c.cid
    JOIN conversation_participant cp2
      ON cp2.conversation_id = c.cid
    WHERE c.type = 'private'
      AND c.closed_at IS NULL
      AND cp1.user_id = $1
      AND cp1.left_at IS NULL
      AND cp2.user_id = $2
      AND cp2.left_at IS NULL
    LIMIT 1
  `;

  const result = await client.query(query, [userAId, userBId]);
  return result.rows[0];
};

/// UPDATES
// Closes conversation by id
export const closeById = async (conversationId, client = pool) => {
  const result = await client.query(
    `UPDATE conversation SET closed_at = CURRENT_TIMESTAMP
     WHERE cid = $1 AND closed_at IS NULL RETURNING *`,
    [conversationId],
  );
  return result.rows[0] || null;
};

// Closes conversation by mid
export const closeByMid = async (missionId, client = pool) => {
  const query = `
    UPDATE conversation
    SET closed_at = CURRENT_TIMESTAMP
    WHERE mission_id = $1
      AND type = 'mission'
      AND closed_at IS NULL
    RETURNING *
  `;

  const result = await client.query(query, [missionId]);
  return result.rows[0] || null;
};
