export const messages = {
  ///// Common messages
  //// Error
  CONNECTION_ERROR: 'Connection error, please check your network.',
  FIELD_NOT_VALID: (field) => `Please, enter a valid ${field}.`,
  FIELD_NUMBER: (field) => `${field} must be a number.`,
  FIELD_POSITIVE: (field) => `${field} must be positive.`,
  FIELD_INTEGER: (field) => `${field} must be an integer.`,
  FIELD_TOO_SMALL: (field, min) => `${field} can't be less than ${min}.`,
  FIELD_TOO_BIG: (field, max) => `${field} can't be greater than ${max}.`,
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
  // Validation errors
  PASSWORD_UPPERCASE: 'Password must include at least one uppercase letter.',
  PASSWORD_LOWERCASE: 'Password must include at least one lowercase letter.',
  PASSWORD_NUMBER: 'Password must include at least one number.',
  PASSWORD_SYMBOL: 'Password must include at least one symbol (e.g., !@#$%_-).',
  CONFIRM_PASSWORD: 'Please, confirm password.',
  EMAIL_USERNAME_NOT_PROVIDED: 'Username or email must be provided.',
  FIREBASE_UID_REQUIRED: 'Firebase UID is required.',
  PASSWORDS_NOT_MATCH: 'Passwords do not match.',
  USERNAME_INVALID_CHARACTERS:
    'Username must start with a letter or number, and may contain [._-].',

  // Server errors
  EMAIL_ALREADY_EXISTS: (email) => `User with email ${email} already exists.`,
  EMAIL_NOT_FOUND: (email) => `User with email ${email} not found.`,
  USERNAME_ALREADY_EXISTS: (username) => `Username ${username} already in use.`,
  USERNAME_NOT_FOUND: (username) => `Username ${username} not found.`,
  COULD_NOT_CREATE_NEW_ACCOUNT: 'Could not create new account.',

  //// Log In
  // Server errors
  INVALID_CREDENTIALS: 'Invalid credentials.',
  PASSWORD_WRONG: 'Wrong password.',
  COULD_NOT_LOG_IN: 'Could not log in.',

  //// Get users
  FIREBASE_UID_NOT_FOUND: (firebaseUid) =>
    `Username with Firebase Uid ${firebaseUid} not found.`,

  //// Get user missions
  INVALID_MISSION_TYPE: 'Invalid type of mission.',

  ///// Mission messages
  //// General
  MISSION_NOT_FOUND: 'Mission not found.',

  //// Get all paginated
  NO_MISSIONS: 'There is no missions yet.',
  MISSIONS_NOT_FOUND: 'Missions not found.',

  //// Create mission
  MISSION_SAME_TITLE: 'You already have a mission titled like this.',

  //// Start mission
  START_WITHOUT_ADVENTURERS: `You can't close a mission without adventurers.`,

  //// Join mission
  JOIN_OWN_MISSION: `You can't join your own mission.`,
  MISSION_FILLED:
    'There are no vacancies open left in this mission. Try another one!',
  MISSION_ALREADY_JOINED: 'You have already joined this mission!',
};
