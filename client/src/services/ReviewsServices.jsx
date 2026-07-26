import api from '../config/api';

// Get user reviews by username
export const getUserReviews = async (username, page, limit) => {
  const { data } = await api.get(`/reviews/users/${username}`, {
    params: { page, limit },
  });
  return data;
};

// Reviews an adventurer after a completed mission
export const reviewAdventurer = async (mid, adventurerId, review) => {
  const { data } = await api.post(
    `/reviews/missions/${mid}/adventurers/${adventurerId}`,
    review,
  );
  return data;
};

// Reviews a mission owner after a completed participation
export const reviewOwner = async (mid, review) => {
  const { data } = await api.post(`/reviews/missions/${mid}/owner`, review);
  return data;
};
