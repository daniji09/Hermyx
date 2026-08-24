import { app, auth, provider } from '../config/firebase';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  applyActionCode as _applyActionCode,
  confirmPasswordReset as _confirmPasswordReset,
  getAuth,
  signInWithCustomToken as _signInWithCustomToken,
  signInWithEmailAndPassword as _signInWithEmailAndPassword,
  signInWithPopup,
  sendEmailVerification as _sendEmailVerification,
  sendPasswordResetEmail as _sendPasswordResetEmail,
  signOut as _signOut,
  reload as _reload,
  verifyPasswordResetCode as _verifyPasswordResetCode,
  updatePassword,
  linkWithPopup,
  unlink,
} from 'firebase/auth';
import { consts, messages } from '@hermyx/shared';
import api from '../config/api';

const emailVerificationApp = getApps().some(
  (firebaseApp) => firebaseApp.name === 'email-verification',
)
  ? getApp('email-verification')
  : initializeApp(app.options, 'email-verification');
const emailVerificationAuth = getAuth(emailVerificationApp);

// Creates new user
export const createUser = async (user) => {
  // API search
  const { data } = await api.post('/auth/signup', user);

  return data;
};

// Logs in a user in Hermyx and return Firebase custom token
export const login = async (user) => {
  // API search
  const { data } = await api.post('/auth/login', user);

  return data;
};

// Sends a verification email using temporary email/password authentication
export const sendVerificationEmailWithCredentials = async (email, password) => {
  let temporaryUser;
  try {
    const credential = await _signInWithEmailAndPassword(
      emailVerificationAuth,
      email,
      password,
    );
    temporaryUser = credential.user;
    await _sendEmailVerification(temporaryUser);
  } catch (error) {
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
    if (errorBuilder) {
      const mappedError = errorBuilder({ email });
      throw {
        errors: {
          [mappedError.field]: [mappedError.message],
        },
      };
    }

    throw {
      errors: {
        general: [messages.AUTH.EMAIL_VERIFICATION.COULD_NOT_SEND],
      },
    };
  } finally {
    if (
      temporaryUser &&
      emailVerificationAuth.currentUser?.uid === temporaryUser.uid
    ) {
      try {
        await _signOut(emailVerificationAuth);
      } catch {
        // Do not mask a verification error with a cleanup error.
      }
    }
  }
};

// Sends a verification email to the currently authenticated user
export const sendVerificationEmailToCurrentUser = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser)
    throw {
      errors: {
        general: [messages.AUTH.EMAIL_VERIFICATION.COULD_NOT_SEND],
      },
    };

  try {
    await _reload(currentUser);
    await _sendEmailVerification(currentUser);
  } catch (error) {
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
    if (errorBuilder) {
      const mappedError = errorBuilder({ email: currentUser.email });
      throw {
        errors: {
          [mappedError.field]: [mappedError.message],
        },
      };
    }

    throw {
      errors: {
        general: [messages.AUTH.EMAIL_VERIFICATION.COULD_NOT_SEND],
      },
    };
  }
};

// Applies a Firebase e-mail verification action code
export const applyVerificationActionCode = async (actionCode) => {
  try {
    await _applyActionCode(auth, actionCode);
  } catch (error) {
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
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
        general: [messages.AUTH.EMAIL_VERIFICATION.INVALID_CODE],
      },
    };
  }
};

// Verifies a Firebase password reset action code
export const verifyPasswordResetActionCode = async (actionCode) => {
  try {
    return await _verifyPasswordResetCode(auth, actionCode);
  } catch (error) {
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
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
        general: [messages.AUTH.PASSWORD_RESET.INVALID_CODE],
      },
    };
  }
};

// Confirms a new password using a Firebase password reset action code
export const confirmPasswordResetActionCode = async (actionCode, password) => {
  try {
    await _confirmPasswordReset(auth, actionCode, password);
  } catch (error) {
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
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
        general: [messages.AUTH.PASSWORD_RESET.COULD_NOT_CHANGE],
      },
    };
  }
};

// Sends a password reset email
export const sendPasswordResetEmail = async (email) => {
  try {
    await _sendPasswordResetEmail(auth, email);
  } catch (error) {
    // Do not reveal whether an email is registered in Firebase.
    if (error.code === 'auth/user-not-found') return;

    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
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
        general: [messages.AUTH.PASSWORD_RESET.COULD_NOT_SEND],
      },
    };
  }
};

// Signs in user in Firebase with custom token
export const signInWithCustomToken = async (token) => {
  try {
    return await _signInWithCustomToken(auth, token);
  } catch (error) {
    // Firebase errors and exceptions are treated by a map
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
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
        general: [messages.AUTH.LOGIN.COULD_NOT_LOG_IN],
      },
    };
  }
};

// Handles google sync
export const syncUserWithGoogleAccount = async (
  email,
  username,
  firebaseUid,
) => {
  const { data } = await api.post('/auth/sync-google', {
    email,
    username,
    firebaseUid,
  });

  return data;
};

// Signs in a user using Google authentication
export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    // Firebase errors and exceptions are treated by a map
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
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
        general: [messages.AUTH.LOGIN.COULD_NOT_LOG_IN],
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
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
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
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
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
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
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
