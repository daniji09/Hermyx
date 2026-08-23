import { useActionState, useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordAction } from '../actions/AuthActions';
import { initialStateUseStateAction } from '../consts/consts.js';
import { AlertStatic } from '../components/custom/AlertStatic.jsx';
import { CardForm } from '../components/custom/form/CardForm.jsx';
import { FormAlert } from '../components/custom/form/FormAlert.jsx';
import { FormInputField } from '../components/custom/form/FormInputField.jsx';
import { Button } from '@/components/ui/button';
import { messages } from '../messages/messages.js';

export const ForgotPassword = () => {
  const [state, forgotPasswordFormAction, isPending] = useActionState(
    forgotPasswordAction,
    initialStateUseStateAction,
  );

  return (
    <main className='flex min-h-[calc(100vh-60px)] items-center justify-center p-4'>
      <ForgotPasswordForm
        state={state}
        action={forgotPasswordFormAction}
        isPending={isPending}
      />
    </main>
  );
};

const ForgotPasswordForm = ({ state, action, isPending }) => {
  const [clearedFields, setClearedFields] = useState({});
  const [prevState, setPrevState] = useState(state);
  const [isAlertClosed, setIsAlertClosed] = useState(false);

  if (state !== prevState) {
    setPrevState(state);
    setClearedFields({});
    setIsAlertClosed(false);
  }

  const handleFieldChange = (event) => {
    const fieldName = event.target.name;
    setClearedFields((previous) => ({ ...previous, [fieldName]: true }));
  };

  return (
    <div className='flex flex-col w-full max-w-155 gap-4'>
      <CardForm id='forgotPasswordForm' action={action}>
        <CardForm.Header>
          <CardForm.Title>{messages.FORGOT_PASSWORD.FORM_TITLE}</CardForm.Title>
          <CardForm.Description>
            {messages.FORGOT_PASSWORD.FORM_DESCRIPTION}
          </CardForm.Description>
        </CardForm.Header>

        <CardForm.Content legend='Password recovery form.'>
          <FormInputField
            id='forgotPasswordEmail'
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
            aria-invalid={!clearedFields.email && !!state.errors?.email}
            disabled={isPending || state.success}
            onChange={handleFieldChange}
          />
        </CardForm.Content>

        <CardForm.Footer>
          <div className='flex flex-col w-full gap-y-2'>
            {!state.success && (
              <Button
                className='w-full'
                id='sendPasswordReset'
                type='submit'
                form='forgotPasswordForm'
                disabled={isPending}
              >
                {isPending
                  ? messages.FORGOT_PASSWORD.SENDING_BUTTON
                  : messages.FORGOT_PASSWORD.SEND_BUTTON}
              </Button>
            )}
            <Link
              to='/login'
              className='text-center text-sm text-foreground underline'
            >
              {messages.FORGOT_PASSWORD.BACK_TO_LOGIN}
            </Link>
          </div>
        </CardForm.Footer>
      </CardForm>

      {state.success && !isAlertClosed && (
        <AlertStatic
          title={messages.FORGOT_PASSWORD.EMAIL_SENT_TITLE}
          onClose={() => setIsAlertClosed(true)}
        >
          {messages.FORGOT_PASSWORD.EMAIL_SENT}
        </AlertStatic>
      )}

      {state.errors?.general && !isAlertClosed && (
        <FormAlert onClose={() => setIsAlertClosed(true)}>
          {state.errors.general[0]}
        </FormAlert>
      )}
    </div>
  );
};
