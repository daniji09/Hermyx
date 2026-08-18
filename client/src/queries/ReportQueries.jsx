import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { getReportById, getReports } from '../services/ReportsServices';

export const getReportByIdQueryOptions = (params, options) => {
  return queryOptions({
    queryKey: ['getReport', params],
    queryFn: () => getReportById(params),
    ...options,
  });
};

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
