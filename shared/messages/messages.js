export const messages = {
  ///// Common messages
  //// Error
  CONNECTION_ERROR: 'Connection error, please check your network.',
  FIELD_NOT_VALID: (field) => `Please, enter a valid ${field}.`,
  FIELD_TOO_LONG: (field, max) =>
    `${field} must be shorter than ${max} characters.`,
  FIELD_TOO_SHORT: (field, min) =>
    `${field} must be longer than ${min} characters.`,
  FIELD_REQUIRED: 'This field is required.',
  UNEXPECTED_ERROR: 'Unexpected error',

  ///// User messages
  //// Sign up
  /// Info
  /// Errors
  // Validation errors
  CONFIRM_PASSWORD: 'Please, confirm password.',
  EMAIL_USERNAME_NOT_PROVIDED: 'Username or email must be provided.',
  FIREBASE_UID_REQUIRED: 'Firebase UID is required.',
  PASSWORDS_NOT_MATCH: 'Passwords do not match.',

  // Server errors
  EMAIL_ALREADY_EXISTS: (email) => `User with email ${email} already exists.`,
  EMAIL_NOT_FOUND: (email) => `User with email ${email} not found.`,
  USERNAME_ALREADY_EXISTS: (username) => `Username ${username} already in use.`,
  USERNAME_NOT_FOUND: (username) => `Username ${username} not found.`,
  COULD_NOT_CREATE_NEW_ACCOUNT: `Could not create new account.`,
};
