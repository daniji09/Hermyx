// External modules
import { messages, consts } from '@hermyx/shared';
import {
  getByEmail,
  getByUsername,
  create,
  getByUsernameExcludingUid,
  updateMyAccount as updateMyAccountInDb,
} from '../models/app_user.model.js';
import {
  getCompletedMission,
  getActiveMissionsByOwner,
  getActiveMissionsByAdventurer,
} from '../models/mission.model.js';
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
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

export const getUserPublicProfile = async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();

    const user = await getByUsername(username);

    if (!user) {
      return res.status(404).json({
        errors: { general: [messages.USERNAME_NOT_FOUND(username)] },
      });
    }

    const publicProfile = {
      username: user.username,
      name: user.name,
      surnames: user.surnames,
      description: user.description,
      location: user.location,
      avatar: user.avatar,
    };

    const missionsHistory = await getCompletedMission(user.uid);

    return res.status(200).json({
      user: publicProfile,
      missions: missionsHistory || [],
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      errors: { general: [messages.UNEXPECTED_ERROR] },
    });
  }
};

export const getUserCompletedMissions = async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();

    const user = await getByUsername(username);

    if (!user) {
      return res.status(404).json({
        errors: { general: [messages.USERNAME_NOT_FOUND(username)] },
      });
    }

    const missionsHistory = await getCompletedMission(user.uid);

    if (!missionsHistory || missionsHistory.length === 0) {
      return res.status(200).json({
        username: user.username,
        missions: [],
        message: 'This user has no completed missions.',
      });
    }

    return res.status(200).json({
      username: user.username,
      missions: missionsHistory,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      errors: { general: [messages.UNEXPECTED_ERROR] },
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ errors: { general: [messages.UNAUTHORIZED_ERROR] } });
    }

    const profile = {
      username: user.username,
      name: user.name,
      surnames: user.surnames,
      description: user.description,
      location: user.location,
      avatar: user.avatar,
    };

    const [completedMissions, activeAsRequester, activeAsAdventurer] =
      await Promise.all([
        getCompletedMission(user.uid),
        getActiveMissionsByOwner(user.uid),
        getActiveMissionsByAdventurer(user.uid),
      ]);

    return res.status(200).json({
      user: profile,
      missions: {
        completed: completedMissions || [],
        active: {
          asRequester: activeAsRequester || [],
          asAdventurer: activeAsAdventurer || [],
        },
      },
    });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

export const signUp = async (req, res) => {
  try {
    // Gets new account attributes
    const email = req.body.email.toLowerCase().trim();
    const username = req.body.username.toLowerCase().trim();
    const { password } = req.body;

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

export const updateMyAccount = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res
        .status(401)
        .json({ errors: { general: [messages.UNAUTHORIZED_ERROR] } });
    }

    const username = req.body.username.toLowerCase().trim();

    const existingUsername = await getByUsernameExcludingUid(
      username,
      user.uid,
    );
    if (existingUsername) {
      return res.status(400).json({
        errors: { username: [messages.USERNAME_ALREADY_EXISTS(username)] },
      });
    }

    const updatedUser = await updateMyAccountInDb(user.uid, {
      username,
      name: req.body.name,
      surnames: req.body.surnames,
      location: req.body.location,
      description: req.body.description,
    });

    return res.status(200).json({
      message: messages.ACCOUNT_UPDATED_SUCCESSFULLY,
      account: {
        username: updatedUser.username,
        name: updatedUser.name,
        surnames: updatedUser.surnames,
        location: updatedUser.location,
        description: updatedUser.description,
      },
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

export const getMyAccount = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ errors: { general: [messages.UNAUTHORIZED_ERROR] } });
    }

    const editableDirectFields = [
      'username',
      'name',
      'surnames',
      'location',
      'description',
    ];

    const requiresVerificationFields = [
      'email',
      'password',
      'googleAccount',
      'paymentMethods',
    ];

    return res.status(200).json({
      account: {
        username: user.username,
        name: user.name,
        surnames: user.surnames,
        location: user.location,
        description: user.description,
        email: user.email,
        googleAccount: user.google_account,
      },
      editableDirectFields,
      requiresVerificationFields,
    });
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};
