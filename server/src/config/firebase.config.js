import admin from 'firebase-admin';

let serviceAccount;

if (process.env.FIREBASE_CREDENTIALS) {
  serviceAccount = JSON.parse(process.env.FIREBASE_JSON);
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
