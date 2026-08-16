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
    FIELD_TOO_LONG: (field, max) =>
      `${field} must be shorter than ${max} characters.`,
    FIELD_TOO_SMALL: (field, min) => `${field} can't be less than ${min}.`,
    FIREBASE_AUTH_ERROR: `Firebase Auth error.`,
    FORBIDDEN_BAN_USER: `This user is banned from Hermyx.`,
    INCOMPLETE_PAGINATION: `Pagination is incomplete. Please send both 'page' and 'limit'.`,
    INCOMPLETE_PETITION: (field1, field2) =>
      `Incomplete petition. Please send ${field1} and ${field2} together.`,
    NO_IMAGE_PROVIDED: `No image provided`,
    OPERATION_ERROR: `Operation ended abruptly.`,
    STRIPE_CUSTOMER_ERROR: `Error managing Stripe customer account.`,
    STRIPE_ONBOARDING_NOT_COMPLETED: `You have not completed the Stripe onboarding yet.`,
    TOO_MANY_ATTEMPTS: `Too many attempts. Please, try later.`,
    TOO_MANY_FILES: `You sent too many files for this field, or its name is incorrect.`,
    UNAUTHORIZED_ERROR: `User is not authorized for this action.`,
    UNEXPECTED_ERROR: `Unexpected error.`,
    UNSUPPORTED_FILE_FORMAT: `Photo format is invalid, please use .jpg, .png or .webp.`,
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
    GENERAL: {
      USERS_NOT_FOUND: `Users not found.`,
      USER_NOT_FOUND: `User not found.`,
    },
    USERNAME: {
      INVALID_CHARACTERS: `Username must start with a letter or number, and may contain [._-].`,
      USERNAME_NOT_FOUND: (username) => `Username ${username} not found.`,
    },
    EMAIL: {
      EMAIL_NOT_FOUND: (email) => `Email ${email} not found.`,
    },
    PASSWORD: {
      UPPERCASE: 'Password must include at least one uppercase letter.',
      LOWERCASE: 'Password must include at least one lowercase letter.',
      NUMBER: 'Password must include at least one number.',
      SYMBOL: 'Password must include at least one symbol (e.g., !@#$%_-).',
    },
  },

  /// Mission messages
  MISSION: {
    GENERAL: {
      MISSION_NOT_FOUND: `Mission not found.`,
      MISSIONS_NOT_FOUND: `Missions not found.`,
      VACANCY_NOT_IN_MISSION: `This vacancy is not in this mission.`,
    },
    VACANCY: {
      NOT_FOUND: `Vacancy not found`,
      ALREADY_MODIFIED: `Vacancy already modified`,
    },
    TYPE: { INVALID_MISSION_TYPE: `Invalid type of mission.` },
    GET_ALL: {
      MIN_PAYMENT_GREATER_MAX_PAYMENT: `Min payment cannot be greater than max payment.`,
    },
    PUBLISH: {
      MISSION_PHOTO_TOO_BIG: `Each photo must weight less than 5MB`,
      MISSION_PHOTO_INVALID_TYPE: `Photo format is invalid, please use .jpg, .png or .webp.`,
      MISSION_WITH_SAME_TITLE: `You already have a mission titled like this.`,
    },
    EDIT: {
      CANNOT_DELETE_EXISTING_VACANCIES: `You can't delete vacancies when the mission is not opened anymore.`,
      CANNOT_EDIT_MISSION: `Mission can't be edited on current state.`,
      CANNOT_EDIT_VACANCY: `Vacancy can't be edited on current state.`,
    },
    CLOSE: {
      CANNOT_WITHOUT_ADVENTURERS: `You can't close a mission without adventurers.`,
      CANNOT_ON_CURRENT_STATE: `Can't close mission on current state.`,
    },
    REOPEN: {
      CANNOT_CLOSE_ON_CURRENT_STATE: `Can't close reopened mission on current state.`,
      CANNOT_WITHOUT_EMPTY_VACANCIES: `Can't reopen mission with no empty vacancies that can be filled.`,
      CANNOT_REOPEN: `Can't reopen mission.`,
      CANNOT_ON_CURRENT_STATE: `Can't reopen mission on current state.`,
    },
    JOIN: {
      OWN_MISSION: `You can't join your own mission.`,
      NOT_ACCEPTS_ADVENTURERS: `This mission is no longer accepting adventurers.`,
      FILLED: `There are no vacancies open left in this mission. Try another one!`,
      ALREADY_JOINED: `You have already joined this mission`,
      REQUEST_ALREADY_SENT: `You have already sent a join request for this vacancy.`,
      ADVENTURER_BANK_ACCOUNT_NOT_CONFIGURED: `Before joining your first mission, please, configure your bank account so you can handle your earnings!`,
      FAILED: `Couldn't join vacancy.`,
    },
    INVITE: {
      CANNOT_INVITE_YOURSELF: `You can't invite yourself.`,
      VACANCY_ALREADY_OCCUPIED: `This vacancy is already occupied.`,
      NO_VACANCIES_AVAILABLE: `There is no vacancies available.`,
      INVITATION_ALREADY_SENT: `You have already sent an invitation for this vacancy to this user.`,
    },
    UNJOIN: {
      VACANCY_NOT_JOINED_BY_USER: `You can't unjoin a vacancy you are not in.`,
      CANNOT_IN_PROGRESS_MISSION: `You can't unjoin a mission that has already closed.`,
      CANNOT_IN_CURRENT_VACANCY_STATE: `Vacancy can't be unjoined on current state.`,
    },
    SUBMIT_PARTICIPATION: {
      MISSION_PART_ALREADY_SUBMITTED: `Your have already submitted your participation.`,
      CANNOT_SUBMIT_UNPAID: `Not completely paid adventurer can't submit their part.`,
      CANNOT_IN_CURRENT_STATE: `Cannot submit participation in current mission state`,
    },
    DELETE: {
      CANNOT_DELETE_MISSION: `Can't delete mission.`,
      CANNOT_DELETE_MISSION_STATE: `Can't delete mission on current state.`,
      CANNOT_CANCEL_MISSION_STATE: `Can't cancel mission on current state.`,
    },
    FINISH: {
      CANNOT_ADVENTURERS_IN_PROGRESS: `Can't finish mission because there are adventurers that have not finished yet.`,
      CANNOT_IN_CURRENT_MISSION_STATE: `Can't finish mission on current state.`,
      CANNOT_FINISH: `Can't finish mission`,
    },
  },

  /// Payment messages
  PAYMENT: {
    GENERAL: {
      PAYMENT_METHOD_NOT_FOUND: `Payment method not found.`,
      PAYMENT_METHOD_NOT_FROM_USER: `Payment method does not belong to the current user.`,
      NO_DEFAULT_CARD: `User doesn't have a default card selected.`,
      PAYMENT_NOT_FROM_USER: `Payment does not belong to the current user.`,
      PAYMENT_NOT_SUCCEEDED: (status) =>
        `Payment was not completed (status=${status})`,
    },
    CONFIRM_PAYMENT: {
      CANNOT_PAY_MISSION_STATE: `Can't pay mission on current state.`,
      STRIPE_ONBOARDING_NOT_COMPLETED:
        'You have not completed the Stripe onboarding yet.',
    },
  },

  /// Notification messages
  NOTIFICATION: {
    GENERAL: {
      NOT_FOUND: `Notification not found.`,
      NOTIFICATION_NOT_PENDING: (status) =>
        `This notification has already been ${status.toLowerCase()}.`,
      INVALID_NOTIFICATION_ACTION: `Invalid notification action.`,
      INVALID_RESPONSE_ACTION: `Invalid response action`,
      NOT_ASSOCIATED_WITH_VACANCY: `This notification is not associated with a mission vacancy.`,
    },
    RESPOND_TO_SUBMIT_PARTICIPATION: {
      // General
      CANNOT_SUBMIT_PARTICIPATION: `Cannot respond to participation submit on current state.`,
      ALREADY_REVIEWED: `This participation has already been reviewed.`,
      MISSION_PARTICIPATION_REVISION_REQUESTED_SUCCESSFULLY: `Participation revision requested successfully.`,

      // Disputed
      REQUIRES_RETRY:
        'Participation can only be disputed by the owner after a retry.',
      CANNOT_DISPUTE_PARTICIPATION_STATE: `Can't dispute participation on current state`,
      MISSION_PARTICIPATION_DISPUTED_SUCCESSFULLY: `Participation disputed successfully.`,

      // Accepted
      ACCEPTED_SUCCESSFULLY: `Participation accepted successfully.`,

      // Rejected
      CANNOT_REJECT_PARTICIPATION_STATE: `Can't reject participation on current state`,
    },
    RESPOND_TO_PARTICIPATION_REJECTION: {
      // General
      ALREADY_REVIEWED: `This participation rejection has already been reviewed.`,

      // Accepted
      ACCEPTED_SUCCESSFULLY: `Participation rejection revision accepted successfully.`,
    },
    RESPOND_TO_NEW_MONETARY_REWARD_OFFER: {
      // Accepted
      ACCEPTED_SUCCESSFULLY: `New monetary reward offer was accepted successfully.`,

      // Rejected
      REJECTED_SUCCESSFULLY: `New monetary reward offer was rejected successfully.`,
    },

    // Messages sent to users in a notification
    MISSION_EDIT: {
      MISSION_INFO_CHANGED: (title, changes) =>
        `${title} info has been changed: ${changes.join(', ')}. Check it out!`,
      VACANCY_INFO_CHANGED: (title, changes) =>
        `Your vacancy at ${title} info has been changed: ${changes.join(', ')}. Check it out!`,
      NEW_REWARD_OFFER: (title, oldReward, newReward) =>
        `A new monetary reward offer at ${title} has been made: ${oldReward}€ -> ${newReward}€. Accept or reject it!`,
    },
    MISSION_CLOSE: {
      CLOSED: (title) =>
        `Mission ${title} has been closed. Waiting for owner payment to start. You can't unjoin anymore, but owner is able to cancel it yet.`,
      CLOSE_AFTER_REOPENED_NEW_ADVENTURERS: (title) =>
        `Mission ${title} has been closed after being reopened.  Waiting for owner payment to start new adventurers.`,
      CLOSE_AFTER_REOPENED_NO_NEW_ADVENTURERS: (title) =>
        `Mission ${title} has been closed after being reopened. No new adventurers have joined.`,
    },
    SUBMIT_PARTICIPATION: (title, username) =>
      `The participation in "${title}" was submitted by ${username}.`,
    UNJOIN_MISSION: (username, vacancyTitle, missionTitle) =>
      `Adventurer ${username} fled the vacancy ${vacancyTitle} from your mission ${missionTitle}.`,
    DELETE_MISSION: (title) =>
      `Mission ${title} has been deleted, so it won't be done, we are sorry.`,
    CANCEL_MISSION: {
      SUCCESSFUL: (title) =>
        `Mission ${title} has been cancelled, but don't worry, your reward is on your way!.`,
      ISSUED: (title) =>
        `Mission ${title} has been cancelled. We had an issue transferring your compensation. Please contact support.`,
    },
    REOPEN_MISSION: (title) =>
      `Mission ${title} has been reopened, so new teammates will enter!`,
    MISSION_STARTED: (title) =>
      `Mission ${title} has started! Talk to your team and start working.`,
    MISSION_NEGOTIATION_EXTRA: (title) =>
      `Your new monetary reward for ${title} has been funded. Now you can submit your part!`,
    MISSION_RESTARTED: (title) =>
      `Mission ${title} has started for you! Talk to your team and start working.`,
    DISPUTE_PARTICIPATION: (title, username) =>
      `A dispute was opened for "${title}" by applicant ${username}.`,
    DISPUTE_REJECTED_PARTICIPATION: (title, username) =>
      `Adventurer ${username} opened a dispute for "${title}".`,
    REJECT_PARTICIPATION: (title, username) =>
      `Your participation in "${title}" was rejected by ${username}. Please accept the revision or open a dispute.`,
    ACCEPT_PARTICIPATION: {
      AUTOMATIC: (title) =>
        `Your participation in "${title}" was approved automatically by the system after it wasn't reviewed on time (one week).`,
      SUCCESSFUL: (title, username) =>
        `Your participation in "${title}" was approved by ${username}.`,
      ISSUED: (title, username) =>
        `Your participation in "${title}" was approved by ${username}. We had an issue transferring your payment. Please contact support.`,
    },
    JOIN_MISSION_DECISION: {
      REQUEST: {
        ACCEPTED: (title) =>
          `Your request to join "${title}" was accepted. You are now part of the team!`,
        REJECTED: (title) =>
          `Your request to join "${title}" was rejected. Don't let your self down, some other team is searching for you!`,
      },
      INVITATION: {
        ACCEPTED: (title) =>
          `Your invitation to join "${title}" was accepted. Welcome your new adventurer!`,
        REJECTED: (title) =>
          `Your invitation to join "${title}" was rejected. Keep searching for others!`,
      },
    },
    MONETARY_REWARD_EDITION: {
      REJECTED: (username, title, current, offer) =>
        `${username} rejected your new monetary reward offer for "${title}": ${current} -> ${offer}`,
      ACCEPTED: {
        SUCCESSFUL: (username, title, current, offer) =>
          `${username} accepted your new monetary reward offer for "${title}": ${current} -> ${offer}`,
        ISSUED: (username, title, current, offer) =>
          `${username} accepted your new monetary reward offer for "${title}": ${current} -> ${offer}.  We had an issue transferring your refund. Please contact support.`,
      },
    },
    REPORT_ADVENTURER: (title) =>
      `You have been reported by the applicant of the ${title} mission. You can respond in the dispute conversation.`,
    ADVENTURER_WORK_ACCEPTED: {
      TO_ADVENTURER: {
        SUCCESSFUL: (title) =>
          `Your participation in "${title}" was approved by the administration after resolving the dispute. Reward is being payed to you!`,
        ISSUED: (title) =>
          `Your participation in "${title}" was approved by the administration after resolving the dispute. We had an issue transferring your refund. Please contact support.`,
      },
      TO_APPLICANT: (vacancyTitle, username, missionTitle) =>
        `Participation ${vacancyTitle} disputed by ${username} in mission ${missionTitle} was accepted by the administration. Reward is being payed to the adventurer.`,
    },
    ADVENTURER_WORK_REJECTED: {
      TO_ADVENTURER: (title) =>
        `Your participation in "${title}" was rejected by the administration after resolving the dispute. The vacancy is in progress again.`,
      TO_APPLICANT: (vacancyTitle, username, missionTitle) =>
        `Participation ${vacancyTitle} disputed by ${username} in mission ${missionTitle} was rejected by the administration. The vacancy is in progress again.`,
    },
    DISMISS: {
      REPORT_ADVENTURER: (username, title) =>
        `Your report on adventurer ${username} from mission ${title} has been dismissed, so they will not be kicked out.`,
    },
  },

  /// Review messages
  REVIEW: {
    GENERAL: {
      MISSION_REVIEW_NOT_ALLOWED: `Only the mission owner can review adventurers from a completed mission.`,
      MISSION_REVIEW_ALREADY_EXISTS: `This adventurer has already been reviewed for this mission.`,
    },
  },

  /// Report messages
  REPORT: {
    GENERAL: {
      REPORT_NOT_FOUND: `Report not found.`,
      REPORTS_NOT_FOUND: `Reports not found.`,
      INCORRECT_ANSWER: `This type of report can't be answered like this.`,
      ALREADY_ANSWERED: `Can't answer a report that has been already answered.`,
      VACANCY_NOT_DISPUTED: `This vacancy is not disputed currently.`,
      APPLICANT_ALREADY_REPORTED: `You already have an active report for this applicant. Our team is checking it.`,
    },
    REPORT_ADVENTURER: {
      ACTIVE_REPORT: `You already have an active report for this adventurer. Our team is checking it.`,
    },
    REPORT_USER: {
      ACTIVE_REPORT: `You already have an active report for this user. Our team is checking it.`,
    },
    REPORT_MISSION: {
      ACTIVE_REPORT: `You already have an active report for this mission. Our team is checking it.`,
      CLOSED_BY_REPORT: `This mission has already been close by a report.`,
    },
  },

  /// Conversation messages
  CONVERSATION: {
    GENERAL: {
      CONVERSATION_NOT_FOUND: `Conversation not found`,
      CONVERSATION_WITH_YOURSELF: `You cannot create a conversation with yourself.`,
    },
    // Conversation messages shown in a conversation
    REPORT_ADVENTURER: (username, vacancyTitle, missionTitle) =>
      `A dispute was opened after ${username} was reported for the vacancy "${vacancyTitle}" in "${missionTitle}".`,
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
