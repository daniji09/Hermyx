// External modules
const CONFIG = require("./config");
const { Pool } = require("pg");

// Pool connection configuration
const pool = new Pool({
  user: CONFIG.DB_USER,
  password: CONFIG.DB_PASSWORD,
  host: CONFIG.DB_HOST,
  post: CONFIG.DB_PORT,
  database: CONFIG.DB_NAME,
});

// To check wether the connection was successful or not
pool.on("connect", () => {
  console.log("Connected to Hermyx Database successfully");
});

pool.on("error", (err) => {
  console.error("Error connecting to Hermyx Database: ", err);
});

module.exports = pool;
