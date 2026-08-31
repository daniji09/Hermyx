import {
  answerReportValidation,
  reportAdventurerValidation,
  messages,
  reportMissionValidation,
  reportUserValidation,
} from '@hermyx/shared';
import {
  reportAdventurer,
  reportMission,
  reportUser,
} from './../services/ReportsServices';

// Reports a collaborator
export const reportAdventurerAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = reportAdventurerValidation.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    await reportAdventurer(fieldsData);
    // Success
    return { success: true, data: null, errors: {} };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 404, 409, 500].includes(error.response?.status) &&
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

// Report user action
export const reportUserAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = reportUserValidation.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    await reportUser(fieldsData);
    // Success
    return { success: true, data: null, errors: {} };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 404, 409, 500].includes(error.response?.status) &&
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

// Report service action
export const reportMissionAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = reportMissionValidation.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    await reportMission(fieldsData);
    // Success
    return { success: true, data: null, errors: {} };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 404, 409, 500].includes(error.response?.status) &&
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

// Anser report action
export const answerReportAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = answerReportValidation.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // Success
  return { success: true, data: validatedFields, errors: {} };
};
