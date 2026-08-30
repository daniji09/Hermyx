import cron from 'node-cron';
import * as notificationService from '../services/notification.service.js';

export const autoAcceptParticipation = cron.schedule(
  '0 0 0 * * *', // Every day at 00 am
  async () => {
    try {
      await notificationService.autoAcceptParticipation();
    } catch (error) {
      console.error(
        '[CRON] Connection error while auto-accepting expired reviews:',
        error.message,
      );
    }
  },
);
