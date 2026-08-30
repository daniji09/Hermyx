import { consts } from '@hermyx/shared';
import api from '../config/api';

// Finds a service by id
export const getMissionById = async (id) => {
  const { data } = await api.get(`/services/${id}`);
  return data.mission;
};

// Finds all services with mandatory pagination
export const getMissions = async (options = {}) => {
  const {
    page = consts.PAGINATION.DEFAULT_PAGE,
    limit = consts.PAGINATION.DEFAULT_LIMIT,
    params = {},
  } = options;

  const { data } = await api.get('/services', {
    params: { ...params, page, limit },
  });

  return data;
};

// Finds all opened services with mandatory pagination
export const getMissionsOpened = async (options = {}) => {
  const {
    page = consts.PAGINATION.DEFAULT_PAGE,
    limit = consts.PAGINATION.DEFAULT_LIMIT,
    params = {},
  } = options;

  const { data } = await api.get('/services/opened', {
    params: { ...params, page, limit },
  });

  return data;
};

// Finds service payment info by id
export const getMissionPaymentInfoById = async (id) => {
  const { data } = await api.get(`/services/${id}/payment-info`);
  return data;
};

// Creates a service in the database
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

  // Adds photos as files
  if (missionData.photos && missionData.photos.length > 0) {
    missionData.photos.forEach((photoObj) => {
      if (photoObj.file instanceof File) {
        formData.append('photos', photoObj.file);
      }
    });
  }

  // Sends formData
  const response = await api.post('/services', formData);

  return response.data?.mission;
};

// Edits a service in the database
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
  const response = await api.put(`/services/${missionData.mid}`, formData);

  return response.data;
};

// Sends a join request to a service applicant
export const joinMission = async (mid, vacancyId, message = '') => {
  const { data } = await api.post(`/services/${mid}/join`, {
    vacancyId,
    message,
  });

  return data;
};

// Unjoins a service
export const unjoinMission = async (mid, vacancyId) => {
  const { data } = await api.post(`/services/${mid}/unjoin`, { vacancyId });

  return data;
};

export const inviteToMission = async ({
  missionId,
  receiverId,
  vacancyId,
  message,
}) => {
  const { data } = await api.post(`/services/${missionId}/invite`, {
    receiverId,
    vacancyId,
    message,
  });

  return data;
};

// Cancels a service
export const cancelMission = async (mid) => {
  const { data } = await api.post(`/services/${mid}/cancel`);
  return data;
};

// Reopens a service
export const reopenMission = async (mid) => {
  const { data } = await api.post(`/services/${mid}/reopen`);
  return data;
};

// Finishes a service
export const finishMission = async (mid) => {
  const { data } = await api.post(`/services/${mid}/finish`);
  return data;
};

// Finds all services from a user; it may be paginated
export const getUserMissions = async (
  uid,
  type,
  page = consts.PAGINATION.DEFAULT_PAGE,
  limit = consts.PAGINATION.DEFAULT_LIMIT,
) => {
  const { data } = await api.get(`/users/${uid}/services`, {
    params: { type, page, limit },
  });

  return data;
};

// Closes a service
export const closeMission = async (mid) => {
  const { data } = await api.post(`/services/${mid}/close`);
  return data;
};

// Submits the current collaborator participation for applicant review
export const submitMissionParticipation = async (mid) => {
  const { data } = await api.post(`/services/${mid}/submit`);
  return data;
};

// Reviews a collaborator after a completed service
export const reviewAdventurer = async (mid, adventurerId, review) => {
  const { data } = await api.post(
    `/services/${mid}/adventurers/${adventurerId}/review`,
    review,
  );
  return data;
};

// Reviews a service applicant after a completed participation
export const reviewOwner = async (mid, review) => {
  const { data } = await api.post(`/services/${mid}/owner/review`, review);
  return data;
};

// Bans a service
export const banMission = async (mid, rid, reason) => {
  const { data } = await api.post(`/services/${mid}/ban`, { rid, reason });
  return data;
};

// Kicks a collaborator out
export const kickAdventurerOut = async (mid, vacancyId, rid, reason) => {
  const { data } = await api.post(`/services/${mid}/kick/${vacancyId}`, {
    rid,
    reason,
  });
  return data;
};
