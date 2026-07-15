import { queryOptions } from '@tanstack/react-query';
import {
  getMyNotifications,
  markNotificationAsSeen,
  respondToNotification,
} from '../services/NotificationsServices';

export const getMyNotificationsQueryOptions = (options) => {
  return queryOptions({
    queryKey: ['getMyNotifications'],
    queryFn: getMyNotifications,
    ...options,
  });
};

export const respondToNotificationMutationOptions = (options) => {
  return {
    mutationFn: respondToNotification,
    ...options,
  };
};

export const markNotificationAsSeenMutationOptions = (options) => {
  return {
    mutationFn: markNotificationAsSeen,
    ...options,
  };
};
