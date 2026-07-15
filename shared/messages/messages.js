import { consts } from '../consts/consts.js';

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
  OPERATION_ERROR: 'Operation ended abruptly.',
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
  MISSION_NOT_IN_PROGRESS: 'Mission is not in progress.',
  MISSION_NOT_ACCEPTING_ADVENTURERS:
    'This mission is no longer accepting adventurers.',
  MISSION_PARTICIPATION_REQUIRED:
    'You must be part of this mission to submit your participation.',
  MISSION_PARTICIPATION_NOT_FOUND: 'Mission participation not found.',
  MISSION_PART_ALREADY_SUBMITTED:
    'Your participation has already been submitted.',
  MISSION_PART_SUBMITTED_SUCCESSFULLY: 'Participation submitted successfully.',
  MISSION_PARTICIPATION_NOT_SUBMITTED:
    'This participation has not been submitted yet.',
  MISSION_PARTICIPATION_ALREADY_REVIEWED:
    'This participation has already been reviewed.',
  MISSION_PARTICIPATION_APPROVED_SUCCESSFULLY:
    'Participation approved successfully.',
  MISSION_PARTICIPATION_REJECTED_SUCCESSFULLY:
    'Participation rejected successfully.',
  MISSION_PARTICIPATION_REVISION_REQUESTED_SUCCESSFULLY:
    'Participation revision requested successfully.',
  MISSION_PARTICIPATION_REVISION_ACCEPTED_SUCCESSFULLY:
    'Participation revision accepted successfully.',
  MISSION_PARTICIPATION_DISPUTED_SUCCESSFULLY:
    'Participation disputed successfully.',
  MISSION_PARTICIPATION_DISPUTE_REQUIRES_RETRY:
    'Participation can only be disputed by the owner after a retry.',
  MISSION_REQUIRES_ALL_PARTS_APPROVED:
    'All adventurer participations must be approved before closing the mission.',
  MISSION_REVIEW_CREATED_SUCCESSFULLY: 'Review created successfully.',
  MISSION_REVIEW_ALREADY_EXISTS:
    'This adventurer has already been reviewed for this mission.',
  MISSION_REVIEW_NOT_ALLOWED:
    'Only the mission owner can review adventurers from a completed mission.',
  MISSION_REVIEW_PARTICIPATION_REQUIRED:
    'The adventurer must belong to this mission before being reviewed.',
  MISSION_REVIEW_COMPLETED_REQUIRED:
    'Only completed missions can be reviewed.',

  //// Create mission
  MISSION_SAME_TITLE: 'You already have a mission titled like this.',
  MISSION_VACANCIES_SURPASSED: `You are adding more than ${consts.MISSION.VACANCIES.MAX} vacancies.`,

  //// Edit mission
  CANNOT_DELETE_EXISTING_VACANCIES: `You can't delete vacancies because the mission is already in progress.`,

  //// Start mission
  START_WITHOUT_ADVENTURERS: `You can't start a mission without adventurers.`,

  //// Join mission
  JOIN_OWN_MISSION: `You can't join your own mission.`,
  MISSION_FILLED:
    'There are no vacancies open left in this mission. Try another one!',
  MISSION_ALREADY_JOINED: 'You have already joined this mission!',
  VACANCY_NOT_FOUND: 'Vacancy not found.',
  VACANCY_NOT_JOINED: `Couldn't join vacancy.`,
  MISSION_NOT_JOINED: `Couldn't join mission.`,

  /// Unjoin mission
  VACANCY_NOT_JOINED_BY_USER: `You can't unjoin a vacancy you are not in.`,
  CANNOT_UNJOIN_IN_PROGRESS_MISSION: `You can't unjoin a mission that is already in progress.`,

  /// Delete mission
  CANNOT_DELETE_MISSION: `Can't delete mission.`,
  CANNOT_DELETE_MISSION_STATE: `Can't delete finished missions.`,

  //// Profile
  ///Info
  PROFILE_UPDATED_SUCCESSFULLY: 'Profile updated successfully.',
  EMAILS_NOT_MATCH: 'E-mails do not match.',
  COULD_NOT_UPDATE_EMAIL: 'Could not create update e-mail.',
  COULD_NOT_UPDATE_PASSWORD: 'Could not create update password.',
  COULD_NOT_LINK_GOOGLE_ACCOUNT: `Could not link Google account.`,
  COULD_NOT_UNLINK_GOOGLE_ACCOUNT: `Could not unlink Google account.`,
  NO_SUCH_PROVIDER: `The user isn't linked to the provider or the provider doesn't exist.`,
  COULD_NOT_ADD_EMAIL_AUTHENTICATION: `Could not add new e-mail authentication.`,
  CREDENTIAL_ALREADY_IN_USE:
    'This Google account is already linked to another Hermyx account',
  CHANGING_EMAIL_TO_CURRENT:
    'The new email cannot be the same as your current one.',
};
