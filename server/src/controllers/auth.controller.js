import { messages } from '@hermyx/shared';
import { getUserByUsername } from '../services/user.service.js';
import {
  createCustomToken,
  firebaseSignIn,
} from '../providers/auth.provider.js';

export const login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;

    // Login must be include email or username
    if (!email && !username) {
      return res.status(400).json({
        errors: { usernameEmail: [messages.AUTH.LOGIN.NO_EMAIL_OR_USERNAME] },
      });
    }

    let user;
    // If username is provided, user is find to get the email
    if (username) {
      user = await getUserByUsername(username);
      if (!user)
        return res.status(401).json({
          errors: { general: [messages.AUTH.LOGIN.INVALID_CREDENTIALS] },
        });
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
