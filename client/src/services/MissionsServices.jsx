import api from '../config/api';

// Finds mission by id
export const getMissionById = async (id) => {
  const { data } = await api.get(`/missions/${id}`);
  return data.mission;
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
  const mission = response.data?.data;

  if (!mission?.mid) {
    const error = new Error('El servidor no devolvió el ID de la misión');
    error.response = response;
    throw error;
  }

  return mission;
};
