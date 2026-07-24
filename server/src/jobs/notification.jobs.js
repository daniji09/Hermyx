import cron from 'node-cron';
import { BACKEND_URL, CRON_SECRET_TOKEN, PORT } from '../config/config.js';

export const autoAcceptParticipation = cron.schedule(
  '0 0 0 * * *', // Every day at 00 am
  async () => {
    console.log(
      `[CRON] Executing auto-accepting expired reviews.. ${new Date().toLocaleTimeString()}`,
    );
    try {
      // Server is called by HTTP
      const _PORT = PORT || 3000;
      const baseUrl = BACKEND_URL || `http://localhost:${_PORT}`;
      const endpoint = `${baseUrl}/api/notifications/cron/auto-accept`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CRON_SECRET_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log('[CRON] Auto-accepting expired reviews finished:', data);
      } else {
        console.error(
          '[CRON] Backend API failed while auto-accepting expired reviews:',
          data,
        );
      }
    } catch (error) {
      console.error(
        '[CRON] Connection error while auto-accepting expired reviews:',
        error.message,
      );
    }
  },
);
