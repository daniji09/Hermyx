import { useActionState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpAction } from '../actions/AuthActions';
import { initialStateUseStateAction } from '../consts/consts';
import { PrimaryButton } from '../components/PrimaryButton';

export const SignUp = () => {
  const navigate = useNavigate();
  const [state, signUpFormAction, isPending] = useActionState(
    signUpAction,
    initialStateUseStateAction,
  );

  // Effect for navigating to login
  useEffect(() => {
    if (state.success) navigate('/login');
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

      <PrimaryButton type='submit' disabled={isPending}>
        {isPending ? 'Signing up...' : 'Sign up'}
      </PrimaryButton>
    </form>
  );
};
