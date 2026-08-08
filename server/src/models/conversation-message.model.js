import pool from '../config/db.config.js';

export const createMessage = async ({
  conversationId,
  senderId,
  content,
  attachmentUrl = null,
  attachmentType = null,
}) => {
  const query = `
    WITH inserted_message AS (
      INSERT INTO conversation_message (
        conversation_id,
        sender_id,
        content,
        attachment_url,
        attachment_type
      )
      VALUES ($1, $2, $3, $4, $5)
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
      u.username AS sender_username,
      u.avatar AS sender_avatar
    FROM inserted_message m
    JOIN app_user u ON u.uid = m.sender_id
  `;

  const result = await pool.query(query, [
    conversationId,
    senderId,
    content,
    attachmentUrl,
    attachmentType,
  ]);
  return result.rows[0];
};

export const getMessagesByConversationId = async (conversationId) => {
  const query = `
    SELECT
      m.mid,
      m.conversation_id,
      m.sender_id,
      m.content,
      m.attachment_url,
      m.attachment_type,
      m.created_at,
      u.username AS sender_username,
      u.avatar AS sender_avatar
    FROM conversation_message m
    JOIN app_user u ON u.uid = m.sender_id
    WHERE m.conversation_id = $1
    ORDER BY m.created_at ASC
  `;

  const result = await pool.query(query, [conversationId]);
  return result.rows;
};

export const getUnreadMessageCountByUserId = async (userId) => {
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
  `;

  const result = await pool.query(query, [userId]);
  return result.rows[0].unread_count;
};
