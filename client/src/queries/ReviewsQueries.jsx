import { infiniteQueryOptions } from '@tanstack/react-query';
import { getUserReviews } from '../services/ReviewsServices';

export const getUserReviewsInfiniteQueryOptions = (
  username,
  limit,
  options,
) => {
  return infiniteQueryOptions({
    queryKey: ['getUserReviews', username, limit],
    queryFn: ({ pageParam }) => getUserReviews(username, pageParam, limit),
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
