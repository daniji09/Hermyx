import { consts, messages } from '@hermyx/shared';

// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, req, res, next) => {
  // Validation errors controlled by service
  if (error.status && error.field) {
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

  // Errors array, deprecated version
  if (error.errors) return res.status(500).json(error.errors);

  // Generic unexpected error
  console.error('Unhandled API Error:', error);
  return res.status(500).json({
    errors: { general: [messages.UNEXPECTED_ERROR] },
  });
};
