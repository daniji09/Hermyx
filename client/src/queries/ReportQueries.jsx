import { infiniteQueryOptions } from '@tanstack/react-query';
import { getReports } from '../services/ReportsServices';

export const getReportsInfiniteQueryOptions = (limit, params, options) => {
  return infiniteQueryOptions({
    queryKey: ['getReports', params],
    queryFn: ({ pageParam }) => getReports({ page: pageParam, limit, params }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    ...options,
  });
};
