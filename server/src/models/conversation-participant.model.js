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

// Creates mission type
export const createMissionType = async (missionId, userId, client = pool) => {
  const query = `
    INSERT INTO conversation_participant (conversation_id, user_id)
    SELECT cid, $2
    FROM conversation
    WHERE mission_id = $1
      AND type = 'mission'
    ON CONFLICT (conversation_id, user_id) DO UPDATE
    SET joined_at = CURRENT_TIMESTAMP,
        left_at = NULL,
        can_send = TRUE,
        history_until = NULL,
        last_read_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  const result = await client.query(query, [missionId, userId]);
  return result.rows[0] || null;
};

// Add participants into private conversation
export const addPrivateConversationParticipants = async (
  conversationId,
  userAId,
  userBId,
  client = pool,
) => {
  const query = `
    INSERT INTO conversation_participant (conversation_id, user_id)
    VALUES ($1, $2), ($1, $3)
  `;

  await client.query(query, [conversationId, userAId, userBId]);
};

/// SELECTS
// Find all by conversation id
export const findByAllByCid = async (
  conversationId,
  userId = null,
  client = pool,
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

  const result = await client.query(query, [conversationId, userId]);
  return result.rows;
};

// Finds active conversation participants by conversation id
export const findActiveIdsByConversationId = async (
  conversationId,
  client = pool,
) => {
  const query = `
    SELECT user_id
    FROM conversation_participant
    WHERE conversation_id = $1
      AND left_at IS NULL
      AND can_send = TRUE
      AND history_until IS NULL
  `;

  const result = await client.query(query, [conversationId]);
  return result.rows.map((participant) => participant.user_id);
};

// Checks if a user is participant of a conversation
export const isConversationParticipant = async (
  conversationId,
  userId,
  client = pool,
) => {
  const query = `
    SELECT 1
    FROM conversation_participant
    WHERE conversation_id = $1
      AND user_id = $2
      AND left_at IS NULL
    LIMIT 1
  `;

  const result = await client.query(query, [conversationId, userId]);
  return result.rowCount > 0;
};

// Checks if user can send message to conversation
export const canSendMessageToConversation = async (
  conversationId,
  userId,
  client = pool,
) => {
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

  const result = await client.query(query, [conversationId, userId]);
  return result.rowCount > 0;
};

/// UPDATES
// Mission conversation left by user
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

// Mission conversation freezed for user
export const freezeMissionConversationHistory = async (
  missionId,
  userId,
  client = pool,
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

  const result = await client.query(query, [missionId, userId]);
  return result.rows[0] || null;
};

// Marks conversation as read by user id
export const markConversationAsReadByUserId = async (
  conversationId,
  userId,
  client = pool,
) => {
  const query = `
    UPDATE conversation_participant
    SET last_read_at = clock_timestamp()
    WHERE conversation_id = $1
      AND user_id = $2
      AND left_at IS NULL
    RETURNING conversation_id
  `;

  const result = await client.query(query, [conversationId, userId]);
  return result.rowCount > 0;
};

// Disable participants
export const disableConversationParticipants = async (
  conversationId,
  client = pool,
) => {
  const result = await client.query(
    `UPDATE conversation_participant SET can_send = FALSE
     WHERE conversation_id = $1 AND left_at IS NULL RETURNING *`,
    [conversationId],
  );
  return result.rows;
};

// Removes a user from all conversations
export const removeUserFromAll = async (uid, client = pool) => {
  // User leaves all chats
  await client.query(
    `UPDATE conversation_participant SET left_at = NOW(), can_send = false WHERE user_id = $1 AND left_at IS NULL`,
    [uid],
  );

  // Writing for other person is blocked
  await client.query(
    `
    UPDATE conversation_participant SET can_send = false
    WHERE conversation_id IN (
      SELECT cp.conversation_id FROM conversation_participant cp
      JOIN conversation c ON c.cid = cp.conversation_id
      WHERE cp.user_id = $1 AND c.type = 'private'
    ) AND user_id <> $1 AND left_at IS NULL
  `,
    [uid],
  );

  // Chat is closed
  await client.query(
    `
    UPDATE conversation SET closed_at = NOW()
    WHERE type = 'private' AND closed_at IS NULL AND cid IN (
      SELECT conversation_id FROM conversation_participant WHERE user_id = $1
    )
  `,
    [uid],
  );
};
