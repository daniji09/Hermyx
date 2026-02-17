// External modules
import { getByEmail, getByUsername, create } from '../models/app_user.model.js';

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
          errors: { general: `User with email ${email} not found.` },
        });

      return res.status(200).json({ user: user });
    } else if (username) {
      // It searches user by username
      const user = await getByUsername(username);

      // Returns success or error
      if (!user)
        return res
          .status(404)
          .json({ error: { general: `Username ${username} not found.` } });

      return res.status(200).json({ user: user });
    }
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

export const signUp = async (req, res) => {
  try {
    // Gets new account attributes
    const { email, username, firebaseUid } = req.body;

    // Creates account
    const user = await create(email, username, firebaseUid);

    // Returns success or error
    if (user) return res.status(201).json({ user: user });
    return res
      .status(400)
      .json({ error: { general: `Could not create new account.` } });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};
