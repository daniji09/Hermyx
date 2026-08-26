import { useActionState, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUpAction } from '../actions/AuthActions';
import { initialStateUseStateAction } from '../consts/consts';
import { messages } from '../messages/messages';
import { Button } from '@/components/ui/button';
import { CardForm } from '../components/custom/form/CardForm';
import { FormInputField } from '../components/custom/form/FormInputField';
import { FormAlert } from '../components/custom/form/FormAlert';
import { FormPasswordInputField } from '../components/custom/form/FormPasswordInputField';
import { consts } from '@hermyx/shared';
import { GoogleSignInButton } from '../components/custom/GoogleSignInButton';
import { UseGoogleAuth } from '../hooks/UseGoogleAuth';
import { Separator } from '@/components/ui/separator';

export const SignUp = () => {
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Form action, standard sign up
  const [state, signUpFormAction, isPending] = useActionState(
    signUpAction,
    initialStateUseStateAction,
  );

  // Effect for navigating to login
  const navigate = useNavigate();
  useEffect(() => {
    if (state.success)
      navigate('/login', { state: { verificationEmailSent: true } });
  }, [state.success, navigate]);

  return (
    <>
      <title>{`Sign up | Hermyx`}</title>
      <meta
        name='description'
        content={`Hermyx sign up via username/e-mail and password or Google.`}
      ></meta>
      <main className='flex min-h-[calc(100vh-60px)] items-center justify-center p-4'>
        <SignUpForm
          state={state}
          action={signUpFormAction}
          isPending={isPending}
          termsAccepted={termsAccepted}
          onTermsAcceptedChange={setTermsAccepted}
        ></SignUpForm>
      </main>
    </>
  );
};

const SignUpForm = ({
  state,
  action,
  isPending,
  termsAccepted,
  onTermsAcceptedChange,
}) => {
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
      <CardForm id='signUpForm' action={action}>
        <CardForm.Header>
          <CardForm.Title>{messages.SIGN_UP.FORM_TITLE}</CardForm.Title>
          <CardForm.Description>
            {`Already have an account? `}
            <Link
              to={'/login'}
              className='text-primary underline 
            '
            >
              {'Log in!'}
            </Link>
          </CardForm.Description>
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
            maxLength={consts.USER.USERNAME.MAX_LENGTH}
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
          <div className='flex flex-col w-full gap-y-1'>
            <div className='space-y-2 pb-3'>
              <div className='flex items-start gap-3'>
                <input
                  id='signUpTermsAccepted'
                  form='signUpForm'
                  name='termsAccepted'
                  type='checkbox'
                  value='true'
                  checked={termsAccepted}
                  onChange={(event) =>
                    onTermsAcceptedChange(event.target.checked)
                  }
                  className='mt-1 h-4 w-4 rounded border-input accent-primary'
                  aria-invalid={!!state.errors?.termsAccepted}
                  required
                  disabled={isPending || isGoogleAuthPending}
                />
                <label
                  htmlFor='signUpTermsAccepted'
                  className='text-sm leading-5 text-muted-foreground'
                >
                  Confirmo que tengo al menos 18 años y que he leído y acepto
                  los{' '}
                  <Link
                    to='/terms'
                    target='_blank'
                    rel='noreferrer'
                    className='text-primary underline'
                  >
                    Términos y condiciones de Hermyx
                  </Link>
                  . La{' '}
                  <Link
                    to='/privacy'
                    target='_blank'
                    rel='noreferrer'
                    className='text-primary underline'
                  >
                    Política de privacidad
                  </Link>{' '}
                  se consulta por separado.
                </label>
              </div>
              {state.errors?.termsAccepted && (
                <p className='text-sm text-destructive' role='alert'>
                  {state.errors.termsAccepted[0]}
                </p>
              )}
            </div>
            <Button
              className='w-full'
              id='sendSignUp'
              type='submit'
              form='signUpForm'
              disabled={isPending}
            >
              {isPending ? 'Signing up...' : 'Sign up'}
            </Button>
            <div
              className='grid grid-cols-3 grid-rows-1 justify-items-center'
              aria-hidden='true'
            >
              <Separator className='my-4 w-fit'></Separator>
              <span className='text-muted-foreground self-center-safe'>o</span>
              <Separator className='my-4 w-fit'></Separator>
            </div>
            <GoogleSignInButton
              disabled={isPending || isGoogleAuthPending || !termsAccepted}
              onClick={() => mutate({ termsAccepted: true })}
              isPending={isGoogleAuthPending}
              text='Sign up with Google'
            ></GoogleSignInButton>
            {!termsAccepted && (
              <p className='text-center text-xs text-muted-foreground'>
                Acepta los términos para continuar con Google.
              </p>
            )}
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
