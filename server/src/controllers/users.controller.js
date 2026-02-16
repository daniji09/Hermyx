// External modules
const usersModel = require("../models/app_user.model");

const getUsers = async (req, res) => {
  try {
    // Gets attributes
    const { email, username } = req.query;

    if (email) {
      // It searches user by email
      const user = await usersModel.getByEmail(email);

      // Returns success or error
      if (!user)
        return res
          .status(404)
          .json({ error: `User with e-mail ${email} not found.` });

      return res.status(200).json({ data: user });
    } else if (username) {
      // It searches user by username
      const user = await usersModel.getByUsername(username);

      // Returns success or error
      if (!user)
        return res
          .status(404)
          .json({ error: `Username ${username} not found.` });

      return res.status(200).json({ data: user });
    }
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};

const signUp = async (req, res) => {
  try {
    // Gets new account attributes
    const { email, username, firebaseUid } = req.body;

    // Creates account
    const user = await usersModel.create(email, username, firebaseUid);

    // Returns success or error
    if (user) return res.status(201).json({ data: user });
    return res.status(400).json({ error: `Could not create new account.` });
  } catch (e) {
    console.error(e);
    res.status(500).end();
  }
};
module.exports = { getUsers, signUp };
