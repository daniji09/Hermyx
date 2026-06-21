import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  // Base configuration for every petition
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Ten seconds of maximum wait until timeout
  timeout: 10000,
});

// Interceptor for adding ID token to petitions
api.interceptors.request.use(
  async (config) => {
    // Logged user is retrieved
    const user = auth.currentUser;

    // If it exists, its token is retrieved
    if (user) {
      const token = await user.getIdToken();

      // Its putted on the petition headers
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
