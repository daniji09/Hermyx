import { useActionState, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUpAction } from '../actions/AuthActions';
import { initialStateUseStateAction } from '../consts/consts';
import { messages } from '../messages/messages';
import { Button } from '@/components/ui/button';
import { CardForm } from '../components/custom/form/CardForm';
import { FormInputField } from '../components/custom/form/FormInputField';
import { FormAlert } from '../components/custom/form/FormAlert';
import { FormPasswordInputField } from '../components/custom/form/FormPasswordInputField';
import { consts } from '@hermyx/shared';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { UseGoogleAuth } from '../hooks/useGoogleAuth';

export const SignUp = () => {
  // Form action, standard sign up
  const [state, signUpFormAction, isPending] = useActionState(
    signUpAction,
    initialStateUseStateAction,
  );

  // Effect for navigating to login
  const navigate = useNavigate();
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
    <main className='flex min-h-screen items-center justify-center p-4'>
      <SignUpForm
        state={state}
        action={signUpFormAction}
        isPending={isPending}
      ></SignUpForm>
    </main>
  );
};

const SignUpForm = ({ state, action, isPending }) => {
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
  return (
    <div className='flex flex-col w-full max-w-155 gap-4'>
      <CardForm id='signUpForm' action={action}>
        <CardForm.Header>
          <CardForm.Title>{messages.SIGN_UP.FORM_TITLE}</CardForm.Title>
        </CardForm.Header>

        <CardForm.Content legend='Application sign up form.'>
          <FormInputField
            id='signUpUsername'
            label='Username (required):'
            description={messages.SIGN_UP.USERNAME_DESCRIPTION}
            error={
              !clearedFields.username && state.errors?.username
                ? state.errors.username[0]
                : undefined
            }
            invalid={!clearedFields.username && !!state.errors?.username}
            type='text'
            name='username'
            defaultValue={state.data?.username || ''}
            autoComplete='username'
            required
            maxLength={consts.USERNAME_MAX_LENGTH}
            aria-invalid={!clearedFields.username && !!state.errors?.username}
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormInputField>

          <FormInputField
            id='signUpEmail'
            label='E-mail (required):'
            error={
              !clearedFields.email && state.errors?.email
                ? state.errors.email[0]
                : undefined
            }
            invalid={!clearedFields.email && !!state.errors?.email}
            type='email'
            name='email'
            defaultValue={state.data?.email || ''}
            autoComplete='email'
            required
            pattern='^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
            aria-invalid={!clearedFields.email && !!state.errors?.email}
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormInputField>

          <FormPasswordInputField
            id='signUpPassword'
            label='Password (required):'
            description={messages.SIGN_UP.PASSWORD_DESCRIPTION}
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

          <FormPasswordInputField
            id='signUpConfirmPassword'
            label='Confirm password (required):'
            error={
              !clearedFields.confirmPassword && state.errors?.confirmPassword
                ? state.errors.confirmPassword[0]
                : undefined
            }
            invalid={
              !clearedFields.confirmPassword && !!state.errors?.confirmPassword
            }
            type='password'
            name='confirmPassword'
            defaultValue={state.data?.confirmPassword || ''}
            autoComplete='off'
            required
            pattern='[A-Z](?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$'
            aria-invalid={
              !clearedFields.confirmPassword && !!state.errors?.confirmPassword
            }
            disabled={isPending}
            onChange={handleFieldChange}
          ></FormPasswordInputField>
        </CardForm.Content>

        <CardForm.Footer>
          <>
            <Button
              className='w-full'
              id='sendSignUp'
              type='submit'
              form='signUpForm'
              disabled={isPending}
            >
              {isPending ? 'Signing up...' : 'Sign up'}
            </Button>
            <GoogleSignInButton
              disabled={isPending || isGoogleAuthPending}
              onClick={mutate}
              isPending={isGoogleAuthPending}
              text='Sign up with Google'
            ></GoogleSignInButton>
          </>
        </CardForm.Footer>
      </CardForm>
      {state.errors?.general && !isAlertClosed && (
        <FormAlert onClose={() => setIsAlertClosed(true)}>
          {state.errors.general[0]}
        </FormAlert>
      )}
    </div>
  );
};
