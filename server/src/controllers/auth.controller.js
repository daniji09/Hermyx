import * as authService from '../services/auth.service.js';

/// Controller functions
// Signup
export const signup = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const user = await authService.signup(email, username, password);
    return res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (req, res, next) => {
  try {
    const { email, username, password } = req.body;
    const token = await authService.login(email, username, password);
    return res.status(200).json({ token });
  } catch (error) {
    next(error);
  }
};

// Sync with Google
export const syncGoogle = async (req, res, next) => {
  try {
    const { email, username, firebaseUid } = req.body;
    const { user, isLogin } = await authService.syncGoogle(
      email,
      username,
      firebaseUid,
    );
    return res.status(isLogin ? 200 : 201).json({ user });
  } catch (error) {
    next(error);
  }
};
