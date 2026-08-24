import { consts } from '@hermyx/shared';
import api from '../config/api';

export const getMyNotifications = async (
  page = consts.PAGINATION.DEFAULT_PAGE,
  limit = consts.PAGINATION.DEFAULT_LIMIT,
) => {
  const { data } = await api.get('/notifications/me', {
    params: { page, limit },
  });
  return data;
};

export const respondToNotification = async ({
  notificationId,
  response,
  message,
}) => {
  const { data } = await api.post(`/notifications/${notificationId}/respond`, {
    response,
    message,
  });
  return data;
};

export const markNotificationAsSeen = async (notificationId) => {
  const { data } = await api.post(`/notifications/${notificationId}/seen`);
  return data;
};

export const markAllNotificationsAsSeen = async () => {
  const { data } = await api.post('/notifications/seen');
  return data;
};
