export const MISSION_PAYMENT_STATUS = {
  SUCCEEDED: { ID: 'SUCCEEDED', LABEL: 'Succeeded' },
  PARTIALLY_REFUNDED: { ID: 'PARTIALLY_REFUNDED', LABEL: 'Partially refunded' },
  REFUNDED: { ID: 'REFUNDED', LABEL: 'Refunded' },
};

export const MISSION_PARTICIPATION_PAYMENT_STATUS = {
  UNPAID: { ID: 'UNPAID', LABEL: 'Unpaid' },
  PAID: { ID: 'PAID', LABEL: 'Paid' },
  PARTIALLY_PAID: { ID: 'PARTIALLY_PAID', LABEL: 'Partially paid' },
  PARTIALLY_REFUNDED: { ID: 'PARTIALLY_REFUNDED', LABEL: 'Partially refunded' },
  LIQUIDATED: { ID: 'LIQUIDATED', LABEL: 'Liquidated' },
};

export const TRANSACTION_TYPE = {
  INITIAL_FUNDING: { ID: 'INITIAL_FUNDING', LABEL: 'Initial funding' },
  NEW_ADVENTURER_FUNDING: {
    ID: 'NEW_ADVENTURER_FUNDING',
    LABEL: 'New collaborator funding',
  },
  NEGOTIATION_EXTRA: { ID: 'NEGOTIATION_EXTRA', LABEL: 'Negotiation extra' },
  NEGOTIATION_REFUND: {
    ID: 'NEGOTIATION_REFUND',
    LABEL: 'Negotiation refund',
  },
  CANCELLATION_COMPENSATION: {
    ID: 'CANCELLATION_COMPENSATION',
    LABEL: 'Cancellation compensation',
  },
  BAN_COMPENSATION: {
    ID: 'BAN_COMPENSATION',
    LABEL: 'Ban compensation',
  },
  ADVENTURER_KICKED_OUT_COMPENSATION: {
    ID: 'ADVENTURER_KICKED_OUT_COMPENSATION',
    LABEL: 'Collaborator kicked out compensation',
  },
  PAYOUT: { ID: 'PAYOUT', LABEL: 'Payout' },
};

export const HERMYX_SYSTEM_ID = 1;
export const HERMYX_FEE = 1.1;
