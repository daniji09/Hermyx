export const NOTIFICATION_TYPE = {
  INVITATION: { ID: 'INVITATION', LABEL: 'Invitation' },
  MISSION: { ID: 'MISSION', LABEL: 'Service' },
  REPORT: { ID: 'REPORT', LABEL: 'Report' },
};

export const NOTIFICATION_KIND = {
  ACTIONABLE: { ID: 'ACTIONABLE', LABEL: 'Actionable' },
  INFORMATIONAL: { ID: 'INFORMATIONAL', LABEL: 'Informational' },
};

export const NOTIFICATION_ACTION = {
  JOIN_REQUEST: { ID: 'JOIN_REQUEST', LABEL: 'Join request' },
  MISSION_INVITE: { ID: 'MISSION_INVITE', LABEL: 'Service invite' },
  PARTICIPATION_REVIEW: {
    ID: 'PARTICIPATION_REVIEW',
    LABEL: 'Participation review',
  },
  PARTICIPATION_REJECTION_RESPONSE: {
    ID: 'PARTICIPATION_REJECTION_RESPONSE',
    LABEL: 'Participation rejection response',
  },
  PARTICIPATION_APPROVED: {
    ID: 'PARTICIPATION_APPROVED',
    LABEL: 'Participation approved',
  },
  PARTICIPATION_REJECTED: {
    ID: 'PARTICIPATION_REJECTED',
    LABEL: 'Participation rejected',
  },
  PARTICIPATION_DISPUTED: {
    ID: 'PARTICIPATION_DISPUTED',
    LABEL: 'Participation disputed',
  },
  MISSION_EDIT: {
    ID: 'MISSION_EDIT',
    LABEL: 'Service edit',
  },
  MISSION_CLOSE: {
    ID: 'MISSION_CLOSE',
    LABEL: 'Service close',
  },
  MISSION_START: {
    ID: 'MISSION_START',
    LABEL: 'Service start',
  },
  MISSION_UNJOIN: {
    ID: 'MISSION_UNJOIN',
    LABEL: 'Service unjoin',
  },
  MISSION_DELETE: {
    ID: 'MISSION_DELETE',
    LABEL: 'Service delete',
  },
  MISSION_CANCEL: {
    ID: 'MISSION_CANCEL',
    LABEL: 'Service cancel',
  },
  MISSION_REOPEN: {
    ID: 'MISSION_REOPEN',
    LABEL: 'Service reopen',
  },
  ADVENTURER_REPORT: {
    ID: 'ADVENTURER_REPORT',
    LABEL: 'Collaborator report',
  },
  REVIEW_DISPUTE: {
    ID: 'REVIEW_DISPUTE',
    LABEL: 'Review dispute',
  },
  REJECTED_REVIEW_DISPUTE: {
    ID: 'REJECTED_REVIEW_DISPUTE',
    LABEL: 'Rejected review dispute',
  },
  MISSION_BAN: {
    ID: 'MISSION_BAN',
    LABEL: 'Service ban',
  },
  ADVENTURER_KICKED_OUT: {
    ID: 'ADVENTURER_KICKED_OUT',
    LABEL: 'Collaborator kicked out',
  },
  USER_BAN: {
    ID: 'USER_BAN',
    LABEL: 'User ban',
  },
  REPORT_DISMISSED: {
    ID: 'REPORT_DISMISSED',
    LABEL: 'Report dismissed',
  },
};

export const NOTIFICATION_STATUS = {
  PENDING: { ID: 'PENDING', LABEL: 'Pending' },
  ACCEPTED: { ID: 'ACCEPTED', LABEL: 'Accepted' },
  REJECTED: { ID: 'REJECTED', LABEL: 'Rejected' },
  DISPUTED: { ID: 'DISPUTED', LABEL: 'Disputed' },
};
