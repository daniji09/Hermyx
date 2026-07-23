import {
  REPORT_STATUS,
  REPORT_TYPE,
} from '@hermyx/shared/utils/reports.utils.js';
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

export const checkActiveReport = async ({ senderId, type, payload }) => {
  let query = `
    SELECT rid FROM REPORT 
    WHERE sender_id = $1 
      AND status = $2
      AND type = $3
  `;

  let result;
  if (type === REPORT_TYPE.REPORT_ADVENTURER.ID) {
    query += `AND payload->>'associated_mission_id' = $4
      AND payload->>'associated_vacancy_id' = $5`;
    result = await pool.query(query, [
      senderId,
      REPORT_STATUS.SENT.ID,
      type,
      payload.missionId,
      payload.vacancyId,
    ]);
  } else if (type === REPORT_TYPE.REPORT_PROFILE.ID) {
    query += `AND payload->>'associated_user_id' = $4`;
    result = await pool.query(query, [
      senderId,
      REPORT_STATUS.SENT.ID,
      type,
      payload.userId,
    ]);
  }

  return result.rowCount;
};
