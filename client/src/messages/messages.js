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
    DIFFICULTY_DESCRIPTION:
      'Higher difficulty implies higher rewards for adventurers.',
  },
  MISSION: {
    MISSION_CLOSED: 'Mission already closed!',
    MISSION_FILLED: 'Mission already filled!',
    MISSION_PENDING_PAYMENT: `Mission can't be opened until payment is done.`,
    JOIN_MISSION_ALERT: {
      TITLE: 'Do you want to send a join request for this mission?',
      ERROR_TITLE: `Can't join mission`,
      DESCRIPTION: '',
      CONFIRM_TEXT: 'Yes, send request',
    },
    START_MISSION_ALERT: {
      TITLE: 'Are you sure you want to start the mission?',
      ERROR_TITLE: `Can't start mission`,
      NO_ADVENTURERS_DESCRIPTION: `You can't start a mission without adventurers.`,
      AVAILABLE_VACANCIES_DESCRIPTION: `There are still vacant places available.`,
      START_DESCRIPTION: `This will link the current adventurers to this mission.`,
      CONFIRM_TEXT: 'Yes, start mission',
    },
    CLOSE_MISSION_ALERT: {
      TITLE: 'Are you sure you want to close the mission?',
      ERROR_TITLE: `Can't close mission`,
      DESCRIPTION:
        'This will state that the mission has been completed by the adventurers and they will receive the payment.',
      CONFIRM_TEXT: 'Yes, close mission',
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
  },
};
