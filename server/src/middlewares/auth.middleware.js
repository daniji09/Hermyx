import { messages } from '@hermyx/shared';
import { verifyIdToken } from '../services/auth.service.js';
import { getByFirebaseUid } from '../models/app_user.model.js';

export const verifyToken = async (req, res, next) => {
  // ID token is retrieved
  const authHeader = req.headers.authorization;

  // If it does not exist or is invalid, an error is returned
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ errors: { general: [messages.UNAUTHORIZED_ERROR] } });
  }

  // ID token is retrieved
  const token = authHeader.split(' ')[1];

  try {
    // Firebase verifies that the token is real, is not expired and is not faked
    const decodedToken = await verifyIdToken(token);

    // User is saved
    req.user = await getByFirebaseUid(decodedToken.user_id);

    if (!req.user) {
      return res
        .status(401)
        .json({ errors: { general: [messages.UNAUTHORIZED_ERROR] } });
    }

    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ errors: { general: [messages.FORBIDDEN] } });
  }
};
