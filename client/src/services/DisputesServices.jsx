import api from '../config/api';

export const getMyDisputes = async () => {
  const { data } = await api.get('/disputes');
  return data.disputes;
};

export const getDispute = async (id) => {
  const { data } = await api.get(`/disputes/${id}`);
  return data.dispute;
};

export const getDisputeUnreadCount = async () => {
  const { data } = await api.get('/disputes/unread-count');
  return data.unreadCount;
};
