import { messages } from '../messages/messages.js';
export const consts = {
  /// Common consts

  /// Auth consts

  // Firebase consts
  FIREBASE_ERRORS: {
    //Auth/account-exists-with-different-credential?
    'auth/cancelled-popup-request': () => ({
      field: 'general',
      message: messages.OPERATION_ERROR,
      status: 499,
    }),
    'auth/email-already-exists': ({ email }) => ({
      field: 'email',
      message: messages.EMAIL_ALREADY_EXISTS(email),
      status: 400,
    }),
    'auth/email-already-in-use': ({ email }) => ({
      field: 'email',
      message: messages.EMAIL_ALREADY_EXISTS(email),
      status: 400,
    }),
    'auth/invalid-credential': () => ({
      field: 'general',
      message: messages.INVALID_CREDENTIALS,
      status: 400,
    }),
    'auth/invalid-email': () => ({
      field: 'email',
      message: messages.FIELD_NOT_VALID('email'),
      status: 400,
    }),
    'auth/invalid-password': () => ({
      field: 'password',
      message: messages.FIELD_NOT_VALID('password'),
      status: 400,
    }),
    'auth/missing-email': () => ({
      field: 'email',
      message: messages.FIELD_REQUIRED,
      status: 400,
    }),
    'auth/missing-password': () => ({
      field: 'password',
      message: messages.FIELD_REQUIRED,
      status: 400,
    }),
    'auth/network-request-failed': () => ({
      field: 'general',
      message: messages.CONNECTION_ERROR,
      status: 502,
    }),
    'auth/operation-not-allowed': () => ({
      field: 'general',
      message: messages.OPERATION_ERROR,
      status: 403,
    }),
    'auth/popup-blocked': () => ({
      field: 'general',
      message: messages.OPERATION_ERROR,
      status: 401,
    }),
    'auth/popup-closed-by-user': () => ({
      field: 'general',
      message: messages.OPERATION_ERROR,
      status: 499,
    }),
    'auth/weak-password': () => ({
      field: 'password',
      message: messages.FIELD_NOT_VALID('password'),
      status: 400,
    }),
    'auth/wrong-password': () => ({
      field: 'password',
      message: messages.PASSWORD_WRONG,
      status: 400,
    }),
  },
  // Sign up
  ORIGINAL_USERNAME_MAX_LENGTH: 10,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 4096,
  USERNAME_MAX_LENGTH: 20,

  /// User consts
};
