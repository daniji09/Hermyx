import {
  messages,
  updateEmailValidation,
  updatePasswordValidation,
  userConfigurationValidation,
} from '@hermyx/shared';
import { updateUserEmail, userConfiguration } from '../services/UsersServices';
import {
  sendVerificationEmailToCurrentUser,
  signInWithCustomToken,
  updateUserPassword,
} from '../services/AuthServices';

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
    const updatedUser = await updateUserEmail(fieldsData.email);

    if (!updatedUser?.token)
      throw {
        errors: {
          general: [messages.COULD_NOT_UPDATE_EMAIL],
        },
      };

    await signInWithCustomToken(updatedUser.token);
    await sendVerificationEmailToCurrentUser();

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

    if (error.errors)
      return {
        success: false,
        errors: error.errors,
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
      error.response?.data?.message || messages.GENERAL.UNEXPECTED_ERROR;

    return {
      success: false,
      errors: { general: [errorMessage] },
      data: fieldsData,
    };
  }
};

// Update password action
export const userConfigurationAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Data is parsed
  fieldsData.show_missions_to_others =
    fieldsData.show_missions_to_others === 'true' ? true : false;

  // Fields validation
  const validatedFields = userConfigurationValidation.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // JSON configuration object is built
  const configuration = {
    show_missions_to_others: fieldsData.show_missions_to_others,
  };

  // API call
  try {
    await userConfiguration(configuration);
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
      error.response?.data?.message || messages.GENERAL.UNEXPECTED_ERROR;

    return {
      success: false,
      errors: { general: [errorMessage] },
      data: fieldsData,
    };
  }
};
