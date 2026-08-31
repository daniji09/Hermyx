import { consts } from '@hermyx/shared';
import api from '../config/api';

// Reports a collaborator
export const reportAdventurer = async ({ message, mid, vacancyId }) => {
  const { data } = await api.post(`/reports/collaborator`, {
    message,
    mid,
    vacancyId,
  });
  return data;
};

// Reports user
export const reportUser = async ({ message, uid }) => {
  const { data } = await api.post(`/reports/user`, {
    message,
    uid,
  });
  return data;
};

// Reports user
export const reportMission = async ({ message, mid }) => {
  const { data } = await api.post(`/reports/service`, {
    message,
    mid,
  });
  return data;
};

// Finds report by id
export const getReportById = async (id) => {
  const { data } = await api.get(`/reports/${id}`);
  return data.report;
};

// Finds all reports
export const getReports = async (options = {}) => {
  const {
    page = consts.PAGINATION.DEFAULT_PAGE,
    limit = consts.PAGINATION.DEFAULT_LIMIT,
    params = {},
  } = options;

  const { data } = await api.get('/reports', {
    params: { ...params, page, limit },
  });

  return data;
};

// Accepts a collaborator's work
export const acceptAdventurersWork = async (rid, reason) => {
  const { data } = await api.post(`/reports/${rid}/accept`, { reason });
  return data;
};

// Rejects a collaborator's work
export const rejectAdventurersWork = async (rid, reason) => {
  const { data } = await api.post(`/reports/${rid}/reject`, { reason });
  return data;
};

// Dismiss report
export const dismiss = async (rid, reason) => {
  const { data } = await api.post(`/reports/${rid}/dismiss`, { reason });
  return data;
};
