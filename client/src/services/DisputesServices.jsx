import api from '../config/api';

export const getMyDisputes = async (page, limit) => {
  const { data } = await api.get('/disputes', {
    params: { page, limit },
  });
  return data;
};

export const getDispute = async (id) => {
  const { data } = await api.get(`/disputes/${id}`);
  return data.dispute;
};

export const getDisputeUnreadCount = async () => {
  const { data } = await api.get('/disputes/unread-count');
  return data.unreadCount;
};
