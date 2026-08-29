import dotenv from 'dotenv';
dotenv.config();

import admin from '../src/config/firebase.config.js';
import { ADMIN_FIREBASE_UID } from '../src/config/config.js';

async function grantAdminRole() {
  // Firebase uid that will be granted an admin role
  const targetUid = process.argv[2] || ADMIN_FIREBASE_UID;

  if (!targetUid) {
    console.error(
      'Error: provide a Firebase UID with `npm run firebase:admin -- <FIREBASE_UID>` or define ADMIN_FIREBASE_UID in .env.',
    );
    process.exit(1);
  }

  try {
    // Checks that the user actually exists on Firebase
    await admin.auth().getUser(targetUid);

    // Injects Custom Claim
    await admin.auth().setCustomUserClaims(targetUid, { admin: true });

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
