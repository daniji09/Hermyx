export class AppError extends Error {
  constructor(message, status = 400, field = 'general') {
    super(message);
    this.status = status;
    this.field = field;
    Error.captureStackTrace(this, this.constructor);
  }
}
