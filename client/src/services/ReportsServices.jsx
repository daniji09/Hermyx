import api from '../config/api';

// Reports an adventurer
export const reportAdventurer = async ({ message, mid, vacancyId }) => {
  const { data } = await api.post(`/reports/adventurer`, {
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
  const { data } = await api.post(`/reports/mission`, {
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
export const getReports = async (options) => {
  const { page, limit } = options;

  // API search
  const { data } = await api.get('/reports', {
    params: { page, limit, ...options.params },
  });

  return data;
};

// Accepts adventurer's work
export const acceptAdventurersWork = async (rid, reason) => {
  const { data } = await api.post(`/reports/${rid}/accept`, { reason });
  return data;
};

// Rejects adventurer's work
export const rejectAdventurersWork = async (rid, reason) => {
  const { data } = await api.post(`/reports/${rid}/reject`, { reason });
  return data;
};

// Dismiss report
export const dismiss = async (rid, reason) => {
  const { data } = await api.post(`/reports/${rid}/dismiss`, { reason });
  return data;
};
