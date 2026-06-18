import api from '../config/api';

// Creates new user
export const createUser = async (user) => {
  // API search
  const { data } = await api.post('/users', user);

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

// Finds user via FirebaseUid
export const getUserByFirebaseUid = async (firebaseUid) => {
  // API search
  const { data } = await api.get(`/users/firebase/${firebaseUid}`);
  return data.user;
};
