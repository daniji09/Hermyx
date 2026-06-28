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

// Finds all funded missions, it may be paginated
export const getMissionsFunded = async (options) => {
  const { page, limit } = options ? options : {};

  // Paginated
  if (page && limit) {
    // API search
    const { data } = await api.get('/missions/funded', {
      params: { page, limit, ...options.params },
    });

    return data;
  }

  // Not paginated
  else {
    // API search
    const { data } = await api.get('/missions/funded', { ...options.params });

    return data.missions;
  }
};

// Create a mission in data base
export const createMission = async (missionData) => {
  const data = {
    title: missionData.title,
    description: missionData.description,
    vacancies: missionData.vacancies,
    reward: missionData.reward,
    difficulty: missionData.difficulty,
    isDraft: missionData.status === 'draft',
  };

  const response = await api.post('/missions', data);
  const mission = response.data?.mission;

  return mission;
};

// Sends a join request to a mission owner
export const joinMission = async (mid, message = '') => {
  const { data } = await api.post(`/missions/${mid}/join`, { message });
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

// Starts a mission
export const startMission = async (mid) => {
  const { data } = await api.post(`/missions/${mid}/start`);
  return data.mission;
};

// Closes a mission
export const closeMission = async (mid) => {
  const { data } = await api.post(`/missions/${mid}/close`);
  return data.mission;
};
