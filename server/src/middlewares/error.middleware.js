import { consts, messages } from '@hermyx/shared';
import multer from 'multer';
import { AppError } from '../utils/error.util.js';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, req, res, next) => {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      errors: { [error.field]: [error.message] },
    });
  }

  if (error.code) {
    const errorBuilder = consts.AUTH?.FIREBASE_ERRORS?.[error.code];
    if (errorBuilder) {
      const mappedError = errorBuilder({ email: req.body?.email });
      return res.status(mappedError.status).json({
        errors: { [mappedError.field]: [mappedError.message] },
      });
    }
  }

  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      errors: { general: [error.message] },
    });
  }

  if (error.errors) return res.status(500).json(error.errors);

  console.error('Unhandled API Error:', error);
  return res.status(500).json({
    errors: {
      general: [
        messages.GENERAL?.UNEXPECTED_ERROR || messages.UNEXPECTED_ERROR,
      ],
    },
  });
};
