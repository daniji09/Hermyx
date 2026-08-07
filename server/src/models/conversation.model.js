import pool from '../config/db.config.js';
import {
  addConversationParticipant,
  addPrivateConversationParticipants,
} from './conversation-participant.model.js';

export const findPrivateConversation = async (userAId, userBId) => {
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

  const result = await pool.query(query, [userAId, userBId]);
  return result.rows[0];
};

export const createPrivateConversation = async (userAId, userBId) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const conversationQuery = `
      INSERT INTO conversation (type)
      VALUES ('private')
      RETURNING *
    `;

    const conversationResult = await client.query(conversationQuery);
    const conversation = conversationResult.rows[0];

    await addPrivateConversationParticipants(
      conversation.cid,
      userAId,
      userBId,
      client,
    );

    await client.query('COMMIT');

    return conversation;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getOrCreatePrivateConversation = async (userAId, userBId) => {
  const existingConversation = await findPrivateConversation(userAId, userBId);

  if (existingConversation) {
    return existingConversation;
  }

  return createPrivateConversation(userAId, userBId);
};

export const createMissionConversation = async (
  missionId,
  ownerId,
  database = pool,
) => {
  const conversationQuery = `
    INSERT INTO conversation (type, mission_id)
    VALUES ('mission', $1)
    ON CONFLICT (mission_id) DO UPDATE
      SET mission_id = EXCLUDED.mission_id
    RETURNING *
  `;
  const conversationResult = await database.query(conversationQuery, [
    missionId,
  ]);
  const conversation = conversationResult.rows[0];

  await addConversationParticipant(conversation.cid, ownerId, database);

  return conversation;
};

export const closeMissionConversation = async (missionId, database = pool) => {
  const query = `
    UPDATE conversation
    SET closed_at = CURRENT_TIMESTAMP
    WHERE mission_id = $1
      AND type = 'mission'
      AND closed_at IS NULL
    RETURNING *
  `;

  const result = await database.query(query, [missionId]);
  return result.rows[0] || null;
};

export const getConversationById = async (conversationId) => {
  const query = `
    SELECT
      c.*,
      m.title AS mission_title
    FROM conversation c
    LEFT JOIN mission m ON m.mid = c.mission_id
    WHERE c.cid = $1
  `;
  const result = await pool.query(query, [conversationId]);
  return result.rows[0];
};

export const getConversationsByUserId = async (userId) => {
  const query = `
    SELECT
      c.cid,
      c.type,
      c.mission_id,
      c.created_at,
      c.closed_at,
      current_participant.can_send,
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
      last_sender.username AS last_message_sender_username
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
        AND other_participant.left_at IS NULL
      ORDER BY other_participant.joined_at ASC
      LIMIT 1
    ) other_user ON c.type = 'private'
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS participant_count
      FROM conversation_participant participant
      WHERE participant.conversation_id = c.cid
        AND participant.left_at IS NULL
    ) participant_summary ON true
    LEFT JOIN LATERAL (
      SELECT m.*
      FROM conversation_message m
      WHERE m.conversation_id = c.cid
      ORDER BY m.created_at DESC
      LIMIT 1
    ) last_message ON true
    LEFT JOIN app_user last_sender
      ON last_sender.uid = last_message.sender_id
    WHERE current_participant.user_id = $1
      AND current_participant.left_at IS NULL
    ORDER BY last_message.created_at DESC NULLS LAST, c.created_at DESC
  `;

  const result = await pool.query(query, [userId]);
  return result.rows;
};
