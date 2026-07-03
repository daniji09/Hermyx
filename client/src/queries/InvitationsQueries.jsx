import { queryOptions } from '@tanstack/react-query';
import {
  createInvitation,
  getMyNotifications,
  markNotificationAsSeen,
  respondToInvitation,
} from '../services/InvitationsServices';

export const getMyNotificationsQueryOptions = (options) => {
  return queryOptions({
    queryKey: ['getMyNotifications'],
    queryFn: getMyNotifications,
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

export const markNotificationAsSeenMutationOptions = (options) => {
  return {
    mutationFn: markNotificationAsSeen,
    ...options,
  };
};
