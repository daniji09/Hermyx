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
  // Creates a formData object
  const formData = new FormData();

  // Adds text fields
  formData.append('title', missionData.title);
  formData.append('description', missionData.description);
  formData.append('vacancies', missionData.vacancies);
  formData.append('vacanciesData', JSON.stringify(missionData.vacanciesData));

  if (missionData.longitude)
    formData.append('longitude', missionData.longitude);
  if (missionData.latitude) formData.append('latitude', missionData.latitude);

  formData.append('isDraft', Boolean(missionData.status === 'draft'));

  // Adds photos as files
  if (missionData.photos && missionData.photos.length > 0) {
    missionData.photos.forEach((photoObj) => {
      if (photoObj.file instanceof File) {
        formData.append('photos', photoObj.file);
      }
    });
  }

  // Sends formData
  const response = await api.post('/missions', formData);

  return response.data?.mission;
};

// Edits a mission in data base
export const editMission = async (missionData) => {
  // Creates a formData object
  const formData = new FormData();

  // Adds text fields
  formData.append('mid', missionData.mid);
  formData.append('title', missionData.title);
  formData.append('description', missionData.description);
  formData.append('vacancies', missionData.vacancies);

  const vacData =
    typeof missionData.vacanciesData === 'string'
      ? missionData.vacanciesData
      : JSON.stringify(missionData.vacanciesData);
  formData.append('vacanciesData', vacData);

  if (missionData.longitude)
    formData.append('longitude', missionData.longitude);
  if (missionData.latitude) formData.append('latitude', missionData.latitude);

  // Adds existing photos
  if (missionData.existingPhotos) {
    let rawPhotos = missionData.existingPhotos;
    let existingPhotosArray = [];

    if (
      Array.isArray(rawPhotos) &&
      typeof rawPhotos[0] === 'string' &&
      rawPhotos[0].startsWith('[')
    ) {
      rawPhotos = rawPhotos[0];
    }

    try {
      if (typeof rawPhotos === 'string' && rawPhotos.startsWith('[')) {
        existingPhotosArray = JSON.parse(rawPhotos);
      } else {
        existingPhotosArray = Array.isArray(rawPhotos)
          ? rawPhotos
          : [rawPhotos];
      }
    } catch (error) {
      console.error(error);
      existingPhotosArray = [];
    }

    existingPhotosArray.forEach((photo) => {
      formData.append('existingPhotos', photo);
    });
  }

  // Adds new photos
  if (missionData.photos) {
    const photosArray = Array.isArray(missionData.photos)
      ? missionData.photos
      : [missionData.photos];

    photosArray.forEach((photoObj) => {
      const fileToUpload =
        photoObj.file instanceof File ? photoObj.file : photoObj;

      if (fileToUpload instanceof File) {
        formData.append('photos', fileToUpload);
      }
    });
  }
  const response = await api.put(`/missions/${missionData.mid}`, formData);

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
export const banMission = async (mid, rid, reason) => {
  const { data } = await api.post(`/missions/${mid}/ban`, { rid, reason });
  return data;
};

// Kicks an adventurer out
export const kickAdventurerOut = async (mid, vacancyId, rid, reason) => {
  const { data } = await api.post(`/missions/${mid}/kick/${vacancyId}`, {
    rid,
    reason,
  });
  return data;
};
