import { queryOptions } from '@tanstack/react-query';
import {
  createInvitation,
  getMyInvitations,
  markInvitationAsSeen,
  respondToInvitation,
} from '../services/InvitationsServices';

export const getMyInvitationsQueryOptions = (options) => {
  return queryOptions({
    queryKey: ['getMyInvitations'],
    queryFn: getMyInvitations,
    ...options,
  });
};

export const createInvitationMutationOptions = (options) => {
  return {
    mutationFn: createInvitation,
    ...options,
  };
};

export const respondToInvitationMutationOptions = (options) => {
  return {
    mutationFn: respondToInvitation,
    ...options,
  };
};

export const markInvitationAsSeenMutationOptions = (options) => {
  return {
    mutationFn: markInvitationAsSeen,
    ...options,
  };
};
