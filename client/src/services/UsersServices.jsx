import api from '../config/api';

// Finds user via username
export const getUserByUsername = async (username) => {
  // API search
  const { data } = await api.get('/users', {
    params: { username },
  });

  return data.user;
};

// Searches users by partial username
export const searchUsersByUsername = async (options) => {
  const { page, limit } = options;
  if (page && limit) {
    const { data } = await api.get('/users/search', {
      params: { page, limit, ...options.params },
    });
    console.log(data);
    return data;
  }
};

// Finds current user information
export const getMe = async () => {
  // API search
  const { data } = await api.get(`/users/me`);
  return data;
};

//Get public profile by username
export const getPublicUserProfile = async (username) => {
  const { data } = await api.get(`/users/${username}/profile`);
  return data;
};

//Get public profile missions by username
export const getPublicUserProfileMissions = async (
  username,
  type,
  page,
  limit,
) => {
  const { data } = await api.get(`/users/${username}/profile/missions`, {
    params: { type, page, limit },
  });
  return data;
};

// Gets logged user's profile
export const getMyProfile = async () => {
  const { data } = await api.get('/users/me/profile');
  return data;
};

// Updates logged user's profile
export const updateMyProfile = async (profile) => {
  const { data } = await api.patch('/users/me/profile', profile);
  return data;
};

// Updates logged user's avatar
export const updateMyAvatar = async (profile) => {
  const { data } = await api.patch('/users/me/avatar', profile);
  return data;
};

// Updates users email on DB and Firebase
export const updateUserEmail = async (email) => {
  // API search
  const { data } = await api.patch('/users/me/email', { email });
  return data;
};

// Deletes user via uid (used for rollbacks)
export const deleteUserByUid = async (uid) => {
  // API search
  const { data } = await api.delete(`/users/${uid}`);
  return data;
};

// Deletes user (anonymizes it)
export const deleteUser = async () => {
  // API search
  const { data } = await api.delete('/users/me');
  return data;
};

// Adds email authentication
export const addEmailAuthentication = async ({
  email,
  password,
  confirmPassword,
}) => {
  // API search
  const { data } = await api.patch('/users/me/email', {
    email,
    password,
    confirmPassword,
  });
  return data;
};

// Updates user configuration (anonymizes it)
export const userConfiguration = async (configuration) => {
  // API search
  const { data } = await api.put('/users/me/configuration', { configuration });
  return data;
};

// Bans a user
export const banUser = async (uid, rid, reason) => {
  const { data } = await api.post(`/users/${uid}/ban`, { rid, reason });
  return data;
};
