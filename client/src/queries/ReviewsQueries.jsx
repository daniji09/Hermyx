import { infiniteQueryOptions } from '@tanstack/react-query';
import { getUserReviews } from '../services/ReviewsServices';

export const getUserReviewsInfiniteQueryOptions = (uid, limit, options) => {
  return infiniteQueryOptions({
    queryKey: ['getUserReviews', uid, limit],
    queryFn: ({ pageParam }) => getUserReviews(uid, pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined;
    },
    enabled: !!uid,
    ...options,
  });
};
