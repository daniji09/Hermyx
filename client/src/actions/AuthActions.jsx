import {
  addEmailAuthenticationSchema,
  emailBaseSchema,
  logInSchema,
  signUpSchema,
  messages,
} from '@hermyx/shared';
import { addEmailAuthentication } from '../services/UsersServices';
import {
  createUser,
  login,
  sendVerificationEmailToCurrentUser,
  sendVerificationEmailWithCredentials,
  sendPasswordResetEmail,
  signInWithCustomToken,
} from '../services/AuthServices';

// Sign up action, executed when form is sent
export const signUpAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = signUpSchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    const success = await createUser(validatedFields.data);

    if (!success)
      throw {
        errors: {
          general: [messages.AUTH.SIGNUP.COULD_NOT_CREATE_NEW_ACCOUNT],
        },
      };

    await sendVerificationEmailWithCredentials(
      fieldsData.email,
      fieldsData.password,
    );

    // Success
    return { success: true, data: null, errors: {} };
  } catch (error) {
    // If it some controlled error found in server
    if (
      [400, 401, 409, 500].includes(error.response?.status) &&
      error.response.data?.errors
    )
      return {
        success: false,
        errors: error.response.data.errors,
        data: fieldsData,
      };

    // Controlled errors thrown while sending the verification email
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

// Log in action, executed when form is sent
export const logInAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // First it defines if input is email or username
  fieldsData.usernameEmail.includes('@')
    ? (fieldsData.email = fieldsData.usernameEmail)
    : (fieldsData.username = fieldsData.usernameEmail);

  // Fields validation
  const validatedFields = logInSchema.safeParse(fieldsData);
  if (!validatedFields.success) {
    // Turns email or username error into usernameEmail error
    const errors = {
      password: validatedFields.error.flatten().fieldErrors.password,
      usernameEmail: validatedFields.error.flatten().fieldErrors.email
        ? validatedFields.error.flatten().fieldErrors.email
        : validatedFields.error.flatten().fieldErrors.username,
    };

    return {
      success: false,
      errors: errors,
      data: fieldsData,
    };
  }

  // API call
  try {
    // Logins user in Hermyx and retrieves Firebase token
    const data = await login(fieldsData);

    // Uses Firebase token for login
    const success = await signInWithCustomToken(data.token);

    if (!success)
      throw {
        errors: {
          general: [messages.AUTH.LOGIN.COULD_NOT_LOG_IN],
        },
      };

    return { success: true };
  } catch (error) {
    // Controlled errors thrown from backend
    if (
      [400, 401, 403, 409, 500].includes(error.response?.status) &&
      error.response.data?.errors
    )
      return {
        success: false,
        errors: error.response.data.errors,
        data: fieldsData,
      };

    // Controlled errors thrown from frontend
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

// Sends a password reset email
export const forgotPasswordAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedEmail = emailBaseSchema.safeParse(fieldsData.email);
  if (!validatedEmail.success) {
    return {
      success: false,
      errors: {
        email: validatedEmail.error.flatten().formErrors,
      },
      data: fieldsData,
    };
  }

  try {
    await sendPasswordResetEmail(validatedEmail.data);
    return { success: true, data: fieldsData, errors: {} };
  } catch (error) {
    return {
      success: false,
      errors: error.errors || {
        general: [messages.AUTH.PASSWORD_RESET.COULD_NOT_SEND],
      },
      data: fieldsData,
    };
  }
};

// Add e-mail authentication action action, executed when form is sent
export const addEmailAuthenticationAction = async (previousState, formData) => {
  // Data is collected
  const fieldsData = Object.fromEntries(formData);

  // Fields validation
  const validatedFields = addEmailAuthenticationSchema.safeParse(fieldsData);

  if (!validatedFields.success) {
    return {
      success: false,
      errors: validatedFields.error.flatten().fieldErrors,
      data: fieldsData,
    };
  }

  // API call
  try {
    const success = await addEmailAuthentication(fieldsData);

    if (!success)
      throw {
        errors: {
          general: [messages.AUTH.EMAIL_AUTHENTICATION.COULD_NOT_ADD],
        },
      };

    await sendVerificationEmailToCurrentUser();

    // Success
    return { success: true, data: null, errors: {} };
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
