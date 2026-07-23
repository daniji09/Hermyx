import { REPORT_STATUS } from '@hermyx/shared/utils/reports.utils.js';
import pool from '../config/db.config.js';

export const createReport = async ({ senderId, message, type, payload }) => {
  const query = `INSERT INTO report (date, sender_id, message, status, type, payload)
    VALUES (NOW(), $1, $2, $3, $4, $5)
    RETURNING *`;
  const result = await pool.query(query, [
    senderId,
    message,
    REPORT_STATUS.SENT.ID,
    type,
    payload,
  ]);
  return result.rows[0];
};

export const checkActiveReport = async (
  senderId,
  type,
  missionId,
  vacancyId,
) => {
  const query = `
    SELECT rid FROM REPORT 
    WHERE sender_id = $1 
      AND status = $2
      AND type = $3
      AND payload->>'associated_mission_id' = $4
      AND payload->>'associated_vacancy_id' = $5
  `;

  const result = await pool.query(query, [
    senderId,
    REPORT_STATUS.SENT.ID,
    type,
    missionId,
    vacancyId,
  ]);
  return result.rowCount;
};
