import { useActionState } from 'react';
import api from '../config/api';
import { signUpSchema } from '@hermyx/shared';
import { messages } from '@hermyx/shared';

export function SignUp() {
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
      const { data, status } = await api.post('/users', fieldsData, {
        validateStatus: (status) =>
          status === 201 || status === 400 || status === 500,
      });

      // If it does not create it successfully, it returns the error
      if (status !== 201)
        throw {
          controlledError: true,
          errors: data.errors,
        };

      // Otherwise, its successful
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

  const [state, signUpFormAction, isPending] = useActionState(
    signUpAction,
    initialState,
  );

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
