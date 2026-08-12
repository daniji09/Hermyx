import pool from '../config/db.config.js';

/// INSERTS
// Create
export const create = async (conversationId, userId, client = pool) => {
  const query = `
    INSERT INTO conversation_participant (conversation_id, user_id)
    VALUES ($1, $2)
    ON CONFLICT (conversation_id, user_id) DO NOTHING
    RETURNING *
  `;

  const result = await client.query(query, [conversationId, userId]);
  return result.rows[0];
};

/// UPDATES
export const leaveMissionConversation = async (
  missionId,
  userId,
  client = pool,
) => {
  const query = `
    UPDATE conversation_participant cp
    SET
      left_at = CURRENT_TIMESTAMP,
      can_send = FALSE
    FROM conversation c
    WHERE cp.conversation_id = c.cid
      AND c.mission_id = $1
      AND c.type = 'mission'
      AND cp.user_id = $2
      AND cp.left_at IS NULL
    RETURNING cp.*
  `;

  const result = await client.query(query, [missionId, userId]);
  return result.rows[0] || null;
};

// ------

export const addPrivateConversationParticipants = async (
  conversationId,
  userAId,
  userBId,
  database = pool,
) => {
  const query = `
    INSERT INTO conversation_participant (conversation_id, user_id)
    VALUES ($1, $2), ($1, $3)
  `;

  await database.query(query, [conversationId, userAId, userBId]);
};

export const addMissionConversationParticipant = async (
  missionId,
  userId,
  database = pool,
) => {
  const query = `
    INSERT INTO conversation_participant (conversation_id, user_id)
    SELECT cid, $2
    FROM conversation
    WHERE mission_id = $1
      AND type = 'mission'
    ON CONFLICT (conversation_id, user_id) DO NOTHING
    RETURNING *
  `;

  const result = await database.query(query, [missionId, userId]);
  return result.rows[0] || null;
};

export const freezeMissionConversationHistory = async (
  missionId,
  userId,
  database = pool,
) => {
  const query = `
    UPDATE conversation_participant cp
    SET
      can_send = FALSE,
      history_until = clock_timestamp()
    FROM conversation c
    WHERE cp.conversation_id = c.cid
      AND c.mission_id = $1
      AND c.type = 'mission'
      AND cp.user_id = $2
      AND cp.left_at IS NULL
    RETURNING cp.*
  `;

  const result = await database.query(query, [missionId, userId]);
  return result.rows[0] || null;
};

export const getConversationParticipants = async (
  conversationId,
  userId = null,
) => {
  const query = `
    SELECT
      u.uid,
      u.username,
      u.avatar,
      cp.joined_at,
      cp.left_at,
      cp.can_send,
      cp.history_until
    FROM conversation_participant cp
    LEFT JOIN conversation_participant viewer
      ON viewer.conversation_id = cp.conversation_id
      AND viewer.user_id = $2
    JOIN app_user u ON u.uid = cp.user_id
    WHERE cp.conversation_id = $1
      AND cp.left_at IS NULL
      AND (
        $2::int IS NULL
        OR (
          viewer.left_at IS NULL
          AND (
            viewer.history_until IS NULL
            OR cp.joined_at <= viewer.history_until
          )
        )
      )
      AND (
        $2::int IS NULL
        OR viewer.history_until IS NOT NULL
        OR cp.history_until IS NULL
        OR cp.user_id = $2
      )
    ORDER BY cp.joined_at ASC
  `;

  const result = await pool.query(query, [conversationId, userId]);
  return result.rows;
};

export const isConversationParticipant = async (conversationId, userId) => {
  const query = `
    SELECT 1
    FROM conversation_participant
    WHERE conversation_id = $1
      AND user_id = $2
      AND left_at IS NULL
    LIMIT 1
  `;

  const result = await pool.query(query, [conversationId, userId]);
  return result.rowCount > 0;
};

export const canSendMessageToConversation = async (conversationId, userId) => {
  const query = `
    SELECT 1
    FROM conversation_participant cp
    JOIN conversation c ON c.cid = cp.conversation_id
    WHERE cp.conversation_id = $1
      AND cp.user_id = $2
      AND cp.left_at IS NULL
      AND cp.can_send = TRUE
      AND c.closed_at IS NULL
    LIMIT 1
  `;

  const result = await pool.query(query, [conversationId, userId]);
  return result.rowCount > 0;
};

export const getActiveConversationParticipantIds = async (conversationId) => {
  const query = `
    SELECT user_id
    FROM conversation_participant
    WHERE conversation_id = $1
      AND left_at IS NULL
      AND can_send = TRUE
      AND history_until IS NULL
  `;

  const result = await pool.query(query, [conversationId]);
  return result.rows.map((participant) => participant.user_id);
};

export const markConversationAsReadByUserId = async (
  conversationId,
  userId,
  database = pool,
) => {
  const query = `
    UPDATE conversation_participant
    SET last_read_at = clock_timestamp()
    WHERE conversation_id = $1
      AND user_id = $2
      AND left_at IS NULL
    RETURNING conversation_id
  `;

  const result = await database.query(query, [conversationId, userId]);
  return result.rowCount > 0;
};
