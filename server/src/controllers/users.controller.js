// External modules
import { messages, consts } from '@hermyx/shared';
import {
  getByEmail,
  getByUsername,
  create,
  getByFirebaseUid,
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
import {
  getMissionsByUid,
  getMissionsJoinedByUser,
} from '../models/mission.model.js';

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
          errors: { usernameEmail: [messages.EMAIL_NOT_FOUND(email)] },
        });

      return res.status(200).json({ user });
    } else if (username) {
      // It searches user by username
      const user = await getByUsername(username);

      // Returns success or error
      if (!user)
        return res.status(404).json({
          errors: { usernameEmail: [messages.USERNAME_NOT_FOUND(username)] },
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

export const getUsersByFirebaseUid = async (req, res) => {
  try {
    // Gets attributes
    const { firebaseUid } = req.params;

    if (firebaseUid) {
      // It searches user by email
      const user = await getByFirebaseUid(firebaseUid);

      // Returns success or error
      if (!user)
        return res.status(404).json({
          errors: { general: [messages.FIREBASE_UID_NOT_FOUND(firebaseUid)] },
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

export const getUserMissions = async (req, res) => {
  const { uid } = req.params;
  const { type } = req.query;
  const pagination = req.pagination;

  // It missions from user of a type
  try {
    let result = { rows: [], totalCount: 0 };

    if (type === 'published') {
      result = await getMissionsByUid(uid, pagination);
    } else if (type === 'joined') {
      result = await getMissionsJoinedByUser(uid, pagination);
    } else {
      return res
        .status(400)
        .json({ errors: { general: [messages.INVALID_MISSION_TYPE] } });
    }
    const missions = result.rows;
    const totalItems = parseInt(result.totalCount);

    if (missions) {
      const totalPages = Math.ceil(totalItems / pagination.limit);
      const hasMore = pagination.page < totalPages;

      // Pagination object is built
      return res.status(200).json({
        missions,
        pagination: {
          currentPage: pagination.page,
          totalPages: totalPages,
          totalItems: totalItems,
          hasMore: hasMore,
        },
      });
    } else
      return res.status(404).json({
        errors: { general: [messages.MISSIONS_NOT_FOUND] },
      });
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
