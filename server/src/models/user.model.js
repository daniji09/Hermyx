import { USER_STATUS } from '@hermyx/shared';
import pool from '../config/db.config.js';
import { executePaginatedQuery } from '../utils/pagination.util.js';

/// CREATES
// Creates new user
export const create = async (email, username, firebaseUid, termsVersion) => {
  const query =
    'INSERT INTO app_user(email, username, firebase_uid, terms_version, terms_accepted_at) VALUES($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *';
  const result = await pool.query(query, [
    email,
    username,
    firebaseUid,
    termsVersion,
  ]);
  return result.rows[0];
};

/// FINDS
// Get user by uid
export const findByUid = async (uid, client = pool) => {
  const query = 'SELECT * FROM app_user WHERE uid = $1';
  const result = await client.query(query, [uid]);
  return result.rows[0];
};

// Get users by uid for update
export const findAllByUidForUpdate = async (uids, client = pool) => {
  const uidsArray = Array.isArray(uids) ? uids : [uids];
  const query =
    'SELECT uid FROM app_user WHERE uid = ANY($1::int[]) ORDER BY uid FOR UPDATE';
  const result = await client.query(query, [uidsArray]);
  return result.rows;
};

// Get user by username
export const findByUsername = async (username) => {
  const query =
    'SELECT * FROM app_user WHERE LOWER(username) = LOWER($1) AND status = $2';
  const result = await pool.query(query, [username, USER_STATUS.ACTIVE.ID]);
  return result.rows[0];
};

// Gets user by username excluding current user
export const findByUsernameExcludingUid = async (username, uid) => {
  const query =
    'SELECT * FROM app_user WHERE username = $1 AND uid <> $2 AND status = $3';
  const result = await pool.query(query, [
    username,
    uid,
    USER_STATUS.ACTIVE.ID,
  ]);
  return result.rows[0];
};

// Get user by email
export const findByEmail = async (email) => {
  const query = 'SELECT * FROM app_user WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

// Get user by Firebase UID
export const findByFirebaseUid = async (firebaseUid) => {
  const query = 'SELECT * FROM app_user WHERE firebase_uid = $1';
  const result = await pool.query(query, [firebaseUid]);
  return result.rows[0];
};

// Gets location by Uid
export const findLocationByUid = async (uid) => {
  const query = `SELECT 
    ST_Y(location::geometry) as latitude, 
    ST_X(location::geometry) as longitude
    FROM app_user
    WHERE uid = $1`;
  const result = await pool.query(query, [uid]);
  return result.rows[0];
};

// Searches usernames by partial match
export const searchByUsername = async ({
  username = undefined,
  excludedUid = undefined,
  pagination,
}) => {
  // COUNT(*) OVER() allows to count all rows that meet the condition without taking into account LIMIT and with no aggregation
  let query = `SELECT uid, username, description, avatar, name, surnames, COUNT(*) OVER() AS total_count
    FROM app_user 
    WHERE uid <> $1 AND status = $2`;
  const values = [excludedUid, USER_STATUS.ACTIVE.ID];

  if (username) {
    values.push(username);
    query += ` AND unaccent(username) ILIKE unaccent('%' || $${values.length} || '%')`;
  }
  query += ` ORDER BY name DESC`;
  return await executePaginatedQuery(query, values, pagination);
};

/// UPDATES
// Updates user
export const update = async (
  uid,
  { username, name, surnames, description, latitude, longitude },
) => {
  if (!latitude || !longitude) {
    const query = `
    UPDATE app_user
    SET
      username = $1,
      name = $2,
      surnames = $3,
      description = $4,
      location = NULL
    WHERE uid = $5
    RETURNING *
  `;
    const result = await pool.query(query, [
      username,
      name,
      surnames,
      description,
      uid,
    ]);
    return result.rows[0];
  } else {
    const query = `
    UPDATE app_user
    SET
      username = $1,
      name = $2,
      surnames = $3,
      description = $4,
      location = ST_MakePoint($6, $7)::geography
    WHERE uid = $5
    RETURNING *
  `;
    const result = await pool.query(query, [
      username,
      name,
      surnames,
      description,
      uid,
      longitude,
      latitude,
    ]);
    return result.rows[0];
  }
};

// Updates user' avatar
export const updateAvatarByUid = async (uid, avatar) => {
  const query = `UPDATE app_user SET avatar = $1 WHERE uid = $2`;
  const result = await pool.query(query, [avatar, uid]);
  return result.rowCount;
};

// Updates user's email
export const updateEmailByUid = async (uid, email) => {
  const query = 'UPDATE app_user SET email = $1 WHERE uid = $2 RETURNING *';
  const result = await pool.query(query, [email, uid]);
  return result.rows[0];
};

// Updates user's configuration
export const updateConfigurationByUid = async (uid, configuration) => {
  const query =
    'UPDATE app_user SET configuration = $2 WHERE uid = $1 RETURNING *';
  const result = await pool.query(query, [uid, configuration]);
  return result.rows[0];
};

// Updates user's Stripe customer id
export const updateStripeCustomerIdByUid = async (uid, stripeCustomerId) => {
  const query = 'UPDATE app_user SET stripe_customer_id = $1 WHERE uid = $2';
  await pool.query(query, [stripeCustomerId, uid]);
};

// Updates user's Stripe connected id
export const updateStripeConnectedByUid = async (uid, stripeConnectedId) => {
  const query =
    'UPDATE app_user SET stripe_connected_id = $1 WHERE uid = $2 AND stripe_connected_id IS NULL';
  await pool.query(query, [stripeConnectedId, uid]);
};

// Updates user's rating
export const updateRating = async (uid, client = pool) => {
  const result = await client.query(
    `UPDATE app_user
     SET rating = COALESCE((
       WITH all_ratings AS (
         -- As collaborator
         SELECT r.rating
         FROM mission_participation mp
         JOIN review r ON r.id = mp.owner_review_id
         WHERE mp.adventurer_id = $1
         UNION ALL
         -- As applicant
         SELECT r.rating
         FROM mission_participation mp
         JOIN mission m ON m.mid = mp.mid
         JOIN review r ON r.id = mp.adventurer_review_id
         WHERE m.owner_id = $1
       )
       SELECT ROUND(AVG(rating)::numeric, 2) FROM all_ratings
     ), 0)
     WHERE uid = $1 RETURNING rating`,
    [uid],
  );
  return result.rows[0]?.rating;
};

// Anonymize user info
export const anonymize = async (uid, client = pool) => {
  const query = `UPDATE app_user SET
  username = SUBSTRING('Del_' || $1::text, 1, 20),
  email = 'deleted_' || $1 || '@hermyx.deleted',
  firebase_uid = 'deleted_' || $1,
  description = NULL,
  name = NULL,
  surnames = NULL,
  location = NULL,
  avatar = NULL,
  rating = 0,
  stripe_customer_id = NULL,
  stripe_connected_id = NULL,
  status = $2
  WHERE uid = $1
  `;
  const result = await client.query(query, [uid, USER_STATUS.DELETED.ID]);
  return result.rowCount;
};

// Bans user from application
export const ban = async (uid) => {
  const query = `UPDATE app_user SET status = $1, avatar = NULL WHERE uid = $2 AND status = $3 RETURNING *`;
  const result = await pool.query(query, [
    USER_STATUS.BANNED.ID,
    uid,
    USER_STATUS.ACTIVE.ID,
  ]);
  return result.rows[0];
};
