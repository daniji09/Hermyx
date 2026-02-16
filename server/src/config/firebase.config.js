import admin, {
  initializeApp,
  credential as _credential,
} from 'firebase-admin';

import serviceAccount from './firebase-service-account.json';

initializeApp({
  credential: _credential.cert(serviceAccount),
});

export default admin;
