import { consts } from '@hermyx/shared';
import api from '../config/api';

// Finds mission by id
export const getMissionById = async (id) => {
  const { data } = await api.get(`/missions/${id}`);
  return data.mission;
};

// Finds all missions, it may be paginated
export const getMissions = async (options) => {
  const { page, limit } = options ? options : {};

  // Paginated
  if (page && limit) {
    // API search
    const { data } = await api.get('/missions', {
      params: { page, limit, ...options.params },
    });

    return data;
  }

  // Not paginated
  else {
    // API search
    const { data } = await api.get('/missions', { ...options.params });

    return data.missions;
  }
};

// Finds all missions opened, it may be paginated
export const getMissionsOpened = async (options) => {
  const { page, limit } = options ? options : {};

  // Paginated
  if (page && limit) {
    // API search
    const { data } = await api.get('/missions/opened', {
      params: { page, limit, ...options.params },
    });

    return data;
  }

  // Not paginated
  else {
    // API search
    const { data } = await api.get('/missions/opened', { ...options.params });

    return data.missions;
  }
};

// Create a mission in data base
export const createMission = async (missionData) => {
  const data = {
    title: missionData.title,
    description: missionData.description,
    vacancies: missionData.vacancies,
    vacanciesData: JSON.stringify(missionData.vacanciesData),
    longitude: missionData.longitude || null,
    latitude: missionData.latitude || null,
    isDraft: missionData.status === 'draft',
  };

  const response = await api.post('/missions', data);
  const mission = response.data?.mission;

  return mission;
};

// Edits a mission in data base
export const editMission = async (missionData) => {
  const data = {
    mid: missionData.mid,
    title: missionData.title,
    description: missionData.description,
    vacancies: missionData.vacancies,
    vacanciesData: JSON.stringify(missionData.vacanciesData),
    longitude: missionData.longitude || null,
    latitude: missionData.latitude || null,
  };
  const response = await api.post(`/missions/${data.mid}`, data);
  return response.data;
};

// Sends a join request to a mission owner
export const joinMission = async (mid, vacancyId, message = '') => {
  const { data } = await api.post(`/missions/${mid}/join`, {
    vacancyId,
    message,
  });

  return data;
};

// Unjoin mission
export const unjoinMission = async (mid, vacancyId) => {
  const { data } = await api.delete(`/missions/${mid}/unjoin`, {
    data: { vacancyId },
  });

  return data;
};

export const inviteToMission = async ({
  missionId,
  receiverId,
  vacancyId,
  message,
}) => {
  const { data } = await api.post('/missions/invite', {
    missionId,
    receiverId,
    vacancyId,
    message,
  });

  return data;
};

// Cancels mission
export const cancelMission = async (mid) => {
  const { data } = await api.post(`/missions/${mid}/cancel`);
  return data;
};

// Reopens mission
export const reopenMission = async (mid) => {
  const { data } = await api.post(`/missions/${mid}/reopen`);
  return data;
};

// Finishes mission
export const finishMission = async (mid) => {
  const { data } = await api.post(`/missions/${mid}/finish`);
  return data;
};

// Finds all missions from user, it may be paginated
export const getUserMissions = async (
  uid,
  type,
  page = consts.PAGINATION.DEFAULT_PAGE,
  limit = consts.PAGINATION.DEFAULT_LIMIT,
) => {
  // Paginated
  if (page && limit) {
    // API search
    const { data } = await api.get(`/users/${uid}/missions`, {
      params: { type, page, limit },
    });

    return data;
  }

  // Not paginated
  else {
    // API search
    const { data } = await api.get(`/users/${uid}/missions`, {
      params: { type },
    });

    return data.missions;
  }
};

// Closes a mission
export const closeMission = async (mid) => {
  const { data } = await api.post(`/missions/${mid}/close`);
  return data.mission;
};

// Submits current adventurer participation for owner review
export const submitMissionParticipation = async (mid) => {
  const { data } = await api.post(`/missions/${mid}/submit`);
  return data;
};

// Reviews an adventurer after a completed mission
export const reviewAdventurer = async (mid, adventurerId, review) => {
  const { data } = await api.post(
    `/missions/${mid}/adventurers/${adventurerId}/review`,
    review,
  );
  return data;
};

// Reviews a mission owner after a completed participation
export const reviewOwner = async (mid, review) => {
  const { data } = await api.post(`/missions/${mid}/owner/review`, review);
  return data;
};

// Bans a mission
export const banMission = async (mid, rid) => {
  const { data } = await api.post(`/missions/${mid}/ban`, { rid });
  return data;
};

// Kicks an adventurer out
export const kickAdventurerOut = async (mid, vacancyId, rid) => {
  const { data } = await api.post(`/missions/${mid}/kick/${vacancyId}`, {
    rid,
  });
  return data;
};
