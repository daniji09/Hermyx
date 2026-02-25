import { messages } from '@hermyx/shared';
import firebaseAdmin from '../config/firebase.config.js';

export const createFirebaseUser = async (user) => {
  // Creates Firebase user
  const firebaseUser = await firebaseAdmin.auth().createUser({
    email: user.email,
    password: user.password,
    displayName: user.username,
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
