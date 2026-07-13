export const NOTIFICATION_TYPE = {
  INVITATION: { ID: 'INVITATION', LABEL: 'Invitation' },
  MISSION: { ID: 'MISSION', LABEL: 'Mission' },
};

export const NOTIFICATION_KIND = {
  ACTIONABLE: { ID: 'ACTIONABLE', LABEL: 'Actionable' },
  INFORMATIONAL: { ID: 'INFORMATIONAL', LABEL: 'Informational' },
};

export const NOTIFICATION_ACTION = {
  JOIN_REQUEST: { ID: 'JOIN_REQUEST', LABEL: 'Join request' },
  MISSION_INVITE: { ID: 'MISSION_INVITE', LABEL: 'Mission invite' },
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
  PARTICIPATION_DISPUTED: {
    ID: 'PARTICIPATION_DISPUTED',
    LABEL: 'Participation disputed',
  },
  MISSION_EDIT: {
    ID: 'MISSION_EDIT',
    LABEL: 'Mission edit',
  },
};

export const NOTIFICATION_STATUS = {
  PENDING: { ID: 'PENDING', LABEL: 'Pending' },
  ACCEPTED: { ID: 'ACCEPTED', LABEL: 'Accepted' },
  REJECTED: { ID: 'REJECTED', LABEL: 'Rejected' },
  DISPUTED: { ID: 'DISPUTED', LABEL: 'Disputed' },
};
