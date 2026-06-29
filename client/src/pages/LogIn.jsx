import { useActionState, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logInAction } from '../actions/AuthActions';
import { initialStateUseStateAction } from '../consts/consts.js';
import { Button } from '@/components/ui/button';
import { CardForm } from '../components/custom/form/CardForm.jsx';
import { FormInputField } from '../components/custom/form/FormInputField.jsx';
import { FormAlert } from '../components/custom/form/FormAlert.jsx';
import { FormPasswordInputField } from '../components/custom/form/FormPasswordInputField.jsx';
import { messages } from '../messages/messages.js';
import { consts } from '@hermyx/shared';
import { GoogleSignInButton } from '../components/custom/GoogleSignInButton';
import { UseGoogleAuth } from '../hooks/UseGoogleAuth.jsx';
import { Separator } from '../components/ui/separator.jsx';

export const LogIn = () => {
  // Form action handling
  const [state, logInFormAction, isPending] = useActionState(
    logInAction,
    initialStateUseStateAction,
  );

  // Effect for navigating to home
  const navigate = useNavigate();
  useEffect(() => {
    if (state.success) navigate('/');
  }, [state.success, navigate]);

  return (
    <main className='flex min-h-[calc(100vh-60px)] items-center justify-center p-4'>
      <LogInForm
        state={state}
        action={logInFormAction}
        isPending={isPending}
      ></LogInForm>
    </main>
  );
};

const LogInForm = ({ state, action, isPending }) => {
  // Logic for cleaning errors in fields or alerts when modifications are done
  const [clearedFields, setClearedFields] = useState({});
  const [prevServerState, setPrevServerState] = useState(state);
  const [isAlertClosed, setIsAlertClosed] = useState(false);

  // If the state has changed, field errors should be cleared
  if (state !== prevServerState) {
    setPrevServerState(state);
    setClearedFields({});
    setIsAlertClosed(false);
  }

  // When user changes field's value, the error is not shown until the form is sent again
  const handleFieldChange = (e) => {
    const fieldName = e.target.name;
    setClearedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  // Sign up with Google logic
  const {
    isPending: isGoogleAuthPending,
    isError,
    error,
    mutate,
  } = UseGoogleAuth();

  return (
    <div className='flex flex-col w-full max-w-155 gap-4'>
      <CardForm id='logInForm' action={action}>
        <CardForm.Header>
          <CardForm.Title>{messages.LOG_IN.FORM_TITLE}</CardForm.Title>
          <CardForm.Description>
            {`Don't have an account? `}
            <Link
              to={'/signup'}
              className='text-black underline
            '
            >
              {'Sign up!'}
            </Link>
          </CardForm.Description>
        </CardForm.Header>

        <CardForm.Content legend='Application log in form.'>
          <FormInputField
            id='logInUsernameEmail'
            label='Username or e-mail (required):'
            error={
              !clearedFields.usernameEmail && state.errors?.usernameEmail
                ? state.errors.usernameEmail[0]
                : undefined
            }
            invalid={
              !clearedFields.usernameEmail && !!state.errors?.usernameEmail
            }
            type='text'
            name='usernameEmail'
            defaultValue={state.data?.usernameEmail || ''}
            autoComplete='off'
            maxLength={consts.USERNAME_MAX_LENGTH}
            required
            aria-invalid={
              !clearedFields.usernameEmail && !!state.errors?.usernameEmail
            }
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormInputField>
          <FormPasswordInputField
            id='logInPassword'
            label='Password (required):'
            error={
              !clearedFields.password && state.errors?.password
                ? state.errors.password[0]
                : undefined
            }
            invalid={!clearedFields.password && !!state.errors?.password}
            type='password'
            name='password'
            defaultValue={state.data?.password || ''}
            autoComplete='off'
            required
            pattern='[A-Z](?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$'
            aria-invalid={!clearedFields.password && !!state.errors?.password}
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormPasswordInputField>
        </CardForm.Content>

        <CardForm.Footer>
          <div className='flex flex-col w-full gap-y-1'>
            <Button
              className='w-full'
              id='sendLogIn'
              type='submit'
              form='logInForm'
              disabled={isPending}
            >
              {isPending ? 'Logging in...' : 'Log in'}
            </Button>
            <div className='grid grid-cols-3 grid-rows-1 justify-items-center'>
              <Separator className='my-4 w-fit'></Separator>
              <span className='text-muted-foreground self-center-safe'>o</span>
              <Separator className='my-4 w-fit'></Separator>
            </div>
            <GoogleSignInButton
              disabled={isPending || isGoogleAuthPending}
              onClick={mutate}
              isPending={isGoogleAuthPending}
              text='Log in with Google'
            ></GoogleSignInButton>
          </div>
        </CardForm.Footer>
      </CardForm>

      {state.errors?.general && !isAlertClosed && (
        <FormAlert onClose={() => setIsAlertClosed(true)}>
          {isError ? error : state.errors.general[0]}
        </FormAlert>
      )}
    </div>
  );
};
