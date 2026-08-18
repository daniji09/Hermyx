import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import {
  getMyNotifications,
  markAllNotificationsAsSeen,
  markNotificationAsSeen,
  respondToNotification,
} from '../services/NotificationsServices';

export const getMyNotificationsQueryOptions = (limit, options) => {
  return queryOptions({
    queryKey: ['getMyNotifications', 'preview', limit],
    queryFn: () => getMyNotifications(1, limit),
    ...options,
  });
};

export const getMyNotificationsInfiniteQueryOptions = (limit, options) =>
  infiniteQueryOptions({
    queryKey: ['getMyNotifications', 'infinite', limit],
    queryFn: ({ pageParam }) => getMyNotifications(pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined,
    ...options,
  });

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

export const markAllNotificationsAsSeenMutationOptions = (options) => {
  return {
    mutationFn: markAllNotificationsAsSeen,
    ...options,
  };
};
