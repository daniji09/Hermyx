import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import {
  getConversation,
  getConversationMessages,
  getMyConversations,
  getUnreadMessageCount,
} from '../services/ConversationsServices';

export const getConversationQueryOptions = (conversationId, options) => {
  return queryOptions({
    queryKey: ['getConversation', conversationId],
    queryFn: () => getConversation(conversationId),
    enabled: !!conversationId,
    ...options,
  });
};

export const getMyConversationsInfiniteQueryOptions = (limit, options) => {
  return infiniteQueryOptions({
    queryKey: ['getMyConversations', limit],
    queryFn: ({ pageParam }) => getMyConversations(pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? lastPage.pagination.currentPage + 1
        : undefined,
    ...options,
  });
};

export const getConversationMessagesInfiniteQueryOptions = (
  conversationId,
  limit,
  options,
) =>
  infiniteQueryOptions({
    queryKey: ['conversationMessages', conversationId, limit],
    queryFn: ({ pageParam }) =>
      getConversationMessages(conversationId, pageParam, limit),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasMore ? lastPage.pageInfo.nextCursor : undefined,
    enabled: !!conversationId,
    ...options,
  });

export const getUnreadMessageCountQueryOptions = (options) => {
  return queryOptions({
    queryKey: ['getUnreadMessageCount'],
    queryFn: getUnreadMessageCount,
    ...options,
  });
};
