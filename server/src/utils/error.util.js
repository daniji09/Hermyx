import { messages } from '@hermyx/shared';

// AppError special class
export class AppError extends Error {
  constructor(message, status = 400, field = 'general') {
    super(message); // Calls native constructor

    this.status = status;
    this.field = field;

    // Captures stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Checks parameters for functions
export const checkRequired = (value, fieldName) => {
  if (value === undefined)
    throw new AppError(messages.GENERAL.FIELD_REQUIRED(fieldName), 400);
};

// Checks whether PostgreSQL rejected a specific unique constraint
export const isUniqueConstraintError = (error, constraint) =>
  error?.code === '23505' && error?.constraint === constraint;
