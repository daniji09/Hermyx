import { consts, messages } from '@hermyx/shared';
import { create, findByEmail, findByUsername } from '../models/user.model.js';
import {
  createFirebaseUser,
  deleteFirebaseUser,
  getUserByEmail,
} from '../providers/auth.provider.js';
import { AppError } from '../utils/error.util.js';

export const signup = async (email, username, password) => {
  // Checks if the email is already in use
  const userByEmail = await findByEmail(email);

  // If it exists, then its a bad request error
  if (userByEmail) throw buildEmailAlreadyExistsError(email);

  // Checks if the username is already in use
  const userByUsername = await findByUsername(username);

  // If it exists, then its a bad request error
  if (userByUsername) throw buildUsernameAlreadyExistsError(username);

  // Lastly, it makes a deep check on Firebase searching for the e-mail
  try {
    await getUserByEmail(email);
    // Finding an email successfully is the error
    throw buildEmailAlreadyExistsError(email);
  } catch (error) {
    if (error.status) throw error;
    // User not found is expected if the email is not in use, so any other error is returned
    if (error.code !== 'auth/user-not-found') {
      const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
      if (errorBuilder) {
        const mappedError = errorBuilder({ email });
        throw {
          status: mappedError.status,
          field: mappedError.field,
          message: mappedError.message,
        };
      }

      throw buildUnexpectedError(messages.GENERAL.UNEXPECTED_ERROR);
    }
  }

  let firebaseUser;
  try {
    // User is created on Firebase
    firebaseUser = await createFirebaseUser({ email, username, password });
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
    const user = await create(email, username, firebaseUser.uid);

    // Returns success or error
    if (!user) {
      // If there is an error, Firebase user must be deleted
      await deleteFirebaseUser(firebaseUser.uid);
      throw new AppError(
        messages.AUTH.SIGNUP.COULD_NOT_CREATE_NEW_ACCOUNT,
        400,
        'general',
      );
    }

    return user;
  } catch (error) {
    // If there is an error, Firebase user must be deleted, compensatory transaction (SAGA)
    await deleteFirebaseUser(firebaseUser.uid);

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

const buildEmailAlreadyExistsError = (email) => {
  return new AppError(
    messages.AUTH.SIGNUP.EMAIL_ALREADY_EXISTS(email),
    400,
    'email',
  );
};

const buildUsernameAlreadyExistsError = (username) => {
  return new AppError(
    messages.AUTH.SIGNUP.USERNAME_ALREADY_EXISTS(username),
    400,
    'username',
  );
};

const buildUnexpectedError = (message) => {
  return new AppError(message, 500, 'general');
};
