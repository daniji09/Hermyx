// External modules
import { messages, consts } from '@hermyx/shared';
import { getByEmail, getByUsername, create } from '../models/app_user.model.js';
import {
  createFirebaseUser,
  deleteFirebaseUser,
} from '../services/auth.service.js';

export const getUsers = async (req, res) => {
  try {
    // Gets attributes
    const { email, username } = req.query;

    if (email) {
      // It searches user by email
      const user = await getByEmail(email);

      // Returns success or error
      if (!user)
        return res.status(404).json({
          errors: { general: [messages.EMAIL_NOT_FOUND(email)] },
        });

      return res.status(200).json({ user });
    } else if (username) {
      // It searches user by username
      const user = await getByUsername(username);

      // Returns success or error
      if (!user)
        return res.status(404).json({
          errors: { general: [messages.USERNAME_NOT_FOUND(username)] },
        });

      return res.status(200).json({ user });
    }
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

export const signUp = async (req, res) => {
  try {
    // Gets new account attributes
    const { email, username, password } = req.body;

    // Checks if the email is already in use
    const userByEmail = await getByEmail(email);

    // If it exists, then its a bad request error
    if (userByEmail)
      return res.status(400).json({
        errors: { email: [messages.EMAIL_ALREADY_EXISTS(email)] },
      });

    // Checks if the username is already in use
    const userByUsername = await getByUsername(username);

    // If it exists, then its a bad request error
    if (userByUsername)
      return res.status(400).json({
        errors: { username: [messages.USERNAME_ALREADY_EXISTS(username)] },
      });

    let firebaseUser;
    try {
      firebaseUser = await createFirebaseUser({ email, username, password });
    } catch (error) {
      // Firebase errors and exceptions are treated
      const errorBuilder = consts.FIREBASE_ERRORS[error.code];
      if (errorBuilder) {
        const mappedError = errorBuilder({ email });
        return res.status(mappedError.status).json({
          errors: { [mappedError.field]: [mappedError.message] },
        });
      }

      if (error.errors) return res.status(500).json(error.errors);

      return res.status(500).json({
        errors: { general: [messages.UNEXPECTED_ERROR] },
      });
    }
    try {
      // Creates user in Hermyx DB
      const user = await create(email, username, firebaseUser.uid);

      // Returns success or error
      if (user) return res.status(201).json({ user });
      else {
        // If there is an error, Firebase user must be deleted
        await deleteFirebaseUser(firebaseUser.uid);
        return res.status(400).json({
          errors: { general: [messages.COULD_NOT_CREATE_NEW_ACCOUNT] },
        });
      }
    } catch (e) {
      // If there is an error, Firebase user must be deleted
      await deleteFirebaseUser(firebaseUser.uid);
      throw e;
    }
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};
