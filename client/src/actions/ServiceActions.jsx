import {
  publishMissionSchema,
  searchMissionByTitleSchema,
  addVacanciesSchema,
  editVacancySchema,
  editMissionBodySchema,
  messages,
} from '@hermyx/shared';
import { createMission, editMission } from '../services/ServiceServices';

// New service action, executed when the form is submitted

export const createMissionAction = async (previousState, formData) => {
  const fieldsData = Object.fromEntries(formData);

  // Photos are extracted
  const filesArray = formData.getAll('photos');

  // Array is formatted
  fieldsData.photos = filesArray
    .filter((file) => file instanceof File && file.size > 0)
    .map((file) => ({
      size: file.size,
      mimetype: file.type,
      file: file,
    }));

  // Fields validation
  const validatedFields = publishMissionSchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    const success = await createMission({
      ...validatedFields.data,
    });

    if (!success?.mid) {
      throw {
        response: {
          status: 500,
          data: { message: messages.GENERAL.UNEXPECTED_ERROR },
        },
      };
    }

    if (!success) {
      throw {
        response: {
          status: 500,
          data: { message: messages.GENERAL.UNEXPECTED_ERROR },
        },
      };
    }

    //Success
    return {
      success: true,
      redirectTo: `/services/${success.mid}`,
      errors: {},
      data: null,
    };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 409, 500].includes(error.response?.status) &&
      error.response.data?.errors
    )
      return {
        success: false,
        errors: error.response.data.errors,
        data: fieldsData,
      };

    // Any other error
    const errorMessage =
      error.response?.data?.message || messages.GENERAL.UNEXPECTED_ERROR;

    return {
      success: false,
      errors: { general: [errorMessage] },
      data: fieldsData,
    };
  }
};

// Edit service action, executed when the form is submitted
export const editMissionAction = async (previousState, formData) => {
  const fieldsData = Object.fromEntries(formData);

  // Photos are extracted
  const filesArray = formData.getAll('photos');

  // Array is formatted
  fieldsData.photos = filesArray
    .filter((file) => file instanceof File && file.size > 0)
    .map((file) => ({
      size: file.size,
      mimetype: file.type,
      file: file,
    }));
  const validatedFields = editMissionBodySchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    const success = await editMission({
      ...validatedFields.data,
    });
    if (!success?.mission?.mid) {
      throw {
        response: {
          status: 500,
          data: { message: messages.GENERAL.UNEXPECTED_ERROR },
        },
      };
    }

    if (!success) {
      throw {
        response: {
          status: 500,
          data: { message: messages.GENERAL.UNEXPECTED_ERROR },
        },
      };
    }

    //Success
    return {
      success: true,
      redirectTo: success.requiresExtraPayment
        ? `/services/${success.mission.mid}/pay`
        : `/services/${success.mission.mid}`,
      errors: {},
      data: null,
    };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 409, 500].includes(error.response?.status) &&
      error.response.data?.errors
    )
      return {
        success: false,
        errors: error.response.data.errors,
        data: fieldsData,
      };

    // Any other error
    const errorMessage =
      error.response?.data?.message || messages.GENERAL.UNEXPECTED_ERROR;

    return {
      success: false,
      errors: { general: [errorMessage] },
      data: fieldsData,
    };
  }
};

export const searchMissionByTitleAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = searchMissionByTitleSchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  return { success: true, data: fieldsData, errors: {} };
};
export const addVacanciesAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = addVacanciesSchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  return { success: true, data: fieldsData, errors: {} };
};

export const editVacancyAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = editVacancySchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  return { success: true, data: fieldsData, errors: {} };
};
