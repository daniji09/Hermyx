import { consts } from '../consts/consts.js';

export const messages = {
  /// General messages
  GENERAL: {
    CONNECTION_ERROR: `Connection error, please check your network.`,
    FIELD_INTEGER: (field) => `${field} must be an integer.`,
    FIELD_NOT_VALID: (field) => `Please, enter a valid ${field}.`,
    FIELD_NUMBER: (field) => `${field} must be a number.`,
    FIELD_POSITIVE: (field) => `${field} must be positive.`,
    FIELD_REQUIRED: (field) => `${field} is required.`,
    FIELD_TOO_BIG: (field, max) => `${field} can't be greater than ${max}.`,
    FIREBASE_AUTH_ERROR: `Firebase Auth error.`,
    FORBIDDEN_BAN_USER: `This user is banned from Hermyx.`,
    INCOMPLETE_PAGINATION: `Pagination is incomplete. Please send both 'page' and 'limit'.`,
    INCOMPLETE_PETITION: (field1, field2) =>
      `Incomplete petition. Please send ${field1} and ${field2} together.`,
    OPERATION_ERROR: `Operation ended abruptly.`,
    TOO_MANY_ATTEMPTS: `Too many attempts. Please, try later.`,
    UNEXPECTED_ERROR: `Unexpected error.`,
  },

  /// Auth messages
  AUTH: {
    FIREBASE_ERRORS: {
      CREDENTIAL_ALREADY_IN_USE: `This Google account is already linked to another Hermyx account`,
      NO_SUCH_PROVIDER: `The user isn't linked to the provider or the provider doesn't exist.`,
    },
    LOGIN: {
      NO_EMAIL_OR_USERNAME: `You must provide an e-mail or a username.`,
      INVALID_CREDENTIALS: `Invalid credentials.`,
      COULD_NOT_LOG_IN: `Could not log in.`,
    },
    SIGNUP: {
      CONFIRM_PASSWORD: 'Please, confirm password.',
      PASSWORDS_NOT_MATCH: 'Passwords do not match.',
      EMAIL_ALREADY_EXISTS: (email) =>
        `User with email ${email} already exists.`,
      USERNAME_ALREADY_EXISTS: (username) =>
        `Username ${username} already in use.`,
      COULD_NOT_CREATE_NEW_ACCOUNT: 'Could not create new account.',
    },
  },

  /// User messages
  USER: {
    USERNAME: {
      INVALID_CHARACTERS: `Username must start with a letter or number, and may contain [._-].`,
      USERNAME_NOT_FOUND: (username) => `Username ${username} not found.`,
    },
    PASSWORD: {
      UPPERCASE: 'Password must include at least one uppercase letter.',
      LOWERCASE: 'Password must include at least one lowercase letter.',
      NUMBER: 'Password must include at least one number.',
      SYMBOL: 'Password must include at least one symbol (e.g., !@#$%_-).',
    },
    GENERAL: {
      USERS_NOT_FOUND: `Users not found.`,
    },
  },

  /// Mission messages
  MISSION: {
    GENERAL: { MISSIONS_NOT_FOUND: `Missions not found.` },
    TYPE: { INVALID_MISSION_TYPE: `Invalid type of mission.` },
  },

  ///// Common messages
  //// Error
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
  SYSTEM_FORBIDDEN: 'Action is only authorize for the system.',

  UNAUTHORIZED_ERROR: 'User is not authorized for this action.',

  ///// User messages
  //// Sign up
  // Validation errors

  FIREBASE_UID_REQUIRED: 'Firebase UID is required.',

  // Server errors

  EMAIL_NOT_FOUND: (email) => `User with email ${email} not found.`,

  USER_NOT_FOUND: `User not found.`,

  //// Get users
  FIREBASE_UID_NOT_FOUND: (firebaseUid) =>
    `Username with Firebase Uid ${firebaseUid} not found.`,

  ///// Mission messages
  //// General
  MISSION_NOT_FOUND: 'Mission not found.',

  //// Get all paginated
  NO_MISSIONS: 'There is no missions yet.',
  MISSIONS_NOT_FOUND: 'Missions not found.',

  /// Mission participation
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
  MISSION_REVIEW_COMPLETED_REQUIRED: 'Only completed missions can be reviewed.',
  CANNOT_DISPUTE_PARTICIPATION_STATE: `Can't dispute participation on current state`,
  CANNOT_REJECT_PARTICIPATION_STATE: `Can't reject participation on current state`,
  CANNOT_ACCEPT_PARTICIPATION_STATE: `Can't accept participation on current state`,
  CANNOT_REOPEN_PARTICIPATION_STATE: `Can't reopen participation on current state`,
  CANNOT_JOIN_PARTICIPATION_STATE: `Can't join participation on current state`,
  CANNOT_SUBMIT_UNPAID: `Not completely paid adventurer can't submit their part.`,

  //// Create mission
  MISSION_SAME_TITLE: 'You already have a mission titled like this.',
  MISSION_VACANCIES_SURPASSED: `You are adding more than ${consts.MISSION.VACANCIES.MAX} vacancies.`,
  MISSION_PHOTO_TOO_BIG: `Each photo must weight less than 5MB`,
  MISSION_PHOTO_INVALID_TYPE: `Photo format is invalid, please use .jpg, .png or .webp.`,
  MISSION_PHOTOS_SURPASSED: `You are adding more than ${consts.MISSION.PHOTOS.MAX} photos.`,

  //// Edit mission
  CANNOT_DELETE_EXISTING_VACANCIES: `You can't delete vacancies because the mission is already in progress.`,
  CANNOT_EDIT_MISSION: `Mission can't be edited on current state.`,
  CANNOT_EDIT_VACANCY: `Vacancy can't be edited on current state.`,

  //// Close mission
  CLOSE_WITHOUT_ADVENTURERS: `You can't close a mission without adventurers.`,
  CANNOT_CLOSE_STATE: `Can't close mission on current state.`,

  //// Join mission
  JOIN_OWN_MISSION: `You can't join your own mission.`,
  MISSION_FILLED:
    'There are no vacancies open left in this mission. Try another one!',
  MISSION_ALREADY_JOINED: 'You have already joined this mission!',
  VACANCY_NOT_FOUND: 'Vacancy not found.',
  VACANCY_NOT_IN_MISSION: `This vacancy doesn't correspond to this mission.`,
  VACANCY_NOT_JOINED: `Couldn't join vacancy.`,
  MISSION_NOT_JOINED: `Couldn't join mission.`,
  ADVENTURER_BANK_ACCOUNT_NOT_CONFIGURED: `Before joining your first mission, please, configure your bank account so you can handle your earnings!`,
  REQUEST_ALREADY_SENT: `You have already sent a join request for this vacancy.`,

  /// Unjoin mission
  VACANCY_NOT_JOINED_BY_USER: `You can't unjoin a vacancy you are not in.`,
  CANNOT_UNJOIN_IN_PROGRESS_MISSION: `You can't unjoin a mission that has already closed.`,
  CANNOT_UNJOIN_VACANCY_STATE: `Vacancy can't be unjoined on current state.`,

  /// Invite to mission
  CANNOT_INVITE_YOURSELF: `You can't invite yourself.`,
  VACANCY_ALREADY_OCCUPIED: `This vacancy is already occupied.`,
  NO_VACANCIES_AVAILABLE: `There is no vacancies available.`,

  /// Delete mission
  CANNOT_DELETE_MISSION: `Can't delete mission.`,
  CANNOT_DELETE_MISSION_STATE: `Can't delete mission on current state.`,
  CANNOT_CANCEL_MISSION_STATE: `Can't cancel mission on current state.`,

  /// Reopen mission
  CANNOT_REOPEN_MISSION_STATE: `Can't reopen mission on current state.`,
  CANNOT_REOPEN_MISSION_WITHOUT_EMPTY_VACANCIES: `Can't reopen mission with no empty vacancies that can be filled.`,
  CANNOT_REOPEN_MISSION: `Can't reopen mission.`,

  /// Finish mission
  CANNOT_FINISH_ADVENTURERS_IN_PROGRESS: `Can't finish mission because there are adventurers that have not finished yet.`,
  CANNOT_FINISH_MISSION_STATE: `Can't finish mission on current state.`,
  CANNOT_FINISH: `Can't finish mission`,

  /// Pay mission
  CANNOT_PAY_MISSION_STATE: `Can't pay mission on current state.`,
  STRIPE_ONBOARDING_NOT_COMPLETED:
    'You have not completed the Stripe onboarding yet.',

  /// Ban mission
  CANNOT_DELETE_VACANCIES: `Couldn't delete every occupied vacancy, please try again.`,

  //// Profile
  ///Info
  PROFILE_UPDATED_SUCCESSFULLY: 'Profile updated successfully.',
  EMAILS_NOT_MATCH: 'E-mails do not match.',
  COULD_NOT_UPDATE_EMAIL: 'Could not create update e-mail.',
  COULD_NOT_UPDATE_PASSWORD: 'Could not create update password.',
  COULD_NOT_LINK_GOOGLE_ACCOUNT: `Could not link Google account.`,
  COULD_NOT_UNLINK_GOOGLE_ACCOUNT: `Could not unlink Google account.`,

  COULD_NOT_ADD_EMAIL_AUTHENTICATION: `Could not add new e-mail authentication.`,

  CHANGING_EMAIL_TO_CURRENT:
    'The new email cannot be the same as your current one.',
  NO_IMAGE_PROVIDED: 'No image provided',

  //// Notification
  PENDING_NOTIFICATION_EXISTS:
    'There is already a pending notification for this user.',
  RECEIVER_NOT_FOUND: `Receiver not found.`,
  NOTIFICATION_NOT_FOUND: 'Notification not found.',
  NOTIFICATION_NOT_PENDING: (status) =>
    `This notification has already been ${status}.`,
  INVALID_NOTIFICATION_ACTION: 'Invalid notification action.',
  INVALID_RESPONSE_ACTION: 'Invalid response action',
  NOTIFICATION_NOT_ASSOCIATED_WITH_VACANCY:
    'This notification is not associated with a mission vacancy.',

  //// Reports
  ADVENTURER_ALREADY_REPORTED: `You already have an active report for this adventurer. Our team is checking it.`,
  APPLICANT_ALREADY_REPORTED: `You already have an active report for this applicant. Our team is checking it.`,
  USER_ALREADY_REPORTED: `You already have an active report for this user. Our team is checking it.`,
  MISSION_CLOSED_BY_REPORT: `This mission has already been close by a report.`,
  MISSION_ALREADY_REPORTED: `You already have an active report for this mission. Our team is checking it.`,
  REPORTS_NOT_FOUND: `Reports not found.`,
  REPORT_NOT_FOUND: `Report not found.`,
  USER_ALREADY_BANNED: `User already banned.`,
  VACANCY_NOT_DISPUTED: `This vacancy is not disputed currently.`,
  INCORRECT_ANSWER_FOR_REPORT: `This type of report can't be answered like this.`,
  REPORT_ALREADY_ANSWERED: `Can't answer a report that has been already answered.`,
};
