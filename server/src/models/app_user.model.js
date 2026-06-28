import pool from '../config/db.config.js';

//Get the user by their ID
export const getById = async (uid) => {
  const query = 'SELECT * FROM app_user WHERE uid = $1';
  const result = await pool.query(query, [uid]);
  return result.rows[0];
};

//Save the Stripe Customer ID in the user table.
export const updateStripeCustomer = async (uid, stripeCustomerId) => {
  const query = 'UPDATE app_user SET stripe_customer_id = $1 WHERE uid = $2';
  await pool.query(query, [stripeCustomerId, uid]);
};

//Saves the Stripe Connect Account ID in the user table.
export const updateStripeConnected = async (uid, stripeConnectedId) => {
  const query = 'UPDATE app_user SET stripe_connected_id = $1 WHERE uid = $2';
  await pool.query(query, [stripeConnectedId, uid]);
};

//Get the user by their email
export const getByEmail = async (email) => {
  const query = 'SELECT * FROM app_user WHERE email = $1';
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

// Get user by username
export const getByUsername = async (username) => {
  const query = 'SELECT * FROM app_user WHERE username = $1';
  const result = await pool.query(query, [username]);
  return result.rows[0];
};

export const searchByUsername = async (username) => {
  const query = `
    SELECT uid, username, email, avatar, name, surnames
    FROM app_user
    WHERE unaccent(username) ILIKE unaccent('%' || $1 || '%')
    ORDER BY username ASC
    LIMIT 10
  `;
  const result = await pool.query(query, [username]);
  return result.rows;
};

// Creates new user
export const create = async (email, username, firebaseUid) => {
  const query =
    'INSERT INTO app_user(email, username, firebase_uid) VALUES($1, $2, $3) RETURNING *';
  const result = await pool.query(query, [email, username, firebaseUid]);
  return result.rows[0];
};

// Get user by Firebase ID
export const getByFirebaseUid = async (firebaseUid) => {
  const query = 'SELECT * FROM app_user WHERE firebase_uid = $1';
  const result = await pool.query(query, [firebaseUid]);
  return result.rows[0];
};

export const getByUsernameExcludingUid = async (username, uid) => {
  const query = 'SELECT * FROM app_user WHERE username = $1 AND uid <> $2';
  const result = await pool.query(query, [username, uid]);
  return result.rows[0];
};

export const updateMyProfile = async (
  uid,
  { username, name, surnames, description },
) => {
  const query = `
    UPDATE app_user
    SET
      username = $1,
      name = $2,
      surnames = $3,
      description = $4
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
};

export const updateUserEmail = async (uid, email) => {
  const query = 'UPDATE app_user SET email = $1 WHERE uid = $2 RETURNING *';
  const result = await pool.query(query, [email, uid]);
  return result.rows[0];
};

export const deleteByUid = async (uid) => {
  const query = 'DELETE * FROM app_user WHERE uid = $1';
  const result = await pool.query(query, [uid]);
  return result.rows[0];
};

export const anonymize = async (uid) => {
  const query = `UPDATE app_user SET
  username = '?Unknown_' || $1,
  email = 'deleted_' || $1 || '@hermyx.deleted',
  firebase_uid = 'deleted_' || $1,
  description = NULL,
  name = NULL,
  surnames = NULL,
  location = NULL
  WHERE uid = $1
  `;
  const result = await pool.query(query, [uid]);
  return result.rowCount;
};

export const deanonymize = async (user) => {
  const query = `UPDATE app_user SET
  username = $2,
  email = $3,
  firebase_uid = $4,
  description = $5,
  name = $6,
  surnames = $7,
  location = $8
  WHERE uid = $1
  `;
  const result = await pool.query(query, [
    user.uid,
    user.username,
    user.email,
    user.firebase_uid,
    user.description,
    user.name,
    user.surnames,
    user.location,
  ]);
  return result.rows[0];
};
