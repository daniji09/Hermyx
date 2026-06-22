import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import {
  getPublicUserProfile,
  getPublicUserProfileMissions,
} from '../services/UsersServices';

export const getPublicUserProfileQueryOptions = (username, options) => {
  return queryOptions({
    queryKey: ['getPublicUserProfile', username],
    queryFn: () => getPublicUserProfile(username),
    enabled: !!username,
    ...options,
  });
};

export const getPublicUserProfileMissionsInfiniteQueryOptions = (
  username,
  type,
  limit,
  options,
) => {
  return infiniteQueryOptions({
    queryKey: ['getPublicUserProfileMissions', username, type, limit],
    queryFn: ({ pageParam }) =>
      getPublicUserProfileMissions(username, type, pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    enabled: !!username,
    ...options,
  });
};
