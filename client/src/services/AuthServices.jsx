import { auth, provider } from '../config/firebase';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { consts, messages } from '@hermyx/shared';

// Signs in a user in Firebase
export const firebaseSignIn = async (email, password) => {
  try {
    // Log In is done on client with Firebase
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

    // If Firebase user is not received, it returns the error
    if (!userCredential)
      throw {
        errors: {
          general: [messages.COULD_NOT_LOG_IN],
        },
      };
    return userCredential.user;
  } catch (error) {
    // Firebase errors and exceptions are treated by a map
    const errorBuilder = consts.FIREBASE_ERRORS[error.code];
    if (errorBuilder) {
      const mappedError = errorBuilder({ email });
      if (mappedError.field === 'username' || mappedError.field === 'email')
        mappedError.field = 'usernameEmail';
      throw {
        errors: {
          [mappedError.field]: [mappedError.message],
        },
      };
    }

    throw {
      errors: {
        general: [messages.COULD_NOT_LOG_IN],
      },
    };
  }
};

// Signs in a user using Google authentication
export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    // Firebase errors and exceptions are treated by a map
    const errorBuilder = consts.FIREBASE_ERRORS[error.code];
    if (errorBuilder) {
      const mappedError = errorBuilder();
      throw {
        errors: {
          [mappedError.field]: [mappedError.message],
        },
      };
    }

    throw {
      errors: {
        general: [messages.COULD_NOT_LOG_IN],
      },
    };
  }
};
