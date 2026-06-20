import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
  const { default: pool } = await import('../src/config/db.config.js');
  const scriptPath = path.resolve(__dirname, '../database/01_schema.sql');
  const schemaSql = fs.readFileSync(scriptPath, 'utf8');

  try {
    console.log('Executing database script...');
    await pool.query(schemaSql);
    console.log('Database successfully synchronized!');
    process.exit(0);
  } catch (error) {
    console.error(
      'There was an error while synchronizing the database:',
      error,
    );
    process.exit(1);
  }
}
initDB();
