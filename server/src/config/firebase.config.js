import admin from 'firebase-admin';
import { FIREBASE_JSON } from './config.js';

let serviceAccount;

if (FIREBASE_JSON) {
  serviceAccount = JSON.parse(FIREBASE_JSON);
} else {
  const module = await import('./firebase-service-account.json', {
    with: { type: 'json' },
  });
  serviceAccount = module.default;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
