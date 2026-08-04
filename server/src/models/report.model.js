import {
  REPORT_STATUS,
  REPORT_TYPE,
} from '@hermyx/shared/utils/reports.utils.js';
import pool from '../config/db.config.js';

// Creates a report
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

// Get report by id
export const getReportById = async (id) => {
  const query = `SELECT * FROM report WHERE rid = $1`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// Gets all reports paginated
export const getReports = async ({ pagination, filters }) => {
  // COUNT(*) OVER() allows to count all rows that meet the condition without taking into account LIMIT and with no aggregation
  let query = `SELECT *, COUNT(*) OVER() AS total_count
    FROM report AS r
    WHERE 1=1`;
  const values = [];

  if (filters?.status) {
    values.push(filters.status);
    query += ` AND r.status = $${values.length}`;
  }

  if (filters?.type) {
    values.push(filters.type);
    query += ` AND r.type = $${values.length}`;
  }

  const sortDirection = filters?.sortByDate === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY r.date ${sortDirection}`;

  if (pagination) {
    values.push(pagination.limit);
    query += ` LIMIT $${values.length}`;

    values.push(pagination.offset);
    query += ` OFFSET $${values.length}`;
  }

  const result = await pool.query(query, values);
  if (result.rows.length === 0) {
    return { rows: [], totalCount: 0 };
  }

  // Postgres returns total_count in each row so we take the first one and clear it
  const totalCount = parseInt(result.rows[0].total_count);

  // Total_count column is cleared so the report objective is not cluttered
  const rows = result.rows.map((row) => {
    // eslint-disable-next-line no-unused-vars
    const { total_count, ...reportData } = row;
    return reportData;
  });

  return { rows, totalCount };
};

// Gets all active specified reports of a user
export const checkActiveReport = async ({ senderId, type, payload }) => {
  let query = `
    SELECT rid FROM REPORT 
    WHERE sender_id = $1 
      AND status = $2
      AND type = $3
  `;

  let result;
  if (
    type === REPORT_TYPE.REPORT_ADVENTURER.ID ||
    type === REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID ||
    type === REPORT_TYPE.REVIEW_DISPUTE.ID
  ) {
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
  } else if (type === REPORT_TYPE.REPORT_MISSION.ID) {
    query += `AND payload->>'associated_mission_id' = $4`;
    result = await pool.query(query, [
      senderId,
      REPORT_STATUS.SENT.ID,
      type,
      payload.missionId,
    ]);
  }

  return result.rowCount;
};

// Closes a report
export const closeReport = async (rid, decision, reason, resolved_by) => {
  const query = `UPDATE report 
    SET status = $1, decision = $3, decision_reason = $4, resolved_by = $5 
    WHERE rid = $2 RETURNING * `;
  const result = await pool.query(query, [
    REPORT_STATUS.ANSWERED.ID,
    rid,
    decision,
    reason,
    resolved_by,
  ]);
  return result.rows[0];
};
