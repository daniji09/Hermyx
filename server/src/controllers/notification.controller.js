import * as notificationService from '../services/notification.service.js';

export const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await notificationService.getMyNotifications(
      req.user.uid,
    );
    return res.status(200).json({ notifications });
  } catch (error) {
    next(error);
  }
};

export const markMyNotificationAsSeen = async (req, res, next) => {
  try {
    const notification = await notificationService.markMyNotificationAsSeen(
      req.params.notificationId,
      req.user.uid,
    );
    return res.status(200).json({ notification });
  } catch (error) {
    next(error);
  }
};

export const markMyNotificationsAsSeen = async (req, res, next) => {
  try {
    const notifications = await notificationService.markMyNotificationsAsSeen(
      req.user.uid,
    );
    return res.status(200).json({ notifications });
  } catch (error) {
    next(error);
  }
};

export const respondToNotification = async (req, res, next) => {
  try {
    const result = await notificationService.respondToNotification({
      notificationId: req.params.notificationId,
      response: req.body.response,
      message: req.body.message,
      user: req.user,
    });
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const autoAcceptParticipation = async (req, res, next) => {
  try {
    const result = await notificationService.autoAcceptParticipation();
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
