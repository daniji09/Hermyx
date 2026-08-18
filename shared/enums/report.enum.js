export const REPORT_STATUS = {
  SENT: { ID: 'SENT', LABEL: 'Sent' },
  ANSWERED: { ID: 'ANSWERED', LABEL: 'Answered' },
};

export const REPORT_TYPE = {
  REPORT_PROFILE: {
    ID: 'REPORT_PROFILE',
    LABEL: 'Report profile',
    CAN_BE_REJECTED_ACCEPTED: false,
    CAN_BE_DISMISSED: true,
  },
  REPORT_MISSION: {
    ID: 'REPORT_MISSION',
    LABEL: 'Report mission',
    CAN_BE_REJECTED_ACCEPTED: false,
    CAN_BE_DISMISSED: true,
  },
  REPORT_ADVENTURER: {
    ID: 'REPORT_ADVENTURER',
    LABEL: 'Report adventurer',
    CAN_BE_REJECTED_ACCEPTED: false,
    CAN_BE_DISMISSED: true,
  },
  REVIEW_DISPUTE: {
    ID: 'REVIEW_DISPUTE',
    LABEL: 'Review dispute',
    CAN_BE_REJECTED_ACCEPTED: true,
    CAN_BE_DISMISSED: false,
  },
  REJECTED_REVIEW_DISPUTE: {
    ID: 'REJECTED_REVIEW_DISPUTE',
    LABEL: 'Rejected review dispute',
    CAN_BE_REJECTED_ACCEPTED: true,
    CAN_BE_DISMISSED: false,
  },
};

export const REPORT_DECISION = {
  BAN_USER: {
    ID: 'BAN_USER',
    LABEL: 'Ban user',
  },
  BAN_MISSION: {
    ID: 'BAN_MISSION',
    LABEL: 'Ban mission',
  },
  KICK_ADVENTURER_OUT: {
    ID: 'KICK_ADVENTURER_OUT',
    LABEL: 'Kick adventurer out',
  },
  ACCEPT_ADVENTURERS_WORK: {
    ID: 'ACCEPT_ADVENTURERS_WORK',
    LABEL: `Accept adventurer's work`,
  },
  REJECT_ADVENTURERS_WORK: {
    ID: 'REJECT_ADVENTURERS_WORK',
    LABEL: `Reject adventurer's work`,
  },
  DISMISS: {
    ID: 'DISMISS',
    LABEL: 'Dismiss',
  },
};
