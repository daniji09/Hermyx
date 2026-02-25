import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';

export async function setup() {
  try {
    // Pool is imported dynamically so .env is loaded previously
    const { default: pool } = await import('../src/config/db.config.js');

    // SQL db creation script is read
    const scriptPath = path.resolve(__dirname, '../database/01_schema.sql');
    const schemaSql = fs.readFileSync(scriptPath, 'utf8');

    // Db creation script is executed
    await pool.query(schemaSql);
  } catch (error) {
    console.error('Error creating test database:', error);
    process.exit(1); // Stops testing if db couldn't be created
  }
}
