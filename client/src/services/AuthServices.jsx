import { auth, provider } from '../config/firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  updatePassword,
  linkWithPopup,
  unlink,
} from 'firebase/auth';
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

// Updates user's password
export const updateUserPassword = async (password) => {
  try {
    const user = auth.currentUser;
    return await updatePassword(user, password);
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
        general: [messages.COULD_NOT_UPDATE_PASSWORD],
      },
    };
  }
};

// Links Google account
export const linkGoogleAccount = async () => {
  try {
    return await linkWithPopup(auth.currentUser, provider);
  } catch (error) {
    // First special error
    if (error.code === 'auth/popup-closed-by-user') {
      throw { isPopupCancel: true };
    }
    // Firebase errors and exceptions are treated by a map
    const errorBuilder = consts.FIREBASE_ERRORS[error.code];
    if (errorBuilder) {
      const mappedError = errorBuilder({ email: error.customData?.email });
      throw {
        errors: {
          general: [mappedError.message],
        },
      };
    }

    throw {
      errors: {
        general: [messages.COULD_NOT_LINK_GOOGLE_ACCOUNT],
      },
    };
  }
};

// Unlinks Google account
export const unlinkGoogleAccount = async () => {
  try {
    // To unlink a Google account, user must have provided an email authentication
    const user = auth.currentUser;
    const hasPasswordProvider = user.providerData.some(
      (p) => p.providerId === 'password',
    );
    if (!hasPasswordProvider) {
      throw {
        errors: {
          general: [
            'You must set up an email and password before unlinking your Google account.',
          ],
        },
      };
    }
    return await unlink(user, provider.providerId);
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
        general: [messages.COULD_NOT_UNLINK_GOOGLE_ACCOUNT],
      },
    };
  }
};
