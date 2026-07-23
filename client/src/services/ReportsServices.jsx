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
