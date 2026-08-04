import { queryOptions } from '@tanstack/react-query';
import {
  getConversation,
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

export const getMyConversationsQueryOptions = (options) => {
  return queryOptions({
    queryKey: ['getMyConversations'],
    queryFn: getMyConversations,
    ...options,
  });
};

export const getUnreadMessageCountQueryOptions = (options) => {
  return queryOptions({
    queryKey: ['getUnreadMessageCount'],
    queryFn: getUnreadMessageCount,
    ...options,
  });
};
