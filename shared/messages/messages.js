import { consts } from '../consts/consts.js';
import { truncateText } from './../../server/src/utils/string.util.js';

export const messages = {
  /// General messages
  GENERAL: {
    CONNECTION_ERROR: `Connection error, please check your network.`,
    FIELD_INTEGER: (field) => `${field} must be an integer.`,
    FIELD_NOT_VALID: (field) => `Please enter a valid ${field}.`,
    FIELD_NUMBER: (field) => `${field} must be a number.`,
    FIELD_POSITIVE: (field) => `${field} must be positive.`,
    FIELD_REQUIRED: (field) => `${field} is required.`,
    FIELD_TOO_BIG: (field, max) => `${field} can't be greater than ${max}.`,
    FIELD_TOO_LONG: (field, max) =>
      `${field} must be shorter than ${max} characters.`,
    FIELD_TOO_SHORT: (field, min) =>
      `${field} must be longer than ${min} characters.`,
    FIELD_TOO_SMALL: (field, min) => `${field} can't be less than ${min}.`,
    FIREBASE_AUTH_ERROR: `Firebase Auth error.`,
    FORBIDDEN: `Action is not authorized.`,
    FORBIDDEN_BAN_USER: `This user is banned from Hermyx.`,
    IMAGE_INVALID_TYPE: `Only .jpeg, .png and .webp images are accepted.`,
    IMAGE_TOO_BIG: `Photo must weigh less than 5MB.`,
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
      EMAIL_NOT_VERIFIED: `Please verify your e-mail before logging in.`,
    },
    EMAIL_VERIFICATION: {
      COULD_NOT_SEND: `Could not send the e-mail verification message.`,
      INVALID_CODE: `This e-mail verification link is invalid or has expired.`,
    },
    PASSWORD_RESET: {
      COULD_NOT_SEND: `Could not send the password reset email.`,
      INVALID_CODE: `This password reset link is invalid or has expired.`,
      COULD_NOT_CHANGE: `Could not change the password.`,
    },
    SIGNUP: {
      CONFIRM_PASSWORD: 'Please confirm your password.',
      PASSWORDS_NOT_MATCH: 'Passwords do not match.',
      EMAIL_ALREADY_EXISTS: (email) =>
        `User with email ${email} already exists.`,
      USERNAME_ALREADY_EXISTS: (username) =>
        `Username ${username} already in use.`,
      COULD_NOT_CREATE_NEW_ACCOUNT: 'Could not create new account.',
      TERMS_REQUIRED: 'You must accept the Hermyx terms and conditions.',
    },
    EMAIL_AUTHENTICATION: {
      COULD_NOT_ADD: `Couldn't add email authentication.`,
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
    UPDATE_EMAIL: {
      EMAILS_NOT_MATCH: `E-mails do not match.`,
    },
    DELETE_ME: {
      ACTIVE_SERVICES: `You can't delete your account while you have active services.`,
      ACTIVE_DISPUTES: `You can't delete your account while you have active disputes.`,
    },
  },

  /// Service messages
  SERVICE: {
    GENERAL: {
      SERVICE_NOT_FOUND: `Service not found.`,
      SERVICES_NOT_FOUND: `Services not found.`,
      ALREADY_MODIFIED: `Service already modified.`,
      VACANCY_NOT_IN_SERVICE: `This vacancy is not in this service.`,
    },
    VACANCY: {
      NOT_FOUND: `Vacancy not found`,
      ALREADY_MODIFIED: `Vacancy already modified`,
    },
    TYPE: { INVALID_SERVICE_TYPE: `Invalid type of service.` },
    GET_ALL: {
      MIN_PAYMENT_GREATER_MAX_PAYMENT: `Min payment cannot be greater than max payment.`,
    },
    PUBLISH: {
      SERVICE_PHOTO_TOO_BIG: `Each photo must weigh less than 5MB.`,
      SERVICE_PHOTO_INVALID_TYPE: `Photo format is invalid; please use .jpg, .png or .webp.`,
      SERVICE_WITH_SAME_TITLE: `You already have a service titled like this.`,
      SERVICE_VACANCIES_SURPASSED: `You are adding more than ${consts.SERVICE.VACANCIES.MAX} vacancies.`,
    },
    EDIT: {
      CANNOT_DELETE_EXISTING_VACANCIES: `You can't delete vacancies when the service is not opened anymore.`,
      CANNOT_EDIT_SERVICE: `Service can't be edited on current state.`,
      CANNOT_EDIT_VACANCY: `Vacancy can't be edited on current state.`,
    },
    CLOSE: {
      CANNOT_WITHOUT_COLLABORATORS: `You can't close a service without collaborators.`,
      CANNOT_ON_CURRENT_STATE: `Can't close service on current state.`,
    },
    REOPEN: {
      CANNOT_CLOSE_ON_CURRENT_STATE: `Can't close reopened service on current state.`,
      CANNOT_WITHOUT_EMPTY_VACANCIES: `Can't reopen service with no empty vacancies that can be filled.`,
      CANNOT_REOPEN: `Can't reopen service.`,
      CANNOT_ON_CURRENT_STATE: `Can't reopen service on current state.`,
    },
    JOIN: {
      OWN_SERVICE: `You can't join your own service.`,
      NOT_ACCEPTS_COLLABORATORS: `This service is no longer accepting collaborators.`,
      FILLED: `There are no vacancies open left in this service. Try another one!`,
      ALREADY_JOINED: `You have already joined this service`,
      REQUEST_ALREADY_SENT: `You have already sent a join request for this vacancy.`,
      COLLABORATOR_BANK_ACCOUNT_NOT_CONFIGURED: `Before joining your first service, please, configure your bank account so you can handle your earnings!`,
      FAILED: `Couldn't join vacancy.`,
    },
    INVITE: {
      CANNOT_INVITE_YOURSELF: `You can't invite yourself.`,
      VACANCY_ALREADY_OCCUPIED: `This vacancy is already occupied.`,
      NO_VACANCIES_AVAILABLE: `There are no vacancies available.`,
      INVITATION_ALREADY_SENT: `You have already sent an invitation for this vacancy to this user.`,
    },
    UNJOIN: {
      VACANCY_NOT_JOINED_BY_USER: `You can't unjoin a vacancy you are not in.`,
      CANNOT_IN_PROGRESS_SERVICE: `You can't unjoin a service that has already closed.`,
      CANNOT_IN_CURRENT_VACANCY_STATE: `Vacancy can't be unjoined on current state.`,
    },
    SUBMIT_PARTICIPATION: {
      SERVICE_PART_ALREADY_SUBMITTED: `You have already submitted your participation.`,
      CANNOT_SUBMIT_UNPAID: `A collaborator who has not been fully paid can't submit their part.`,
      CANNOT_IN_CURRENT_STATE: `Cannot submit participation in current service state`,
    },
    DELETE: {
      CANNOT_DELETE_SERVICE: `Can't delete service.`,
      CANNOT_DELETE_SERVICE_STATE: `Can't delete service on current state.`,
      CANNOT_CANCEL_SERVICE_STATE: `Can't cancel service on current state.`,
      CANNOT_ACTIVE_DISPUTES: `You can't delete this service while it has active disputes.`,
    },
    FINISH: {
      CANNOT_COLLABORATORS_IN_PROGRESS: `Can't finish service because there are collaborators that have not finished yet.`,
      CANNOT_IN_CURRENT_SERVICE_STATE: `Can't finish service on current state.`,
      CANNOT_FINISH: `Can't finish service`,
    },
    BAN: {
      CANNOT_DELETE_VACANCIES: `Couldn't delete every occupied vacancy, please try again.`,
    },
  },

  /// Payment messages
  PAYMENT: {
    GENERAL: {
      PAYMENT_METHOD_NOT_FOUND: `Payment method not found.`,
      PAYMENT_METHOD_NOT_FROM_USER: `Payment method does not belong to the current user.`,
      NO_DEFAULT_CARD: `User doesn't have a default card selected.`,
      PAYMENT_NOT_FROM_USER: `Payment does not belong to the current user.`,
      PAYMENT_NOT_FROM_SERVICE: `Payment does not belong to the current service.`,
      PAYMENT_AMOUNT_MISMATCH: `Payment amount does not match the amount required by the current service.`,
      PAYMENT_NOT_SUCCEEDED: (status) =>
        `Payment was not completed (status=${status})`,
    },
    CONFIRM_PAYMENT: {
      CANNOT_PAY_SERVICE_STATE: `Can't pay service on current state.`,
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
      NOT_ASSOCIATED_WITH_VACANCY: `This notification is not associated with a service vacancy.`,
      CANNOT_ACCEPT_PARTICIPATION_STATE: `Can't accept participation on current state`,
      CANNOT_REOPEN_PARTICIPATION_STATE: `Can't reopen participation on current state`,
      CANNOT_JOIN_PARTICIPATION_STATE: `Can't join participation on current state`,
    },
    RESPOND_TO_SUBMIT_PARTICIPATION: {
      // General
      CANNOT_SUBMIT_PARTICIPATION: `Cannot respond to participation submit on current state.`,
      ALREADY_REVIEWED: `This participation has already been reviewed.`,
      SERVICE_PARTICIPATION_REVISION_REQUESTED_SUCCESSFULLY: `Participation revision requested successfully.`,

      // Disputed
      REQUIRES_RETRY:
        'Participation can only be disputed by the applicant after a retry.',
      CANNOT_DISPUTE_PARTICIPATION_STATE: `Can't dispute participation on current state`,
      SERVICE_PARTICIPATION_DISPUTED_SUCCESSFULLY: `Participation disputed successfully.`,

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
    BAN_USER: {
      REPORT_RESOLVED: (username, reason) =>
        `Your report on user ${username} was accepted, and the user has been banned by Hermyx administration. Reason: ${reason}`,
      OPENED_SERVICE: (username, title) =>
        `Collaborator ${username} of your service ${title} has been banned by Hermyx administration, so this vacancy has been emptied.`,
      CLOSED_SERVICE: {
        SUCCESSFUL: (username, title) =>
          `Collaborator ${username} of your service ${title} has been banned by Hermyx administration, so this vacancy has been emptied. Their reward is being refunded to you.`,
        ISSUED: (username, title) =>
          `Collaborator ${username} of your service ${title} has been banned by Hermyx administration, so this vacancy has been emptied. Their reward is being refunded to you. We had an issue transferring your compensation. Please contact support.`,
      },
    },
    SERVICE_EDIT: {
      SERVICE_INFO_CHANGED: (title, changes) =>
        `${title} info has been changed: ${changes.join(', ')}. Check it out!`,
      VACANCY_INFO_CHANGED: (title, changes) =>
        `Your vacancy at ${title} info has been changed: ${changes.join(', ')}. Check it out!`,
      NEW_REWARD_OFFER: (title, oldReward, newReward) =>
        `A new monetary reward offer at ${title} has been made: ${oldReward}€ -> ${newReward}€. Accept or reject it!`,
    },
    SERVICE_CLOSE: {
      CLOSED: (title) =>
        `Service ${title} has been closed. Waiting for applicant payment to start. You can't unjoin anymore, but applicant is able to cancel it yet.`,
      CLOSE_AFTER_REOPENED_NEW_COLLABORATORS: (title) =>
        `Service ${title} has been closed after being reopened.  Waiting for applicant payment to start new collaborators.`,
      CLOSE_AFTER_REOPENED_NO_NEW_COLLABORATORS: (title) =>
        `Service ${title} has been closed after being reopened. No new collaborators have joined.`,
    },
    REOPEN_SERVICE: (title) =>
      `Service ${title} has been reopened, so new teammates will enter!`,
    SERVICE_STARTED: (title) =>
      `Service ${title} has started! Talk to your team and start working.`,
    SUBMIT_PARTICIPATION: (title, username) =>
      `The participation in "${title}" was submitted by ${username}.`,
    UNJOIN_SERVICE: (username, vacancyTitle, serviceTitle) =>
      `Collaborator ${username} fled the vacancy ${vacancyTitle} from your service ${serviceTitle}.`,
    DELETE_SERVICE: (title) =>
      `Service ${title} has been deleted, so it won't be done, we are sorry.`,
    CANCEL_SERVICE: {
      SUCCESSFUL: (title) =>
        `Service ${title} has been cancelled, but don't worry, your reward is on your way!.`,
      ISSUED: (title) =>
        `Service ${title} has been cancelled. We had an issue transferring your compensation. Please contact support.`,
    },
    BAN_SERVICE: {
      REPORT_RESOLVED: (title, reason) =>
        `Your report on service ${title} was accepted, and the service has been banned by Hermyx administration. Reason: ${reason}`,
      DELETE: `This service has been banned by Hermyx administration, now is retired from the public and won't be done.`,
      CANCEL: {
        SUCCESSFUL: `This service has been banned by Hermyx administration, now is retired from the public and it has been cancelled, so payment will be made to the collaborators.`,
        ISSUED: `This service has been banned by Hermyx administration, now is retired from the public and it has been cancelled, so payment will be made to the collaborators. We had an issue transferring your compensation. Please contact support.`,
      },
    },
    KICK_COLLABORATOR_OUT: {
      TO_APPLICANT: (username, title) =>
        `Collaborator ${username} of your service ${title} has been kicked out by Hermyx administration, so this vacancy has been emptied.`,
      TO_COLLABORATOR: (title) =>
        `You have been kicked out of the service ${title}, so you won't be able to receive the reward.`,
    },
    SERVICE_NEGOTIATION_EXTRA: (title) =>
      `Your new monetary reward for ${title} has been funded. Now you can submit your part!`,
    SERVICE_RESTARTED: (title) =>
      `Service ${title} has started for you! Talk to your team and start working.`,
    DISPUTE_PARTICIPATION: (title, username) =>
      `A dispute was opened for "${truncateText(title, 20)}" by applicant ${username}.`,
    DISPUTE_REJECTED_PARTICIPATION: (title, username) =>
      `Collaborator ${username} opened a dispute for "${truncateText(title, 20)}".`,
    REJECT_PARTICIPATION: (title, username) =>
      `Your participation in "${truncateText(title, 20)}" was rejected by ${username}. Please accept the revision or open a dispute.`,
    ACCEPT_PARTICIPATION: {
      AUTOMATIC: (title) =>
        `Your participation in "${title}" was approved automatically by the system after it wasn't reviewed on time (one week).`,
      SUCCESSFUL: (title, username) =>
        `Your participation in "${title}" was approved by ${username}.`,
      ISSUED: (title, username) =>
        `Your participation in "${title}" was approved by ${username}. We had an issue transferring your payment. Please contact support.`,
    },
    JOIN_SERVICE_DECISION: {
      REQUEST: {
        ACCEPTED: (title) =>
          `Your request to join "${title}" was accepted. You are now part of the team!`,
        REJECTED: (title) =>
          `Your request to join "${title}" was rejected. Don't let your self down, some other team is searching for you!`,
      },
      INVITATION: {
        ACCEPTED: (title) =>
          `Your invitation to join "${title}" was accepted. Welcome your new collaborator!`,
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
    REPORT_COLLABORATOR: (title) =>
      `You have been reported by the applicant of the ${title} service. You can respond in the dispute conversation.`,
    COLLABORATOR_WORK_ACCEPTED: {
      TO_COLLABORATOR: {
        SUCCESSFUL: (title) =>
          `Your participation in "${title}" was approved by the administration after resolving the dispute. Reward is being payed to you!`,
        ISSUED: (title) =>
          `Your participation in "${title}" was approved by the administration after resolving the dispute. We had an issue transferring your refund. Please contact support.`,
      },
      TO_APPLICANT: (vacancyTitle, username, serviceTitle) =>
        `Participation ${vacancyTitle} disputed by ${username} in service ${serviceTitle} was accepted by the administration. Reward is being payed to the collaborator.`,
    },
    COLLABORATOR_WORK_REJECTED: {
      TO_COLLABORATOR: (title) =>
        `Your participation in "${title}" was rejected by the administration after resolving the dispute. The vacancy is in progress again.`,
      TO_APPLICANT: (vacancyTitle, username, serviceTitle) =>
        `Participation ${vacancyTitle} disputed by ${username} in service ${serviceTitle} was rejected by the administration. The vacancy is in progress again.`,
    },
    DISMISS: {
      REPORT_COLLABORATOR: (username, title, reason) =>
        `Your report on collaborator ${username} from service ${title} has been dismissed, so they will not be kicked out. Reason: ${reason}`,
      REPORT_USER: (username, reason) =>
        `Your report on user ${username} has been dismissed. Reason: ${reason}`,
      REPORT_SERVICE: (title, reason) =>
        `Your report on service ${title} has been dismissed. Reason: ${reason}`,
    },
  },

  /// Review messages
  REVIEW: {
    GENERAL: {
      SERVICE_REVIEW_NOT_ALLOWED: `Only the service applicant can review collaborators from a completed service.`,
      SERVICE_REVIEW_ALREADY_EXISTS: `This collaborator has already been reviewed for this service.`,
      SERVICE_COMPLETED: `Only completed services can be reviewed.`,
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
      BEING_ANSWERED: `Another administrator is answering this report, please check it again.`,
    },
    REPORT_COLLABORATOR: {
      ACTIVE_REPORT: `You already have an active report for this collaborator. Our team is checking it.`,
    },
    REPORT_USER: {
      ACTIVE_REPORT: `You already have an active report for this user. Our team is checking it.`,
    },
    REPORT_SERVICE: {
      ACTIVE_REPORT: `You already have an active report for this service. Our team is checking it.`,
      CLOSED_BY_REPORT: `This service has already been close by a report.`,
    },
    BAN_USER: {
      USER_ALREADY_BANNED: `User already banned.`,
      ACTIVE_DISPUTES: `You cant ban this user because they have other active disputes, resolve those first!.`,
    },
  },

  /// Conversation messages
  CONVERSATION: {
    GENERAL: {
      CONVERSATION_NOT_FOUND: `Conversation not found`,
      CONVERSATION_WITH_YOURSELF: `You cannot create a conversation with yourself.`,
    },
    CREATE_MESSAGE: {
      EMPTY: `Message cannot be empty.`,
      READ_ONLY: `This conversation is read-only.`,
      PHOTO_TOO_BIG: `Each photo must weight less than 5MB`,
      PHOTO_INVALID_TYPE: `Photo format is invalid; please use .jpg, .png or .webp.`,
    },
    // Conversation messages shown in a conversation
    REPORT_COLLABORATOR: (username, vacancyTitle, serviceTitle) =>
      `A dispute was opened after ${username} was reported for the vacancy "${truncateText(vacancyTitle, 20)}" in "${truncateText(serviceTitle, 20)}".`,
  },
};
