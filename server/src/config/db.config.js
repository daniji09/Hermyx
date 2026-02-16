// External modules
import { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } from './config.js';
import { Pool } from 'pg';

// Pool connection configuration
const pool = new Pool({
  user: DB_USER,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
});

// To check whether the connection was successful or not
pool.on('connect', () => {
  console.log('Connected to Hermyx Database successfully');
});

pool.on('error', (err) => {
  console.error('Error connecting to Hermyx Database: ', err);
});

export default pool;
