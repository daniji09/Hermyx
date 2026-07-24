import dotenv from 'dotenv';
dotenv.config();

import admin from '../src/config/firebase.config.js';
import { ADMIN_FIREBASE_UID } from '../src/config/config.js';

async function grantAdminRole() {
  // Firebase uid that will be granted an admin role
  const targetUid = process.argv[2] || ADMIN_FIREBASE_UID;

  if (!targetUid) {
    console.error('Error: you must provide a Firebase UID.');
    console.log('Usage: npm run firebase:admin -- <FIREBASE_UID>');
    console.log(
      'Alternative usage: npm run firebase:admin. Only if ADMIN_FIREBASE_UID is defined in your .env',
    );
    process.exit(1);
  }

  try {
    console.log(`Searching in Firebase user with UID: ${targetUid}...`);

    // Checks that the user actually exists on Firebase
    const userRecord = await admin.auth().getUser(targetUid);
    console.log(`Usuario found: ${userRecord.email}`);

    // Injects Custom Claim
    await admin.auth().setCustomUserClaims(targetUid, { admin: true });
    console.log(
      `User with UID ${targetUid} (${userRecord.email}) is now ADMIN on Firebase successfully.`,
    );
    console.log(
      'Log out and log in again so the token refreshes with the new role.',
    );

    process.exit(0);
  } catch (error) {
    console.error(
      'There was an error while granting admin role:',
      error.message,
    );
    process.exit(1);
  }
}

grantAdminRole();
