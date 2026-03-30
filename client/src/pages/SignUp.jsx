import { useActionState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpAction } from '../actions/AuthActions';
import { initialStateUseStateAction } from '../consts/consts';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { UseGoogleAuth } from '../hooks/useGoogleAuth';

export const SignUp = () => {
  const navigate = useNavigate();

  // Form action, standard sign up
  const [state, signUpFormAction, isPending] = useActionState(
    signUpAction,
    initialStateUseStateAction,
  );

  // Effect for navigating to login if sign up was complete with email
  useEffect(() => {
    if (state.success) navigate('/login');
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
      <form action={signUpFormAction} noValidate>
        {state.success && <p className='text-green-600'>Signed up!</p>}
        {state.errors?.general && (
          <p className='text-red-600'>{state.errors.general[0]}</p>
        )}
        {isError && <p className='text-red-600'>{error.errors.general[0]}</p>}

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

        <button type='submit' disabled={isPending || isGoogleAuthPending}>
          {isPending || isGoogleAuthPending ? 'Signing up...' : 'Sign up'}
        </button>
      </form>

      <GoogleSignInButton
        disabled={isPending || isGoogleAuthPending}
        onClick={mutate}
        isPending={isGoogleAuthPending}
        text='Sign up with Google'
      ></GoogleSignInButton>
    </>
  );
};
