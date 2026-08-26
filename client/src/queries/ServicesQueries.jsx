import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import {
  getMissionById,
  getMissionPaymentInfoById,
  getMissions,
  getMissionsOpened,
  getUserMissions,
  inviteToMission,
} from '../services/ServiceServices';

export const getMissionByIdQueryOptions = (params, options) => {
  return queryOptions({
    queryKey: ['getMission', params],
    queryFn: () => getMissionById(params),
    ...options,
  });
};

export const getAllMissionsInfiniteQueryOptions = (limit, params, options) => {
  return infiniteQueryOptions({
    queryKey: ['getMissions', params],
    queryFn: ({ pageParam }) => getMissions({ page: pageParam, limit, params }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    ...options,
  });
};

export const getMissionsInfiniteQueryOptions = (limit, params, options) => {
  return infiniteQueryOptions({
    queryKey: ['getMissions', params],
    queryFn: ({ pageParam }) =>
      getMissionsOpened({ page: pageParam, limit, params }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    ...options,
  });
};

export const getUserMissionsInfiniteQueryOptions = (
  uid,
  type,
  limit,
  options,
) => {
  return infiniteQueryOptions({
    queryKey: ['getUserMissions', uid, type, limit],
    queryFn: ({ pageParam }) => getUserMissions(uid, type, pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    ...options,
  });
};

export const inviteToMissionMutationOptions = (options) => {
  return {
    mutationFn: inviteToMission,
    ...options,
  };
};

export const getMissionPaymentInfoByIdQueryOptions = (params, options) => {
  return queryOptions({
    queryKey: ['getMissionPaymentInfo', params],
    queryFn: () => getMissionPaymentInfoById(params),
    ...options,
  });
};
