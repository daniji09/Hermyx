import { messages } from '@hermyx/shared';
import firebaseAdmin from '../config/firebase.config.js';
import { FIREBASE_API_KEY } from '../config/config.js';

// Creates a user in Firebase
export const createFirebaseUser = async (user) => {
  // Creates Firebase user
  const firebaseUser = await firebaseAdmin.auth().createUser({
    email: user.email,
    password: user.password,
    displayName: user.username,
    emailVerified: true,
  });

  // If Firebase user is not received, it returns the error
  if (!firebaseUser)
    throw {
      errors: { general: [messages.AUTH.SIGNUP.COULD_NOT_CREATE_NEW_ACCOUNT] },
    };

  return firebaseUser;
};

// Signs in user in Firebase via their API REST
export const firebaseSignIn = async (email, password) => {
  const apiKey = FIREBASE_API_KEY;
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const firebaseErrorMessage = data.error?.message || 'UNKNOWN_ERROR';
    const error = new Error(messages.GENERAL.FIREBASE_AUTH_ERROR);
    error.code = `auth/${firebaseErrorMessage.toLowerCase().replace(/_/g, '-')}`;
    throw error;
  }

  return data;
};

// Creates custom token for frontend
export const createCustomToken = async (id) => {
  return await firebaseAdmin.auth().createCustomToken(id);
};

// Verifies id token in Firebase
export const verifyIdToken = async (token, checkRevoked) => {
  return await firebaseAdmin.auth().verifyIdToken(token, checkRevoked);
};

// Gets Firebase auth providers
export const getFirebaseAuthProviders = async (firebaseUid) => {
  const firebaseUser = await firebaseAdmin.auth().getUser(firebaseUid);
  const providers = (firebaseUser.providerData || []).map((p) => p.providerId);

  return {
    providers,
    hasGoogleAccountLinked: providers.includes('google.com'),
    hasEmailPasswordCredential: providers.includes('password'),
  };
};

// Gets user by email
export const getUserByEmail = async (email) => {
  return await firebaseAdmin.auth().getUserByEmail(email);
};

// Updates firebase account
export const updateFirebaseAccount = async (firebaseUid, updates) => {
  return await firebaseAdmin.auth().updateUser(firebaseUid, updates);
};

// Disables user
export const disableUser = async (firebaseUid) => {
  return await firebaseAdmin.auth().updateUser(firebaseUid, { disabled: true });
};

// Enables user
export const enableUser = async (firebaseUid) => {
  return await firebaseAdmin
    .auth()
    .updateUser(firebaseUid, { disabled: false });
};

// Revokes tokens from user
export const revokeTokens = async (firebaseUid) => {
  return await firebaseAdmin.auth().revokeRefreshTokens(firebaseUid);
};

// Deletes a user in Firebase
export const deleteFirebaseUser = async (uid) => {
  return await firebaseAdmin.auth().deleteUser(uid);
};
