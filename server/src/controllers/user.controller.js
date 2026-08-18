// External modules
import * as userService from '../services/user.service.js';

/// Controller functions
// Search users by username partial match
export const searchUsersByUsername = async (req, res, next) => {
  try {
    const username = req.query.username;
    const pagination = req.pagination;
    const { users, pagination: paginationData } =
      await userService.searchUserByUsername(
        username,
        req.user.uid,
        pagination,
      );
    return res.status(200).json({ users, pagination: paginationData });
  } catch (error) {
    next(error);
  }
};

// Gets current user information
export const getMe = async (req, res, next) => {
  try {
    // Authentication middleware already searched user by their firebaseUid,
    // So current user information is already saved on req.user
    return res.status(200).json(req.user);
  } catch (error) {
    next(error);
  }
};

// Gets current user profile
export const getMyProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const profile = await userService.getMyProfile(user);
    return res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};

// Gets the missions from the user, joined or published
export const getUserMissions = async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { type } = req.query;
    const pagination = req.pagination;
    const { missions, pagination: paginationData } =
      await userService.getUserMissions(uid, type, pagination);
    return res.status(200).json({ missions, pagination: paginationData });
  } catch (error) {
    next(error);
  }
};

// Get user public profile
export const getUserPublicProfile = async (req, res, next) => {
  try {
    const username = req.params.username;
    const { user, missionsVisible } =
      await userService.getUserPublicProfile(username);
    return res.status(200).json({ user, missionsVisible });
  } catch (error) {
    next(error);
  }
};

// Get user public profile missions
export const getUserPublicProfileMissions = async (req, res, next) => {
  try {
    const username = req.params.username;
    const { type } = req.query;
    const pagination = req.pagination;
    const { missions, pagination: paginationData } =
      await userService.getUserPublicMissions(username, type, pagination);
    return res.status(200).json({ missions, pagination: paginationData });
  } catch (error) {
    next(error);
  }
};

// Updates current user's profile
export const updateMyProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const newInformation = {
      username: req.body.username,
      name: req.body.name,
      surnames: req.body.surnames,
      description: req.body.description,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
    };
    const updatedUser = await userService.updateMyProfile(user, newInformation);
    return res.status(200).json({
      profile: {
        username: updatedUser.username,
        name: updatedUser.name,
        surnames: updatedUser.surnames,
        description: updatedUser.description,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Updates current user's avatar
export const updateMyAvatar = async (req, res, next) => {
  try {
    const user = req.user;
    const avatar = await userService.updateMyAvatar(user.uid, req.file);
    return res.status(200).json({ avatar });
  } catch (error) {
    next(error);
  }
};

// Updates current user's email
export const updateMyEmail = async (req, res, next) => {
  try {
    const user = req.user;
    const { email } = req.body;
    const userChanged = await userService.updateMyEmail(user, email);
    return res.status(200).json(userChanged);
  } catch (error) {
    next(error);
  }
};

// Updates user's configuration
export const updateMyConfiguration = async (req, res, next) => {
  try {
    const user = req.user;
    const { configuration } = req.body;
    const newConfiguration = await userService.updateMyConfiguration(
      user.uid,
      configuration,
    );
    return res.status(200).json({ configuration: newConfiguration });
  } catch (error) {
    next(error);
  }
};

// Adds email authentication to current user
export const addEmailAuthentication = async (req, res, next) => {
  try {
    const user = req.user;
    const { email, password } = req.body;
    const userChanged = await userService.addEmailAuthentication(
      user,
      email,
      password,
    );
    return res.status(200).json(userChanged);
  } catch (error) {
    next(error);
  }
};

// Bans user
export const banUser = async (req, res, next) => {
  try {
    const { uid } = req.params;
    const { rid, reason } = req.body;
    await userService.banUser(uid, rid, reason, req.user);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};

// Deletes (anonymize) current user
export const deleteMe = async (req, res, next) => {
  try {
    await userService.deleteMe(req.user);
    return res.status(200).json({});
  } catch (error) {
    next(error);
  }
};
