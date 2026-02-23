import { useActionState } from 'react';
import api from '../config/api';
import { logInSchema } from '@hermyx/shared';
import { messages } from '@hermyx/shared';
import { auth } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export const LogIn = () => {
  // Initial state for the React Hook useStateAction
  const initialState = { success: null, errors: {} };
  const navigate = useNavigate();

  // Finds email via username
  async function getUserEmail(fieldsData) {
    // API search
    const { data, status } = await api.get('/users', {
      params: { username: fieldsData.username },
      validateStatus: (status) =>
        status === 200 || status === 400 || status === 404 || status === 500,
    });

    if (status === 200) fieldsData.email = data.user.email;
    else
      throw {
        controlledError: true,
        errors: data.errors,
      };
  }

  async function logIn(fieldsData) {
    try {
      // Log In is done on client with Firebase
      const user = await signInWithEmailAndPassword(
        auth,
        fieldsData.email,
        fieldsData.password,
      );

      // If Firebase user is not received, it returns the error
      if (!user)
        throw {
          controlledError: true,
          errors: {
            general: [messages.COULD_NOT_LOG_IN],
          },
        };
      navigate('/home');
    } catch (error) {
      // Firebase errors and exceptions are treated
      switch (error.code) {
        case 'auth/invalid-email':
          throw {
            controlledError: true,
            errors: {
              usernameEmail: [messages.FIELD_NOT_VALID('email')],
            },
          };

        case 'auth/missing-email':
          throw {
            controlledError: true,
            errors: {
              usernameEmail: [messages.FIELD_REQUIRED],
            },
          };

        case 'auth/wrong-password':
          throw {
            controlledError: true,
            errors: {
              password: [messages.PASSWORD_WRONG],
            },
          };

        case 'auth/missing-password':
          throw {
            controlledError: true,
            errors: { password: [messages.FIELD_REQUIRED] },
          };

        case 'auth/invalid-credential':
          throw {
            controlledError: true,
            errors: { general: [messages.INVALID_CREDENTIALS] },
          };
        case 'auth/network-request-failed':
          throw {
            controlledError: true,
            errors: { general: [messages.CONNECTION_ERROR] },
          };

        default:
          throw error;
      }
    }
  }

  // Action executed when form is sent
  const logInAction = async (previousState, formData) => {
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
      // If username is provided, its username is searched
      if (fieldsData.username) await getUserEmail(fieldsData);

      // Log In is done on client with Firebase
      await logIn(fieldsData);

      // If it ends its successful
      return { success: true };
    } catch (error) {
      // If it some controlled error found in server
      if (error.controlledError)
        return { success: false, errors: error.errors, data: fieldsData };

      // Any other error
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        messages.UNEXPECTED_ERROR;

      return {
        success: false,
        errors: { general: [errorMessage] },
        data: fieldsData,
      };
    }
  };

  const [state, logInFormAction, isPending] = useActionState(
    logInAction,
    initialState,
  );

  return (
    <form action={logInFormAction} noValidate>
      {state.success && <p className='text-green-600'>Signed up!</p>}
      {state.errors?.general && (
        <p className='text-red-600'>{state.errors.general[0]}</p>
      )}

      <div>
        <label>Username/E-mail:</label>
        <input
          type='text'
          name='usernameEmail'
          defaultValue={state.data?.usernameEmail || ''}
          required
        />
        {state.errors?.usernameEmail && (
          <p className='text-red-600'>{state.errors.usernameEmail[0]}</p>
        )}
      </div>

      <div>
        <label>Password:</label>
        <input type='password' name='password' required />
        {state.errors?.password && (
          <p className='text-red-600'>{state.errors.password[0]}</p>
        )}
      </div>

      <button type='submit' disabled={isPending}>
        {isPending ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
};
