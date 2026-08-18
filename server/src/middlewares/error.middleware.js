import { consts, messages } from '@hermyx/shared';
import { AppError } from '../utils/error.util.js';
import multer from 'multer';

// Middleware error handler
// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, req, res, next) => {
  // Validation errors controlled by service
  if (error instanceof AppError) {
    return res.status(error.status).json({
      errors: { [error.field]: [error.message] },
    });
  }

  // Firebase errors
  if (error.code) {
    const errorBuilder = consts.AUTH.FIREBASE_ERRORS[error.code];
    if (errorBuilder) {
      const mappedError = errorBuilder({ email: req.body?.email });
      return res.status(mappedError.status).json({
        errors: { [mappedError.field]: [mappedError.message] },
      });
    }
  }

  // Multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        errors: {
          general: [messages.GENERAL.TOO_MANY_FILES],
        },
      });
    } else if (error.code === 'UNSUPPORTED_FORMAT') {
      return res.status(400).json({
        errors: {
          general: [messages.GENERAL.UNSUPPORTED_FILE_FORMAT],
        },
      });
    }
    return res.status(400).json({
      errors: { general: [error.message] },
    });
  }

  // Errors array, deprecated version
  if (error.errors) return res.status(500).json(error.errors);

  // Generic unexpected error
  console.error('Unhandled API Error:', error);
  return res.status(500).json({
    errors: { general: [messages.GENERAL.UNEXPECTED_ERROR] },
  });
};
