import pool from '../config/db.config.js';

export const create = async (
  {
    conversationId,
    senderId,
    content,
    attachmentUrl = null,
    attachmentType = null,
  },
  client = pool,
) => {
  const query = `
    WITH inserted_message AS (
      INSERT INTO conversation_message (
        conversation_id,
        sender_id,
        content,
        attachment_url,
        attachment_type,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, clock_timestamp())
      RETURNING *
    )
    SELECT
      m.mid,
      m.conversation_id,
      m.sender_id,
      m.content,
      m.attachment_url,
      m.attachment_type,
      m.created_at,
      c.type AS conversation_type,
      r.rid AS report_id,
      u.username AS sender_username,
      u.avatar AS sender_avatar
    FROM inserted_message m
    JOIN conversation c ON c.cid = m.conversation_id
    LEFT JOIN report r ON r.conversation_id = c.cid
    JOIN app_user u ON u.uid = m.sender_id
  `;

  const result = await client.query(query, [
    conversationId,
    senderId,
    content,
    attachmentUrl,
    attachmentType,
  ]);
  return result.rows[0];
};

export const findByConversationId = async (
  conversationId,
  userId,
  client = pool,
) => {
  const query = `
    SELECT
      m.mid,
      m.conversation_id,
      m.sender_id,
      m.content,
      m.attachment_url,
      m.attachment_type,
      m.created_at,
      c.type AS conversation_type,
      r.rid AS report_id,
      u.username AS sender_username,
      u.avatar AS sender_avatar
    FROM conversation_message m
    JOIN conversation_participant cp
      ON cp.conversation_id = m.conversation_id
      AND cp.user_id = $2
      AND cp.left_at IS NULL
    JOIN conversation c ON c.cid = m.conversation_id
    LEFT JOIN report r ON r.conversation_id = c.cid
    JOIN app_user u ON u.uid = m.sender_id
    WHERE m.conversation_id = $1
      AND (
        cp.history_until IS NULL
        OR m.created_at <= cp.history_until
      )
    ORDER BY m.created_at ASC
  `;

  const result = await client.query(query, [conversationId, userId]);
  return result.rows;
};

export const countUnreadByUserId = async (
  userId,
  conversationType = null,
  excludedConversationType = null,
  client = pool,
) => {
  const query = `
    SELECT COUNT(*)::int AS unread_count
    FROM conversation_participant cp
    JOIN conversation c
      ON c.cid = cp.conversation_id
    JOIN conversation_message m
      ON m.conversation_id = cp.conversation_id
    WHERE cp.user_id = $1
      AND cp.left_at IS NULL
      AND m.sender_id <> $1
      AND m.created_at > cp.last_read_at
      AND (
        cp.history_until IS NULL
        OR m.created_at <= cp.history_until
      )
      AND ($2::varchar IS NULL OR c.type = $2)
      AND ($3::varchar IS NULL OR c.type <> $3)
  `;

  const result = await client.query(query, [
    userId,
    conversationType,
    excludedConversationType,
  ]);
  return result.rows[0].unread_count;
};
