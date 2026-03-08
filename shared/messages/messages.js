export const messages = {
  ///// Common messages
  //// Error
  CONNECTION_ERROR: 'Connection error, please check your network.',
  FIELD_INTEGER: (field) => `${field} must be an integer.`,
  FIELD_NOT_VALID: (field) => `Please, enter a valid ${field}.`,
  FIELD_NUMBER: (field) => `${field} must be a number.`,
  FIELD_POSITIVE: (field) => `${field} must be positive.`,
  FIELD_TOO_LONG: (field, max) =>
    `${field} must be shorter than ${max} characters.`,
  FIELD_TOO_SHORT: (field, min) =>
    `${field} must be longer than ${min} characters.`,
  FIELD_REQUIRED: 'This field is required.',
  FORBIDDEN: 'Action is not authorized.',
  UNAUTHORIZED_ERROR: 'User is not authorized for this action.',
  UNEXPECTED_ERROR: 'Unexpected error.',

  ///// User messages
  //// Sign up
  /// Info
  /// Errors
  // Validation errors
  CONFIRM_PASSWORD: 'Please, confirm password.',
  EMAIL_USERNAME_NOT_PROVIDED: 'Username or email must be provided.',
  FIREBASE_UID_REQUIRED: 'Firebase UID is required.',
  PASSWORDS_NOT_MATCH: 'Passwords do not match.',
  USERNAME_INVALID_CHARACTERS:
    'Username must only contain letters, numbers or [._-]. ',

  // Server errors
  EMAIL_ALREADY_EXISTS: (email) => `User with email ${email} already exists.`,
  EMAIL_NOT_FOUND: (email) => `User with email ${email} not found.`,
  USERNAME_ALREADY_EXISTS: (username) => `Username ${username} already in use.`,
  USERNAME_NOT_FOUND: (username) => `Username ${username} not found.`,
  COULD_NOT_CREATE_NEW_ACCOUNT: 'Could not create new account.',

  //// Log In
  /// Info
  /// Errors
  // Validation errors
  // Server errors
  INVALID_CREDENTIALS: 'Invalid credentials.',
  PASSWORD_WRONG: 'Wrong password.',
  COULD_NOT_LOG_IN: 'Could not log in.',

  ///// Mission messages
  //// Get all paginated
  /// Info
  NO_MISSIONS: 'There is no missions yet.',
  /// Errors
  // Validation errors
  // Server errors
};
