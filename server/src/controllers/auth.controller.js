import { messages } from '@hermyx/shared';
import { getUserByUsername } from '../services/user.service.js';
import {
  createCustomToken,
  firebaseSignIn,
} from '../providers/auth.provider.js';
import { signup as _signup } from '../services/auth.service.js';
import { AppError } from '../utils/error.util.js';

export const signup = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // Sign up
    const user = await _signup(email, username, password);

    return res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    let user;
    // If username is provided, user is find to get the email
    if (username) {
      user = await getUserByUsername(username);
      if (!user)
        throw new AppError(
          messages.AUTH.LOGIN.INVALID_CREDENTIALS,
          401,
          'general',
        );
    }

    // Signs in user via Firebase
    const firebaseData = await firebaseSignIn(
      email ? email : user.email,
      password,
    );

    // Creates custom token so frontend knows it has been successful
    const customToken = await createCustomToken(firebaseData.localId);

    return res.status(200).json({ token: customToken });
  } catch (error) {
    next(error);
  }
};
