import api from '../config/api';

// Creates new user
export const createUser = async (user) => {
  // API search
  const { data } = await api.post('/users', user);

  return data;
};

// Handles google sync
export const syncUserWithGoogleAccount = async (
  email,
  username,
  firebaseUid,
  isNewUser,
) => {
  const { data } = await api.post('/users/sync-google', {
    email,
    username,
    firebaseUid,
    isNewUser,
  });

  return data;
};

// Finds user via username
export const getUserByUsername = async (username) => {
  // API search
  const { data } = await api.get('/users', {
    params: { username },
  });

  return data.user;
};
