import { messages } from '@hermyx/shared';
import * as notificationModel from '../models/notification.model.js';

/// Model access functions
// Create notification
export const createNotification = async (notificationData, client) => {
  checkNotificationData(notificationData);

  // Creates notification
  const notification = await notificationModel.create(notificationData, client);
  return notification;
};

// Find by action, status and vacancy id
export const findNotificationByActionStatusAndVacancyId = async (
  action,
  status,
  vacancyId,
  client,
) => {
  checkAction(action);
  checkStatus(status);
  checkVacancyId(vacancyId);

  // Finds notification by action, status and vacancy id
  const notification = await notificationModel.findByActionStatusAndVacancy(
    action,
    status,
    vacancyId,
    client,
  );
  return notification;
};

// Update notification
export const updateNotification = async (notificationData, client) => {
  checkNotificationData(notificationData);

  // Update notification
  await notificationModel.update(notificationData, client);
};

/// Data checks
const checkNotificationData = (notificationData) => {
  if (!notificationData)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Notification data'));
};

const checkAction = (action) => {
  if (!action) throw new Error(messages.GENERAL.FIELD_REQUIRED('Action'));
};

const checkStatus = (status) => {
  if (!status) throw new Error(messages.GENERAL.FIELD_REQUIRED('Status'));
};

const checkVacancyId = (vacancyId) => {
  if (!vacancyId)
    throw new Error(messages.GENERAL.FIELD_REQUIRED('Vacancy id'));
};
