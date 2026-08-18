import api from '../config/api';

export const getOrCreatePrivateConversation = async (otherUserId) => {
  const response = await api.post('/conversations/private', { otherUserId });
  return response.data.conversation;
};

export const getConversation = async (conversationId) => {
  const { data } = await api.get(`/conversations/${conversationId}`);
  return data;
};

export const sendMessage = async (conversationId, content, photo) => {
  const formData = new FormData();
  formData.append('content', content);

  if (photo) {
    formData.append('photo', photo);
  }

  const response = await api.post(
    `/conversations/${conversationId}/messages`,
    formData,
  );

  return response.data.message;
};

export const getConversationMessages = async (
  conversationId,
  cursor,
  limit,
) => {
  const { data } = await api.get(`/conversations/${conversationId}/messages`, {
    params: { cursor, limit },
  });
  return data;
};

export const getMyConversations = async (page, limit) => {
  const { data } = await api.get('/conversations', {
    params: { page, limit },
  });
  return data;
};

export const getUnreadMessageCount = async () => {
  const { data } = await api.get('/conversations/unread-count');
  return data.unreadCount;
};

export const markConversationAsRead = async (conversationId) => {
  const { data } = await api.patch(`/conversations/${conversationId}/read`);
  return data;
};
