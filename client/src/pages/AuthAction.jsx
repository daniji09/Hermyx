import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  confirmPasswordResetActionCode,
  applyVerificationActionCode,
  verifyPasswordResetActionCode,
} from '../services/AuthServices';
import {
  confirmPasswordBaseSchema,
  newPasswordBaseSchema,
  messages as sharedMessages,
} from '@hermyx/shared';
import { messages } from '../messages/messages';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormAlert } from '../components/custom/form/FormAlert';
import { FormPasswordInputField } from '../components/custom/form/FormPasswordInputField';

const VERIFY_EMAIL_MODE = 'verifyEmail';
const RESET_PASSWORD_MODE = 'resetPassword';

export const AuthAction = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const actionCode = searchParams.get('oobCode');
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let isActive = true;

    const processAction = async () => {
      if (!actionCode) {
        setState({
          status: 'error',
          error: messages.EMAIL_ACTION.INVALID_LINK_TITLE,
        });
        return;
      }

      try {
        if (mode === VERIFY_EMAIL_MODE) {
          await applyVerificationActionCode(actionCode);
          if (isActive) setState({ status: 'verification-success' });
          return;
        }

        if (mode === RESET_PASSWORD_MODE) {
          const email = await verifyPasswordResetActionCode(actionCode);
          if (isActive) setState({ status: 'reset-ready', email });
          return;
        }

        if (isActive) {
          setState({
            status: 'error',
            error: messages.EMAIL_ACTION.UNKNOWN_ACTION,
          });
        }
      } catch (error) {
        if (isActive) {
          setState({
            status: 'error',
            error:
              error.errors?.general?.[0] ||
              sharedMessages.GENERAL.UNEXPECTED_ERROR,
          });
        }
      }
    };

    processAction();

    return () => {
      isActive = false;
    };
  }, [actionCode, mode]);

  return (
    <main className='flex min-h-[calc(100vh-60px)] items-center justify-center p-4'>
      {state.status === 'loading' && (
        <ActionStatusCard
          title={messages.EMAIL_ACTION.LOADING_TITLE}
          description={messages.EMAIL_ACTION.LOADING_DESCRIPTION}
        />
      )}

      {state.status === 'verification-success' && (
        <ActionStatusCard
          title={messages.EMAIL_ACTION.VERIFICATION_SUCCESS_TITLE}
          description={messages.EMAIL_ACTION.VERIFICATION_SUCCESS_DESCRIPTION}
        />
      )}

      {state.status === 'reset-ready' && (
        <PasswordResetForm
          actionCode={actionCode}
          email={state.email}
          onSuccess={() => setState({ status: 'reset-success' })}
        />
      )}

      {state.status === 'reset-success' && (
        <ActionStatusCard
          title={messages.EMAIL_ACTION.PASSWORD_RESET_SUCCESS_TITLE}
          description={messages.EMAIL_ACTION.PASSWORD_RESET_SUCCESS_DESCRIPTION}
        />
      )}

      {state.status === 'error' && (
        <ActionStatusCard
          title={messages.EMAIL_ACTION.INVALID_LINK_TITLE}
          description={state.error}
        />
      )}
    </main>
  );
};

const ActionStatusCard = ({ title, description, children }) => {
  return (
    <Card className='w-full max-w-155'>
      <CardHeader className='px-8 py-6'>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children && <CardContent className='px-8 pb-6'>{children}</CardContent>}
    </Card>
  );
};

const PasswordResetForm = ({ actionCode, email, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const passwordResult = newPasswordBaseSchema.safeParse(password);
    const confirmPasswordResult =
      confirmPasswordBaseSchema.safeParse(confirmPassword);
    const nextErrors = {};

    if (!passwordResult.success)
      nextErrors.password = passwordResult.error.issues[0]?.message;
    if (!confirmPasswordResult.success)
      nextErrors.confirmPassword =
        confirmPasswordResult.error.issues[0]?.message;
    if (
      passwordResult.success &&
      confirmPasswordResult.success &&
      passwordResult.data !== confirmPasswordResult.data
    )
      nextErrors.confirmPassword =
        sharedMessages.AUTH.SIGNUP.PASSWORDS_NOT_MATCH;

    setErrors(nextErrors);
    setGeneralError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setIsPending(true);
    try {
      await confirmPasswordResetActionCode(actionCode, passwordResult.data);
      onSuccess();
    } catch (error) {
      setErrors({
        password: error.errors?.password?.[0],
        confirmPassword: error.errors?.confirmPassword?.[0],
      });
      setGeneralError(
        error.errors?.general?.[0] ||
          sharedMessages.AUTH.PASSWORD_RESET.COULD_NOT_CHANGE,
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className='w-full max-w-155'>
      <CardHeader className='px-8 py-6'>
        <CardTitle>{messages.EMAIL_ACTION.PASSWORD_RESET_TITLE}</CardTitle>
        <CardDescription>
          {messages.EMAIL_ACTION.PASSWORD_RESET_DESCRIPTION(email)}
        </CardDescription>
      </CardHeader>

      <CardContent className='px-8 py-2'>
        <form id='passwordResetForm' onSubmit={handleSubmit} noValidate>
          <div className='flex flex-col gap-4'>
            <FormPasswordInputField
              id='passwordResetPassword'
              label='New password (required):'
              description={messages.SIGN_UP.PASSWORD_DESCRIPTION}
              error={errors.password}
              invalid={!!errors.password}
              name='password'
              value={password}
              autoComplete='new-password'
              required
              disabled={isPending}
              onChange={(event) => setPassword(event.target.value)}
            />
            <FormPasswordInputField
              id='passwordResetConfirmPassword'
              label='Confirm password (required):'
              error={errors.confirmPassword}
              invalid={!!errors.confirmPassword}
              name='confirmPassword'
              value={confirmPassword}
              autoComplete='new-password'
              required
              disabled={isPending}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {generalError && (
              <FormAlert onClose={() => setGeneralError(null)}>
                {generalError}
              </FormAlert>
            )}
          </div>
        </form>
      </CardContent>

      <CardFooter className='px-8 py-6'>
        <Button
          className='w-full'
          type='submit'
          form='passwordResetForm'
          disabled={isPending}
        >
          {isPending
            ? messages.EMAIL_ACTION.PASSWORD_RESET_PENDING_BUTTON
            : messages.EMAIL_ACTION.PASSWORD_RESET_BUTTON}
        </Button>
      </CardFooter>
    </Card>
  );
};
