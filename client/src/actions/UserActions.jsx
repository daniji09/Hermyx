import {
  messages,
  updateEmailValidation,
  updatePasswordValidation,
} from '@hermyx/shared';
import { updateUserEmail } from '../services/UsersServices';
import { updateUserPassword } from '../services/AuthServices';

// Update email action
export const updateEmailAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = updateEmailValidation.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    const success = await updateUserEmail(fieldsData.email);

    if (!success)
      throw {
        errors: {
          general: [messages.COULD_NOT_UPDATE_EMAIL],
        },
      };

    // Success
    return { success: true, data: null, errors: {} };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 500].includes(error.response?.status) &&
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

// Update password action
export const updatePasswordAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = updatePasswordValidation.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    await updateUserPassword(fieldsData.password);
    // Success
    return { success: true, data: null, errors: {} };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 500].includes(error.response?.status) &&
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
