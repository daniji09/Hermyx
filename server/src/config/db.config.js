// External modules
import {
  DB_USER,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  DB_TEST_NAME,
  DB_NAME,
} from './config.js';
import { Pool } from 'pg';

const isTesting = process.env.NODE_ENV === 'test';
const dbName = isTesting ? DB_TEST_NAME : DB_NAME;

// Pool connection configuration
const pool = new Pool({
  user: DB_USER,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: DB_PORT,
  database: dbName,
  ssl: {
    rejectUnauthorized: false, // It allows to connect with Azure certificate
  },
});

// To check whether the connection was successful or not
pool.on('connect', () => {
  console.log(`Connected to Hermyx Database successfully`);
});

pool.on('error', (err) => {
  console.error('Error connecting to Hermyx Database: ', err);
});

export default pool;
