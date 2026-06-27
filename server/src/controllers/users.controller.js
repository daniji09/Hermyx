// External modules
import { messages, consts } from '@hermyx/shared';
import {
  getByEmail,
  getByUsername,
  create,
  getByFirebaseUid,
  getByUsernameExcludingUid,
  updateMyProfile as updateMyProfileInDb,
  deleteByUid as _deleteByUid,
  updateUserEmail as _updateUserEmail,
  anonymize as _anonymize,
  deanonymize,
} from '../models/app_user.model.js';
import {
  getPublicProfileCreatedMissions,
  getPublicProfileJoinedMissions,
  getMissionsByUid,
  getMissionsJoinedByUser,
  getUserActiveMissions,
} from '../models/mission.model.js';
import {
  createFirebaseUser,
  deleteFirebaseUser,
  getUserByEmail,
  updateFirebaseAccount,
} from '../services/auth.service.js';
import { stringShortener } from '../utils/strings.utils.js';

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

    const missionsVisible =
      user.configuracion?.show_missions_to_others !== false;

    return res.status(200).json({
      user: publicProfile,
      missionsVisible,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      errors: { general: [messages.UNEXPECTED_ERROR] },
    });
  }
};

export const getUserPublicProfileMissions = async (req, res) => {
  try {
    const username = req.params.username.toLowerCase().trim();
    const { type } = req.query;
    const pagination = req.pagination;

    const user = await getByUsername(username);

    if (!user) {
      return res.status(404).json({
        errors: { general: [messages.USERNAME_NOT_FOUND(username)] },
      });
    }

    const missionsVisible =
      user.configuracion?.show_missions_to_others !== false;

    if (!missionsVisible) {
      return res.status(200).json({
        missions: [],
        pagination: {
          currentPage: pagination.page,
          totalPages: 0,
          totalItems: 0,
          hasMore: false,
        },
      });
    }

    let missionsResult = { rows: [], totalCount: 0 };

    if (type === 'created') {
      missionsResult = await getPublicProfileCreatedMissions(
        user.uid,
        pagination,
      );
    } else if (type === 'joined') {
      missionsResult = await getPublicProfileJoinedMissions(
        user.uid,
        pagination,
      );
    }

    const missions = missionsResult.rows;
    const totalItems = parseInt(missionsResult.totalCount);

    if (missions) {
      const totalPages = Math.ceil(totalItems / pagination.limit);
      const hasMore = pagination.page < totalPages;

      return res.status(200).json({
        missions,
        pagination: {
          currentPage: pagination.page,
          totalPages: totalPages,
          totalItems: totalItems,
          hasMore: hasMore,
        },
      });
    } else {
      return res.status(404).json({
        errors: { general: [messages.MISSIONS_NOT_FOUND] },
      });
    }
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
      email: user.email,
      name: user.name,
      surnames: user.surnames,
      description: user.description,
      location: user.location,
      avatar: user.avatar,
    };

    return res.status(200).json({
      user: profile,
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

    // Lastly, it makes a deep check on Firebase searching for the e-mail
    try {
      await await getUserByEmail(email);
      return res.status(400).json({
        errors: { email: [messages.EMAIL_ALREADY_EXISTS(email)] },
      });
    } catch (error) {
      // User not found is expected if the email is not in use, so any other error is returned
      if (error.code !== 'auth/user-not-found') {
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
    }

    let firebaseUser;
    try {
      // User is created on Firebase
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

export const updateMyProfile = async (req, res) => {
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

    const updatedUser = await updateMyProfileInDb(user.uid, {
      username,
      name: req.body.name,
      surnames: req.body.surnames,
      description: req.body.description,
    });

    return res.status(200).json({
      message: messages.PROFILE_UPDATED_SUCCESSFULLY,
      profile: {
        username: updatedUser.username,
        name: updatedUser.name,
        surnames: updatedUser.surnames,
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

export const syncGoogle = async (req, res) => {
  try {
    // Gets account attributes
    const { email, username, firebaseUid, isNewUser } = req.body;

    // Checks if user already exist to check if Firebase action was the correct one (determined via isNewUser)
    const checkedUser = await getByEmail(email);

    if (checkedUser) {
      // Its a login
      if (!isNewUser) return res.status(200).json({ checkedUser });
      else {
        return res.status(400).json({
          errors: { general: [messages.COULD_NOT_LOG_IN] },
        });
      }
    } else {
      // Its a signup
      if (isNewUser) {
        // Username was generated by the emails name, so it has to be ensure that is unique
        const uniqueUsername = generateUniqueUsername(username);

        // The user is created in Hermyx bd
        const user = await create(email, uniqueUsername, firebaseUid);

        // Returns success or error
        if (user) return res.status(201).json({ user });
        return res.status(400).json({
          errors: { general: [messages.COULD_NOT_CREATE_NEW_ACCOUNT] },
        });
      } else {
        return res.status(400).json({
          errors: { general: [messages.COULD_NOT_CREATE_NEW_ACCOUNT] },
        });
      }
    }
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

// Deletes a user by uid
export const deleteByUid = async (req, res) => {
  try {
    const { uid } = req.params;

    const success = await _deleteByUid(uid);

    if (!success)
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });

    return res.status(200).json({});
  } catch (e) {
    console.error(e);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

// Deletes (anonymize) current user
export const deleteUser = async (req, res) => {
  const user = req.user;
  let anonymize;
  try {
    // First of all, checks if user has active missions, created or joined
    const activeMissions = await getUserActiveMissions(user.uid);
    console.log(activeMissions);
    if (activeMissions.total_active > 0)
      return res.status(400).json({
        missions: activeMissions,
        errors: {
          general: [
            `You cant delete your account while you have active missions.`,
          ],
        },
      });

    // Anonymize user in db
    anonymize = await _anonymize(user.uid);
    if (anonymize < 1)
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });

    // Deletes user from Firebase
    await deleteFirebaseUser(user.firebase_uid);
    return res.status(200).json({});
  } catch (e) {
    console.error(e);

    // If email was changed on Firebase but not in Hermyx, it should rollback
    if (anonymize > 0) await deanonymize(user);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

// Updates user email on DB and Firebase
export const updateUserEmail = async (req, res) => {
  const user = req.user;
  const currentEmail = user.email;
  let firebaseChange;
  try {
    const { email, password } = req.body;

    // First of all, new email is checked to be unique
    const userByEmail = await getByEmail(email);

    // If it exists, then its a bad request error (unless is a new authentication with the same email)
    if (
      (userByEmail && !password) ||
      (userByEmail && password && userByEmail.uid !== user.uid)
    )
      return res.status(400).json({
        errors: { email: [messages.EMAIL_ALREADY_EXISTS(email)] },
      });

    // Lastly, it makes a deep check on Firebase searching for the e-mail
    try {
      const fbUser = await getUserByEmail(email);
      if (fbUser.uid !== user.firebase_uid && password) {
        return res.status(400).json({
          errors: { email: [messages.EMAIL_ALREADY_EXISTS(email)] },
        });
      }
    } catch (error) {
      // User not found is expected if the email is not in use, so any other error is returned
      if (error.code !== 'auth/user-not-found') {
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
    }

    // Prepares user email update
    const firebaseUpdates = { email };
    if (password) {
      firebaseUpdates.password = password; // If there is password, its added
    }

    // So, email is changed on Firebase
    firebaseChange = await updateFirebaseAccount(
      user.firebase_uid,
      firebaseUpdates,
    );

    if (!firebaseChange)
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });

    // Then is changed on Hermyx database
    const hermyxChange = await _updateUserEmail(user.uid, email);

    if (hermyxChange) return res.status(200).json({ user: hermyxChange });
    else {
      // If email was changed on Firebase but not in Hermyx, it should rollback
      await updateFirebaseAccount(user.firebase_uid, currentEmail);
      return res
        .status(500)
        .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
    }
  } catch (e) {
    console.error(e);
    // If email was changed on Firebase but not in Hermyx, it should rollback
    if (firebaseChange)
      await updateFirebaseAccount(user.firebase_uid, currentEmail);
    return res
      .status(500)
      .json({ errors: { general: [messages.UNEXPECTED_ERROR] } });
  }
};

function generateUniqueUsername(username) {
  let uniqueUsername,
    isUnique = false;

  // If original username is too long it gets shortened
  username = stringShortener(username, consts.ORIGINAL_USERNAME_MAX_LENGTH);

  // Tries to get an unique username, it should execute once per signup
  while (!isUnique) {
    // Creates username
    const rand = Math.random();
    uniqueUsername = username + (rand + '').split('.')[1];

    // Username gets shortened again
    uniqueUsername = stringShortener(
      uniqueUsername,
      consts.USERNAME_MAX_LENGTH,
    );

    // Checks if username is unique
    isUnique = getByUsername(uniqueUsername);
  }

  return uniqueUsername;
}
