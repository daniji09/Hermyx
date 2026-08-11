export class AppError extends Error {
  constructor(message, status = 400, field = 'general') {
    super(message); // Calls native constructor

    this.status = status;
    this.field = field;

    // Captures stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}
