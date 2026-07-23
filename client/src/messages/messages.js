// Frontend messages
export const messages = {
  SIGN_UP: {
    FORM_TITLE: 'Sign up',
    USERNAME_DESCRIPTION:
      'No longer than 20 characters. Must start with a letter or number, and may contain [._-].',
    PASSWORD_DESCRIPTION:
      'At least 8 characters. Must include an uppercase, lowercase, number and symbol.',
  },
  LOG_IN: {
    FORM_TITLE: 'Log in',
  },
  NEW_MISSION: {
    FORM_TITLE: 'Create a mission',
    DESCRIPTION_DESCRIPTION: 'Tell the adventurers what your mission is about!',
    VACANCIES_DESCRIPTION:
      'Define how many adventurers you need for this mission.',
    LOCATION_DESCRIPTION: 'Add a location if your mission needs it.',
    LOCATION_ERROR: 'Please, select a valid location on the map.',
  },
  EDIT_MISSION: {
    FORM_TITLE: 'Edit your mission',
    DESCRIPTION_DESCRIPTION: 'Tell the adventurers what your mission is about!',
    VACANCIES_DESCRIPTION:
      'Define how many adventurers you need for this mission.',
    LOCATION_DESCRIPTION: 'Add a location if your mission needs it.',
    LOCATION_ERROR: 'Please, select a valid location on the map.',
    EDIT_FINISHED_VACANCIES: `Can't edit vacancies from finished adventurers.`,
    REPORT_VACANCY_DIALOG: {
      TITLE: `Report vacancy`,
      DESCRIPTION: `Please provide details about why you are reporting this vacancy. Our team will review it shortly.`,
    },
  },
  MISSION: {
    MISSION_CLOSED: 'Mission already closed!',
    MISSION_IN_DISPUTE: 'Mission is currently in dispute.',
    MISSION_FILLED: 'Mission already filled!',
    MISSION_OPEN: 'Join any open vacancy of this mission!',
    MISSION_JOINED: 'You are already part of this mission.',
    MISSION_NOT_ACCEPTING_ADVENTURERS:
      'This mission is no longer accepting adventurers.',
    MISSION_PENDING_PAYMENT: `Mission can't be opened until payment is done.`,
    JOIN_MISSION_ALERT: {
      TITLE: 'Do you want to send a join request for this mission?',
      ERROR_TITLE: `Can't join mission`,
      DESCRIPTION: '',
      CONFIRM_TEXT: 'Yes, send request',
    },
    UNJOIN_MISSION_ALERT: {
      TITLE: 'Do you want to unjoin this mission?',
      ERROR_TITLE: `Can't unjoin mission`,
      DESCRIPTION:
        'Unjoining this mission will unlink it from you, and you will no longer be part of it.',
      CONFIRM_TEXT: 'Yes, unjoin mission',
    },
    CLOSE_MISSION_ALERT: {
      TITLE: 'Are you sure you want to close the mission?',
      ERROR_TITLE: `Can't close mission`,
      NO_ADVENTURERS_DESCRIPTION: `You can't close a mission without adventurers.`,
      AVAILABLE_VACANCIES_DESCRIPTION: `There are still vacant places available.`,
      START_DESCRIPTION: `This will link the current adventurers to this mission, they won't be able to leave but until you pay mission won't start and you can still delete it.`,
      CONFIRM_TEXT: 'Yes, close mission',
      NO_NEW_ADVENTURERS_AFTER_REOPEN: `No new adventurers have joined since this mission was reopened.`,
    },
    START_MISSION_ALERT: {
      TITLE: 'Are you sure you want to start the mission?',
      START_DESCRIPTION: `After you pay, mission will be started and adventurers will start working on it. From then on, if you cancel it, the money will be transferred to the adventurers anyway.`,
      CONFIRM_TEXT: 'Yes, start mission',
    },
    CANCEL_MISSION_ALERT: {
      TITLE: 'Are you sure you want to cancel the mission?',
      ERROR_TITLE: `Can't cancel mission`,
      DESCRIPTION_DELETE:
        'This will delete the mission forever, unlinking adventurers for it and acknowledging them.',
      DESCRIPTION_CANCEL: `This will cancel the mission, but a refund of your money won't be made, adventurers will be payed.`,
      CONFIRM_TEXT: 'Yes, close mission',
    },
    REOPEN_MISSION_ALERT: {
      TITLE: 'Are you sure you want to reopen the mission?',
      ERROR_TITLE: `Can't reopen mission`,
      DESCRIPTION:
        'Empty vacancies must exist on your mission, and new adventurers will be allowed to join them.',
      CONFIRM_TEXT: 'Yes, reopen mission',
    },
    FINISH_MISSION_ALERT: {
      TITLE: 'Are you sure you want to finish the mission?',
      ERROR_TITLE: `Can't finish mission`,
      DESCRIPTION: `This will complete the mission, and you won't be able to make any changes.`,
      CONFIRM_TEXT: 'Yes, finish mission',
    },
    SUBMIT_PARTICIPATION_ALERT: {
      TITLE: 'Submit your participation?',
      ERROR_TITLE: `Can't submit participation`,
      DESCRIPTION:
        'This will notify the mission owner that your part is ready for review.',
      CONFIRM_TEXT: 'Yes, submit participation',
    },
    REVIEW_ADVENTURER_ALERT: {
      ERROR_TITLE: `Can't review adventurer`,
      SUCCESS_TITLE: 'Review sent',
      SUCCESS_DESCRIPTION: 'Your review is now visible on this profile.',
    },
    APPROVE_PARTICIPATION_ALERT: {
      TITLE: 'Approve participation?',
      ERROR_TITLE: `Can't approve participation`,
      DESCRIPTION: 'This will mark this adventurer participation as approved.',
      CONFIRM_TEXT: 'Yes, approve',
    },
    REJECT_PARTICIPATION_ALERT: {
      TITLE: 'Reject participation?',
      ERROR_TITLE: `Can't reject participation`,
      DESCRIPTION: 'This will request a revision from the adventurer.',
      CONFIRM_TEXT: 'Yes, reject',
    },
    STATUS_LABELS: {
      draft: 'Draft',
      pending_payment: 'Pending payment',
      funded: 'Looking for adventurers',
      joined: 'Joined',
      in_progress: 'In progress',
      accepted: 'Accepted',
      finished: 'Finished',
      releasing: 'Releasing payment',
      released: 'Released',
      partially_released: 'Partially released',
      refunding: 'Refunding',
      refunded: 'Refunded',
      canceled: 'Canceled',
      in_dispute: 'In dispute',
      looking_for_adventurers: 'Looking for adventurers',
      closed: 'Closed',
      submitted: 'Submitted',
      revision_requested: 'Revision requested',
    },
  },
  SEARCH_MISSIONS: {
    LOADING: 'Searching missions...',
    ERROR: 'Oops! Something went wrong while loading missions',
    NO_MISSIONS: 'It seems there is no missions yet. Add one!',
  },
  PAYMENT: {
    FORM_TITLE: 'Mission payment',
    STRIPE_NOT_LOADED: 'Stripe has not loaded yet.',
    MISSION_NOT_FOUND: `Couldn't find mission.`,
    CARD_NOT_READ: `Credit card couldn't be read.`,
  },
  MY_PROFILE: {
    LOCATION_DESCRIPTION:
      'Add your location if you want to find missions near you!',
    LOCATION_INFO: `Your location is only visible to you.`,
    UNLINK_GOOGLE_INFO: `Can't unlink Google account if there is no e-mail
                authentication added.`,
    DELETE_ACCOUNT_TEXT: 'This will remove your account forever. Are you sure?',
    DELETE_ACCOUNT_ALERT: {
      TITLE: 'Are you sure you want to delete your account?',
      ERROR_TITLE: `Couldn't delete account`,
      DESCRIPTION: `This action will delete all your data from Hermyx and it can't be undone. Make sure you don't have or you aren't participating in any active mission right now to complete the deletion. `,
      CONFIRM_TEXT: 'Yes, delete account',
    },
    ADD_EMAIL_AUTHENTICATION_ALERT: {
      TITLE: 'Authentication added',
      DESCRIPTION: 'For security reasons, log in with your new credentials.',
    },
    ADD_EMAIL_AUTHENTICATION_DIALOG: {
      TITLE: 'Add e-mail authentication',
      DESCRIPTION:
        'Enter an e-mail and password to add this new authentication.',
    },
    CHANGE_EMAIL_DIALOG: {
      TITLE: 'Update e-mail',
      DESCRIPTION: (email) => `Your current email is ${email}. Enter your
              new email twice to confirm the change.`,
    },
    CHANGE_PASSWORD_DIALOG: {
      TITLE: 'Update password',
      DESCRIPTION: `Enter your new password twice to confirm the change.`,
    },
    LINK_GOOGLE_ALERT: {
      ERROR_TITLE: `Couldn't link account`,
    },
    UNLINK_GOOGLE_ALERT: {
      TITLE:
        'Are you sure you want to unlink your Google account authentication?',
      ERROR_TITLE: `Couldn't unlink account`,
      DESCRIPTION: (googleEmail) =>
        `This action will unlink your Google account ${googleEmail} from your Hermyx account, and you will be able to link any other Google account.`,
      CONFIRM_TEXT: 'Yes, unlink account',
    },
    ADD_BANK_ACCOUNT_ALERT: {
      ERROR_TITLE: `Couldn't add bank account.`,
    },
    DASHBOARD_ACCOUNT_ALERT: {
      ERROR_TITLE: `Couldn't go to account dashboard.`,
    },
    CONFIGURATION: {
      SHOW_MISSIONS_TEXT:
        'Do you want to show your created and joined missions to others in your profile?',
    },
  },
  MAP: {
    LOCATION_NOT_FOUND: `Couldn't find results for this location.`,
    MAP_SERVICE_ERROR: `Error while connecting to map service.`,
  },
  REPORT: {
    ADVENTURER: {
      SUCCESS_ALERT: {
        TITLE: `Report successfully sent.`,
        DESCRIPTION: `Wait patiently for our answer on this case!`,
      },
    },
  },
};
