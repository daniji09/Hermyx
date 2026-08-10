import { queryOptions } from '@tanstack/react-query';
import {
  getDispute,
  getDisputeUnreadCount,
  getMyDisputes,
} from '../services/DisputesServices';

export const getMyDisputesQueryOptions = (options) =>
  queryOptions({
    queryKey: ['getMyDisputes'],
    queryFn: getMyDisputes,
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
