import { consts, messages } from '@hermyx/shared';
import * as userService from './user.service.js';
import * as authProvider from '../providers/auth.provider.js';
import { AppError } from '../utils/error.util.js';
import { stringShortener } from '../utils/string.util.js';

/// Service functions
// Signup
export const signup = async (email, username, password, termsAccepted) => {
  if (termsAccepted !== true)
    throw new AppError(
      messages.AUTH.SIGNUP.TERMS_REQUIRED,
      400,
      'termsAccepted',
    );

  // Checks if the email is already in use
  const userByEmail = await userService.getUserByEmail(email);

  // Reuses pending accounts so users can request another verification e-mail
  if (userByEmail) {
    let firebaseUser;
    try {
      firebaseUser = await authProvider.getUserByUid(userByEmail.firebase_uid);
    } catch {
      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
    }

    if (firebaseUser.emailVerified) throw buildEmailAlreadyExistsError(email);

    try {
      await authProvider.firebaseSignIn(email, password);
    } catch (error) {
      const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
      if (errorBuilder) {
        const mappedError = errorBuilder({ email });
        throw new AppError(
          mappedError.message,
          mappedError.status,
          mappedError.field,
        );
      }

      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
    }

    return userByEmail;
  }

  // Checks if the username is already in use
  const userByUsername = await userService.getUserByUsername(username);

  // If it exists, then its a bad request error
  if (userByUsername) throw buildUsernameAlreadyExistsError(username);

  // Lastly, it makes a deep check on Firebase searching for the e-mail
  try {
    await authProvider.getUserByEmail(email);
    // Finding an email successfully is the error
    throw buildEmailAlreadyExistsError(email);
  } catch (error) {
    if (error.status) throw error;
    // User not found is expected if the email is not in use, so any other error is returned
    if (error.code !== 'auth/user-not-found') {
      const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
      if (errorBuilder) {
        const mappedError = errorBuilder({ email });
        throw new AppError(
          mappedError.message,
          mappedError.status,
          mappedError.field,
        );
      }

      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
    }
  }

  let firebaseUser;
  try {
    // User is created on Firebase
    firebaseUser = await authProvider.createFirebaseUser({
      email,
      username,
      password,
    });
  } catch (error) {
    // Firebase errors and exceptions are treated
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
    if (errorBuilder) {
      const mappedError = errorBuilder({ email });
      throw new AppError(
        mappedError.message,
        mappedError.status,
        mappedError.field,
      );
    }

    throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
  }
  try {
    // Creates user in Hermyx DB
    const user = await userService.createUser(
      email,
      username,
      firebaseUser.uid,
      consts.AUTH.LEGAL.TERMS_VERSION,
    );

    // Returns success or error
    if (!user) {
      // If there is an error, Firebase user must be deleted
      await authProvider.deleteFirebaseUser(firebaseUser.uid);
      throw new AppError(
        messages.AUTH.SIGNUP.COULD_NOT_CREATE_NEW_ACCOUNT,
        500,
        'general',
      );
    }

    return user;
  } catch (error) {
    // If there is an error, Firebase user must be deleted, compensatory transaction (SAGA)
    await authProvider.deleteFirebaseUser(firebaseUser.uid);

    // No db transactions are used because there is no concurrency risks, except for this one
    // If two users create the same user at the same time, Postgres detects the error, so this code manages that
    if (error.code === '23505') {
      const detail = error.detail || '';
      if (detail.includes('email')) {
        throw buildEmailAlreadyExistsError(email);
      } else {
        throw buildUsernameAlreadyExistsError(username);
      }
    }

    throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
  }
};

// Log in
export const login = async (email, username, password) => {
  let user;
  // If username is provided, user is find to get the email
  if (username) {
    user = await userService.getUserByUsername(username);
    if (!user)
      throw new AppError(
        messages.AUTH.LOGIN.INVALID_CREDENTIALS,
        401,
        'general',
      );
  }

  // Signs in user via Firebase
  const firebaseData = await authProvider.firebaseSignIn(
    email ? email : user.email,
    password,
  );

  // Password accounts must verify ownership of their e-mail before logging in.
  const firebaseUser = await authProvider.getUserByUid(firebaseData.localId);
  if (!firebaseUser.emailVerified)
    throw new AppError(messages.AUTH.LOGIN.EMAIL_NOT_VERIFIED, 403, 'general');

  // Creates custom token so frontend knows it has been successful
  return await authProvider.createCustomToken(firebaseData.localId);
};

// Sync with Google action
export const syncGoogle = async (
  email,
  username,
  firebaseUid,
  termsAccepted,
) => {
  // Checks if user already exist on Hermyx db
  const checkedUser = await userService.getUserByEmail(email);

  // If it exists, it returns it, its a login
  if (checkedUser) return { user: checkedUser, isLogin: true };

  if (termsAccepted !== true)
    throw new AppError(
      messages.AUTH.SIGNUP.TERMS_REQUIRED,
      400,
      'termsAccepted',
    );

  // Otherwise, it is a signup, so unique username is generated
  const uniqueUsername = await generateUniqueUsername(username);

  try {
    // The user is created in Hermyx bd
    const user = await userService.createUser(
      email,
      uniqueUsername,
      firebaseUid,
      consts.AUTH.LEGAL.TERMS_VERSION,
    );

    // Returns success or error
    if (user) return { user, isLogin: false };
    else throw buildCouldNotSignUpError();
  } catch (error) {
    // No db transactions are used because there is no concurrency risks, except for this one
    // If two users create the same user at the same time, Postgres detects the error, so this code manages that
    if (error.code === '23505') {
      const detail = error.detail || '';
      if (detail.includes('email')) {
        throw buildEmailAlreadyExistsError(email);
      } else {
        throw buildUsernameAlreadyExistsError(username);
      }
    }

    throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
  }
};

/// Error builders
const buildEmailAlreadyExistsError = (email) => {
  return new AppError(
    messages.AUTH.SIGNUP.EMAIL_ALREADY_EXISTS(email),
    409,
    'email',
  );
};

const buildUsernameAlreadyExistsError = (username) => {
  return new AppError(
    messages.AUTH.SIGNUP.USERNAME_ALREADY_EXISTS(username),
    409,
    'username',
  );
};

const buildCouldNotSignUpError = () => {
  return new AppError(
    messages.AUTH.SIGNUP.COULD_NOT_CREATE_NEW_ACCOUNT,
    500,
    'general',
  );
};

const buildUnexpectedError = (message) => {
  return new AppError(message, 500, 'general');
};

/// Helper functions
const generateUniqueUsername = async (username) => {
  let uniqueUsername,
    isUnique = false;

  // If original username is too long it gets shortened
  username = stringShortener(
    username,
    consts.USER.USERNAME.ORIGINAL_MAX_LENGTH,
  );

  // Tries to get an unique username, it should execute once per signup
  while (!isUnique) {
    // Creates username
    const rand = Math.random();
    uniqueUsername = username + (rand + '').split('.')[1];

    // Username gets shortened again
    uniqueUsername = stringShortener(
      uniqueUsername,
      consts.USER.USERNAME.MAX_LENGTH,
    );

    // Checks if username is unique
    const existingUser = await userService.getUserByUsername(uniqueUsername);
    if (!existingUser) isUnique = true;
  }

  return uniqueUsername;
};
