import api from '../config/api';

export const getOrCreatePrivateConversation = async (otherUserId) => {
  const response = await api.post('/conversations/private', { otherUserId });
  return response.data.conversation;
};

export const getConversation = async (conversationId) => {
  const { data } = await api.get(`/conversations/${conversationId}`);
  return data;
};

export const sendMessage = async (conversationId, content) => {
  const response = await api.post(`/conversations/${conversationId}/messages`, {
    content,
  });

  return response.data.message;
};

export const getConversationMessages = async (conversationId) => {
  const response = await api.get(`/conversations/${conversationId}/messages`);
  return response.data.messages;
};

export const getMyConversations = async () => {
  const { data } = await api.get('/conversations');
  return data.conversations;
};

export const getUnreadMessageCount = async () => {
  const { data } = await api.get('/conversations/unread-count');
  return data.unreadCount;
};

export const markConversationAsRead = async (conversationId) => {
  const { data } = await api.patch(`/conversations/${conversationId}/read`);
  return data;
};
