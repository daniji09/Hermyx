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
};
