import dotenv from 'dotenv';
dotenv.config();

import * as userService from '../src/services/user.service.js';
import admin from '../src/config/firebase.config.js';
import { ADMIN_FIREBASE_UID } from '../src/config/config.js';
import { USER_ROLE } from '@hermyx/shared';

async function grantAdminRole() {
  const targetUid = process.argv[2] || ADMIN_FIREBASE_UID;

  if (!targetUid) {
    console.error(
      'Error: provide a Firebase UID with `npm run firebase:admin -- <FIREBASE_UID>` or define ADMIN_FIREBASE_UID in .env.',
    );
    process.exit(1);
  }

  try {
    // Checks if admin exists on Firebase
    await admin.auth().getUser(targetUid);

    // Injects claim custom
    await admin.auth().setCustomUserClaims(targetUid, { admin: true });

    try {
      // Gets user and updates its role
      const user = await userService.getUserByFirebaseUid(targetUid);
      const result = await userService.updateUserRole(
        user.uid,
        USER_ROLE.ADMIN.ID,
      );

      if (result < 1) throw new Error(`Couldn't update user's role in DB.`);

      console.log(
        `Success: User ${targetUid} promoted to ADMIN in both systems.`,
      );
      process.exit(0);
    } catch (dbError) {
      // SAGA
      console.error(
        'DB update failed. Rolling back Firebase claims...',
        dbError.message,
      );
      await admin.auth().setCustomUserClaims(targetUid, null);
      process.exit(1);
    }
  } catch (firebaseError) {
    console.error('❌ Firebase operation failed:', firebaseError.message);
    process.exit(1);
  }
}

grantAdminRole();
