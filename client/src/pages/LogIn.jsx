import { useActionState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logInAction } from '../actions/AuthActions';
import { initialStateUseStateAction } from '../consts/consts';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { UseGoogleAuth } from '../hooks/useGoogleAuth';

export const LogIn = () => {
  const navigate = useNavigate();
  const [state, logInFormAction, isPending] = useActionState(
    logInAction,
    initialStateUseStateAction,
  );

  // Effect for navigating to home
  useEffect(() => {
    if (state.success) navigate('/home');
  }, [state.success, navigate]);

  // Sign up with Google logic
  const {
    isPending: isGoogleAuthPending,
    isError,
    error,
    mutate,
  } = UseGoogleAuth();

  return (
    <>
      <form action={logInFormAction} noValidate>
        {state.success && <p className='text-green-600'>Signed up!</p>}
        {state.errors?.general && (
          <p className='text-red-600'>{state.errors.general[0]}</p>
        )}
        {isError && <p className='text-red-600'>{error.errors.general[0]}</p>}

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

        <button type='submit' disabled={isPending || isGoogleAuthPending}>
          {isPending || isGoogleAuthPending ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      <GoogleSignInButton
        disabled={isPending || isGoogleAuthPending}
        onClick={mutate}
        isPending={isGoogleAuthPending}
        text='Log in with Google'
      ></GoogleSignInButton>
    </>
  );
};
