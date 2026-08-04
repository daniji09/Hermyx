import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
  const { ADMIN_FIREBASE_UID } = await import('../src/config/config.js');
  const { default: pool } = await import('../src/config/db.config.js');
  const scriptPath = path.resolve(__dirname, '../database/01_schema.sql');
  const schemaSql = fs.readFileSync(scriptPath, 'utf8');

  try {
    // BD Schema is created
    console.log('Executing database script...');
    await pool.query(schemaSql);

    // First admin user is introduced
    console.log('Inserting initial Admin user...');
    const adminUid = ADMIN_FIREBASE_UID || '--error--';
    const insertAdminQuery = `INSERT INTO app_user(username, email, firebase_uid, role, description, name, surnames, status)
    VALUES('admin', 'admin@hermyx.com', $1, 'ADMIN', 'Hermyx admin account.', 'Hermyx', 'admin', 'ACTIVE')
    ON CONFLICT (firebase_uid) DO NOTHING;`;
    await pool.query(insertAdminQuery, [adminUid]);

    console.log('Database successfully synchronized and seeded!');
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
