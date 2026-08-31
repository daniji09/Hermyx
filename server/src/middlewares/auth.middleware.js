import { messages, USER_ROLE, USER_STATUS } from '@hermyx/shared';
import { verifyIdToken } from '../providers/auth.provider.js';
import * as userService from '../services/user.service.js';

// Verifies logged in user token
export const verifyToken = async (req, res, next) => {
  try {
    // ID token is retrieved
    const authHeader = req.headers.authorization;

    // If it does not exist or is invalid, an error is returned
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ errors: { general: [messages.GENERAL.UNAUTHORIZED_ERROR] } });
    }

    // ID token is retrieved
    const token = authHeader.split(' ')[1];

    // Firebase verifies that the token is real, is not expired and is not faked
    const decodedToken = await verifyIdToken(token, true);

    // User and token are saved
    req.user = await userService.getUserByFirebaseUid(decodedToken.uid);
    req.firebaseToken = decodedToken;

    if (!req.user) {
      return res
        .status(401)
        .json({ errors: { general: [messages.GENERAL.UNAUTHORIZED_ERROR] } });
    }

    if (req.user.status === USER_STATUS.BANNED.ID) {
      return res
        .status(403)
        .json({ errors: { general: [messages.GENERAL.FORBIDDEN_BAN_USER] } });
    }

    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res
      .status(403)
      .json({ errors: { general: [messages.GENERAL.FORBIDDEN] } });
  }
};

// Verifies a token when one is provided, while allowing anonymous requests
export const optionalVerifyToken = (req, res, next) => {
  if (!req.headers.authorization) return next();
  return verifyToken(req, res, next);
};

// Verifies admin token
export const verifyAdmin = async (req, res, next) => {
  // Firebase token is already checked, so only the admin role is checked
  if (
    req.firebaseToken?.admin === true &&
    req.user?.role === USER_ROLE.ADMIN.ID
  ) {
    return next();
  }

  return res
    .status(403)
    .json({ errors: { general: [messages.GENERAL.FORBIDDEN] } });
};

// Verifies that the authenticated account is a regular user
export const verifyRegularUser = (req, res, next) => {
  if (req.user?.role === USER_ROLE.USER.ID && req.firebaseToken?.admin !== true)
    return next();

  return res
    .status(403)
    .json({ errors: { general: [messages.GENERAL.FORBIDDEN] } });
};
