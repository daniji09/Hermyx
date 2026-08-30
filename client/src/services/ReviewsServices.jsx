import { consts } from '@hermyx/shared';
import api from '../config/api';

// Get user reviews by username
export const getUserReviews = async (
  uid,
  page = consts.PAGINATION.DEFAULT_PAGE,
  limit = consts.PAGINATION.DEFAULT_LIMIT,
) => {
  const { data } = await api.get(`/reviews/users/${uid}`, {
    params: { page, limit },
  });
  return data;
};

// Reviews a collaborator after a completed service
export const reviewAdventurer = async (mid, adventurerId, review) => {
  const { data } = await api.post(
    `/reviews/services/${mid}/adventurers/${adventurerId}`,
    review,
  );
  return data;
};

// Reviews a service applicant after a completed participation
export const reviewOwner = async (mid, review) => {
  const { data } = await api.post(`/reviews/services/${mid}/owner`, review);
  return data;
};
