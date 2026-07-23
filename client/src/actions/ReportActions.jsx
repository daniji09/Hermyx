import {
  disputeValidation,
  messages,
  reportUserValidation,
} from '@hermyx/shared';
import { disputeAdventurer, reportUser } from './../services/ReportsServices';

// Dispute adventurer action: reporting an adventurer
export const disputeAdventurerAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = disputeValidation.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    await disputeAdventurer(fieldsData);
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
      error.response?.data?.message || messages.UNEXPECTED_ERROR;

    return {
      success: false,
      errors: { general: [errorMessage] },
      data: fieldsData,
    };
  }
};

// Dispute adventurer action: reporting an adventurer
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
      error.response?.data?.message || messages.UNEXPECTED_ERROR;

    return {
      success: false,
      errors: { general: [errorMessage] },
      data: fieldsData,
    };
  }
};
