import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import {
  getDispute,
  getDisputeUnreadCount,
  getMyDisputes,
} from '../services/DisputesServices';

export const getMyDisputesInfiniteQueryOptions = (limit, options) =>
  infiniteQueryOptions({
    queryKey: ['getMyDisputes', limit],
    queryFn: ({ pageParam }) => getMyDisputes(pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined,
    ...options,
  });

export const getDisputeQueryOptions = (id, options) =>
  queryOptions({
    queryKey: ['getDispute', id],
    queryFn: () => getDispute(id),
    enabled: !!id,
    ...options,
  });

export const getDisputeUnreadCountQueryOptions = (options) =>
  queryOptions({
    queryKey: ['getDisputeUnreadCount'],
    queryFn: getDisputeUnreadCount,
    ...options,
  });
