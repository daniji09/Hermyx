import api from '../config/api';

// Creates dispute
export const disputeAdventurer = async ({ message, mid, vacancyId }) => {
  const { data } = await api.post(`/reports/dispute/adventurer`, {
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
