import api from '../config/api';

export const createNotification = async ({ missionId, receiverId, message }) => {
  const { data } = await api.post('/notifications', {
    missionId,
    receiverId,
    message,
  });

  return data;
};

export const getMyNotifications = async () => {
  const { data } = await api.get('/notifications/me');
  return data;
};

export const respondToNotification = async ({ notificationId, response }) => {
  const { data } = await api.post(`/notifications/${notificationId}/respond`, {
    response,
  });
  return data;
};

export const markNotificationAsSeen = async (notificationId) => {
  const { data } = await api.post(`/notifications/${notificationId}/seen`);
  return data;
};
