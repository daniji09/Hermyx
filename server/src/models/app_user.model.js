const pool = require("../config/db.config");

//Get the user by their ID
const getById = async (uid) => {
  const query = "SELECT * FROM app_user WHERE uid = $1";
  const result = await pool.query(query, [uid]);
  return result.rows[0];
};

//Save the Stripe Customer ID in the user table.
const updateStripeCustomer = async (uid, stripeCustomerId) => {
  const query = "UPDATE app_user SET stripe_customer_id = $1 WHERE uid = $2";
  await pool.query(query, [stripeCustomerId, uid]);
};

//Saves the Stripe Connect Account ID in the user table.
const updateStripeConnected = async (uid, stripeConnectedId) => {
  const query = "UPDATE app_user SET stripe_connected_id = $1 WHERE uid = $2";
  await pool.query(query, [stripeConnectedId, uid]);
};

//Get the user by their email
const getByEmail = async (email) => {
  const query = "SELECT * FROM app_user WHERE email = $1";
  const result = await pool.query(query, [email]);
  return result.rows[0];
};

module.exports = {
  getById,
  updateStripeCustomer,
  updateStripeConnectId: updateStripeConnected,
  getByEmail,
};
