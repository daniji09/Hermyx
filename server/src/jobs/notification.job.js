import cron from 'node-cron';
import * as notificationService from '../services/notification.service.js';

export const autoAcceptParticipation = cron.schedule(
  '0 0 0 * * *', // Every day at 00 am
  async () => {
    console.log(
      `[CRON] Executing auto-accepting expired reviews... ${new Date().toLocaleTimeString()}`,
    );
    try {
      // Calls service function
      const result = await notificationService.autoAcceptParticipation();
      console.log('[CRON] Auto-accepting expired reviews finished:', result);
    } catch (error) {
      console.error(
        '[CRON] Connection error while auto-accepting expired reviews:',
        error.message,
      );
    }
  },
);
