import { messages } from '@hermyx/shared';
import firebaseAdmin from '../config/firebase.config.js';

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
      errors: { general: [messages.COULD_NOT_CREATE_NEW_ACCOUNT] },
    };

  return firebaseUser;
};

export const deleteFirebaseUser = async (uid) => {
  await firebaseAdmin.auth().deleteUser(uid);
};

export const verifyIdToken = async (token) => {
  return await firebaseAdmin.auth().verifyIdToken(token);
};

export const getFirebaseAuthProviders = async (firebaseUid) => {
  const firebaseUser = await firebaseAdmin.auth().getUser(firebaseUid);
  const providers = (firebaseUser.providerData || []).map((p) => p.providerId);

  return {
    providers,
    hasGoogleAccountLinked: providers.includes('google.com'),
    hasEmailPasswordCredential: providers.includes('password'),
  };
};

export const updateFirebaseEmail = async (firebaseUid, email) =>
  firebaseAdmin.auth().updateUser(firebaseUid, { email });

export const updateFirebasePassword = async (firebaseUid, password) =>
  firebaseAdmin.auth().updateUser(firebaseUid, { password });
