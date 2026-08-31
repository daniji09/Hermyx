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
    LABEL: 'Report service',
    CAN_BE_REJECTED_ACCEPTED: false,
    CAN_BE_DISMISSED: true,
  },
  REPORT_ADVENTURER: {
    ID: 'REPORT_ADVENTURER',
    LABEL: 'Report collaborator',
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
    LABEL: 'Ban service',
  },
  KICK_ADVENTURER_OUT: {
    ID: 'KICK_ADVENTURER_OUT',
    LABEL: 'Kick collaborator out',
  },
  ACCEPT_ADVENTURERS_WORK: {
    ID: 'ACCEPT_ADVENTURERS_WORK',
    LABEL: `Accept collaborator's work`,
  },
  REJECT_ADVENTURERS_WORK: {
    ID: 'REJECT_ADVENTURERS_WORK',
    LABEL: `Reject collaborator's work`,
  },
  DISMISS: {
    ID: 'DISMISS',
    LABEL: 'Dismiss',
  },
};
