import { useActionState, useEffect } from 'react';
import api from '../config/api';
import { signUpSchema } from '@hermyx/shared';
import { messages } from '@hermyx/shared';
import { useNavigate } from 'react-router-dom';

// Initial state for the React Hook useStateAction
const initialState = { success: null, errors: {} };

// Action executed when form is sent
const signUpAction = async (previousState, formData) => {
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
    await api.post('/users', fieldsData);

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

export function SignUp() {
  const navigate = useNavigate();

  const [state, signUpFormAction, isPending] = useActionState(
    signUpAction,
    initialState,
  );

  // Effect for navigating to login
  useEffect(() => {
    if (state.success) {
      navigate('/login');
    }
  }, [state.success, navigate]);

  return (
    <form action={signUpFormAction} noValidate>
      {state.success && <p className='text-green-600'>Signed up!</p>}
      {state.errors?.general && (
        <p className='text-red-600'>{state.errors.general[0]}</p>
      )}

      <div>
        <label>Username:</label>
        <input
          type='text'
          name='username'
          defaultValue={state.data?.username || ''}
          required
        />
        {state.errors?.username && (
          <p className='text-red-600'>{state.errors.username[0]}</p>
        )}
      </div>

      <div>
        <label>E-mail:</label>
        <input
          type='email'
          name='email'
          defaultValue={state.data?.email || ''}
          required
        />
        {state.errors?.email && (
          <p className='text-red-600'>{state.errors.email[0]}</p>
        )}
      </div>

      <div>
        <label>Password:</label>
        <input type='password' name='password' required />
        {state.errors?.password && (
          <p className='text-red-600'>{state.errors.password[0]}</p>
        )}
      </div>

      <div>
        <label>Confirm password:</label>
        <input type='password' name='confirmPassword' required />
        {state.errors?.confirmPassword && (
          <p className='text-red-600'>{state.errors.confirmPassword[0]}</p>
        )}
      </div>

      <button type='submit' disabled={isPending}>
        {isPending ? 'Signing up...' : 'Sign up'}
      </button>
    </form>
  );
}
