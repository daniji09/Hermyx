import {
  useActionState,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit,
  Info,
  LockKeyhole,
  Mail,
  Save,
  User,
  UserRoundX,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FormInputField } from '../components/custom/form/FormInputField';
import { FormTextareaField } from '../components/custom/form/FormTextareaField';
import {
  getMyProfileQueryOptions,
  updateMyProfileMutationOptions,
} from '../queries/UsersQueries';
import { AuthContext } from '../contexts/AuthContext';
import { consts } from '@hermyx/shared';
import { messages as messagesShared } from '@hermyx/shared';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { StripeManagement } from '../components/custom/StripeManagement';
import { useAlert } from '../contexts/AlertContext';
import { deleteUser } from '../services/UsersServices';
import { useNavigate } from 'react-router-dom';
import { messages } from '../messages/messages';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { initialStateUseStateAction } from '../consts/consts';
import { FormAlert } from '../components/custom/form/FormAlert';
import {
  updateEmailAction,
  updatePasswordAction,
} from '../actions/UserActions';
import { auth } from '../config/firebase';
import { FormPasswordInputField } from '../components/custom/form/FormPasswordInputField';
import { GoogleIcon } from '../components/custom/GoogleSignInButton';
import {
  linkGoogleAccount,
  unlinkGoogleAccount,
} from '../services/AuthServices';
import { addEmailAuthenticationAction } from '../actions/AuthActions';

const STRIPE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_STRIPE_PUBLIC_KEY;

const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

const emptyMessage = 'Nothing registered';
const initialForm = {
  username: '',
  name: '',
  surnames: '',
  description: '',
};

export const MyProfile = () => {
  const hasPasswordProvider = auth.currentUser.providerData.some(
    (provider) => provider.providerId === 'password',
  );
  const hasGoogleProvider = auth.currentUser.providerData.some(
    (provider) => provider.providerId === 'google.com',
  );
  const googleProvider = auth.currentUser.providerData.find(
    (p) => p.providerId === 'google.com',
  );
  const queryClient = useQueryClient();
  const { setCurrentUser } = useContext(AuthContext);
  const [form, setForm] = useState(initialForm);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const { data, isLoading, isError } = useQuery(
    getMyProfileQueryOptions({
      retry: (failureCount, error) => {
        if (error.response?.status === 401) return false;
        return failureCount < 3;
      },
    }),
  );

  const { mutate, isPending } = useMutation(
    updateMyProfileMutationOptions({
      onSuccess: (response) => {
        const nextForm = buildForm(response.profile);

        setForm(nextForm);
        setErrors({});
        setSuccessMessage(response.message);
        setIsEditing(false);
        setCurrentUser((currentUser) =>
          currentUser
            ? { ...currentUser, username: response.profile.username }
            : currentUser,
        );
        queryClient.setQueryData(['getMyProfile'], (currentData) => ({
          ...currentData,
          user: {
            ...currentData?.user,
            ...response.profile,
          },
        }));
        queryClient.invalidateQueries({ queryKey: ['getMyProfile'] });
      },
      onError: (error) => {
        setErrors(error.response?.data?.errors || {});
        setSuccessMessage('');
      },
    }),
  );

  const profileForm = useMemo(() => buildForm(data?.user || {}), [data?.user]);

  useEffect(() => {
    if (!successMessage) return undefined;

    const timeoutId = setTimeout(() => {
      setSuccessMessage('');
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [successMessage]);

  const updateField = (field, value) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
    setSuccessMessage('');
  };

  const handleEdit = () => {
    setForm(profileForm);
    setIsEditing(true);
    setErrors({});
    setSuccessMessage('');
  };

  const handleCancel = () => {
    setForm(profileForm);
    setIsEditing(false);
    setErrors({});
    setSuccessMessage('');
  };

  const handleSave = () => {
    if (!isEditing) return;
    mutate(form);
  };

  if (isLoading) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div className='p-8 text-center text-muted-foreground'>
          Loading profile
        </div>
      </main>
    );
  }

  if (isError || !data?.user) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div className='rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive'>
          Could not load your profile
        </div>
      </main>
    );
  }

  const user = data.user;
  const displayName = [user.name, user.surnames].filter(Boolean).join(' ');

  return (
    <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
      <section className='mb-8 flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-center'>
        <div className='flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted'>
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={`${user.username} avatar`}
              className='h-full w-full object-cover'
            />
          ) : (
            <User className='h-12 w-12 text-muted-foreground' />
          )}
        </div>

        <div className='min-w-0 flex-1'>
          <h1 className='wrap-break-words text-3xl font-bold tracking-tight sm:text-4xl'>
            {displayName || user.username}
          </h1>

          <p className='mt-1 text-lg text-muted-foreground'>@{user.username}</p>
        </div>
      </section>

      <section className='rounded-lg border p-4 sm:p-6'>
        <form className='space-y-6'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
            <h2 className='text-xl font-semibold'>Profile information</h2>
            <div className='flex justify-end gap-2'>
              {isEditing && (
                <Button
                  type='button'
                  variant='outline'
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  <X aria-hidden='true' />
                  Cancel
                </Button>
              )}
              <Button
                type='button'
                onClick={isEditing ? handleSave : handleEdit}
                disabled={isPending}
              >
                {isEditing ? (
                  <Save aria-hidden='true' />
                ) : (
                  <Edit aria-hidden='true' />
                )}
                {isEditing ? 'Save' : 'Edit'}
              </Button>
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <FormInputField
              id='profileUsername'
              label='Username (required):'
              value={getFieldValue(
                isEditing ? form.username : profileForm.username,
                isEditing,
              )}
              maxLength={consts.USERNAME_MAX_LENGTH}
              disabled={!isEditing || isPending}
              invalid={!!errors.username}
              error={errors.username?.[0]}
              onChange={(event) => updateField('username', event.target.value)}
            />
            <FormInputField
              id='profileName'
              label='Name:'
              value={getFieldValue(
                isEditing ? form.name : profileForm.name,
                isEditing,
              )}
              maxLength={consts.NAME_MAX_LENGTH}
              disabled={!isEditing || isPending}
              invalid={!!errors.name}
              error={errors.name?.[0]}
              onChange={(event) => updateField('name', event.target.value)}
            />
            <FormInputField
              id='profileSurnames'
              label='Surnames:'
              value={getFieldValue(
                isEditing ? form.surnames : profileForm.surnames,
                isEditing,
              )}
              maxLength={consts.SURNAMES_MAX_LENGTH}
              disabled={!isEditing || isPending}
              invalid={!!errors.surnames}
              error={errors.surnames?.[0]}
              onChange={(event) => updateField('surnames', event.target.value)}
            />
            <div className='sm:col-span-2'>
              <FormTextareaField
                key={`profileDescription-${isEditing}`}
                id='profileDescription'
                label='Description:'
                value={getFieldValue(
                  isEditing ? form.description : profileForm.description,
                  isEditing,
                )}
                maxLength={consts.DESCRIPTION_MAX_LENGTH}
                disabled={!isEditing || isPending}
                invalid={!!errors.description}
                error={errors.description?.[0]}
                onChange={(event) =>
                  updateField('description', event.target.value)
                }
              />
            </div>
          </div>

          {successMessage && (
            <Alert>
              <AlertTitle>Saved</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {errors.general?.[0] && (
            <Alert variant='destructive'>
              <AlertTitle>Could not save changes</AlertTitle>
              <AlertDescription>{errors.general[0]}</AlertDescription>
            </Alert>
          )}
        </form>
      </section>

      <section className='rounded-lg border p-4 sm:p-6 mt-6'>
        <h2 className='text-xl font-semibold'>Access methods</h2>
        <div className='flex flex-col pt-4 gap-y-2'>
          <p className='text-lg'>E-mail & password</p>
          <div className='flex flex-col md:flex-row md:items-center justify-between'>
            <p className='text-sm'>
              {hasPasswordProvider
                ? `Authenticated with: ${user.email}`
                : 'E-mail authentication not added.'}
            </p>
            <div className='mt-2 md:mt-0'>
              {hasPasswordProvider ? (
                <>
                  <UpdateEmailButton
                    hasPasswordProvider={hasPasswordProvider}
                    currentEmail={user.email}
                  ></UpdateEmailButton>
                  <UpdatePasswordButton
                    hasPasswordProvider={hasPasswordProvider}
                  ></UpdatePasswordButton>
                </>
              ) : (
                <AddEmailAuthenticationButton
                  hasPasswordProvider={hasPasswordProvider}
                ></AddEmailAuthenticationButton>
              )}
            </div>
          </div>
          <p className='text-lg mt-3'>Google</p>
          <div className='flex flex-col md:flex-row md:items-center justify-between'>
            <p className='text-sm'>
              {hasGoogleProvider
                ? `Authenticated with: ${googleProvider.email}`
                : 'Google authentication not added.'}
            </p>
            <div className='mt-2 md:mt-0'>
              <LinkGoogleButton
                hasPasswordProvider={hasPasswordProvider}
                hasGoogleProvider={hasGoogleProvider}
                googleEmail={googleProvider?.email}
              ></LinkGoogleButton>
            </div>
          </div>
          {hasGoogleProvider && !hasPasswordProvider && (
            <div className='flex items-center self-end me-3'>
              <Info className='w-4 h-4 mr-1' aria-hidden='true' />
              <small>
                {`Can't unlink Google account if there is no e-mail
                authentication added.`}
              </small>
            </div>
          )}
        </div>
      </section>

      {stripePromise ? (
        <Elements stripe={stripePromise} options={{ locale: 'en' }}>
          <StripeManagement />
        </Elements>
      ) : (
        <section className='mt-6 rounded-lg border p-4 sm:p-6'>
          <Alert variant='destructive'>
            <AlertTitle>Stripe is not configured</AlertTitle>
            <AlertDescription>
              Missing VITE_STRIPE_PUBLIC_KEY or VITE_STRIPE_PUBLISHABLE_KEY.
            </AlertDescription>
          </Alert>
        </section>
      )}

      <section className='rounded-lg border p-4 sm:p-6 mt-6'>
        <h2 className='text-xl font-semibold text-destructive'>Danger zone</h2>
        <div className='flex flex-col pt-4'>
          <p className='text-lg text-destructive'>Delete account</p>
          <div className='flex items-center justify-between'>
            <p className='text-sm me-5'>
              {messages.MY_PROFILE.DELETE_ACCOUNT_TEXT}
            </p>
            <DeleteAccountButton>Delete account</DeleteAccountButton>
          </div>
        </div>
      </section>
    </main>
  );
};

const AddEmailAuthenticationButton = ({ hasPasswordProvider }) => {
  // Action handling for update email form
  const [state, addEmailAuthenticationFormAction, isPending] = useActionState(
    addEmailAuthenticationAction,
    initialStateUseStateAction,
  );

  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { showAlert } = useAlert();
  const navigate = useNavigate();

  // Logic for cleaning errors in fields or alerts when modifications are done
  const [clearedFields, setClearedFields] = useState({});
  const [prevServerState, setPrevServerState] = useState(state);
  const [isAlertClosed, setIsAlertClosed] = useState(false);

  // If the state has changed, field errors should be cleared
  if (state !== prevServerState) {
    setPrevServerState(state);
    setClearedFields({});
    setIsAlertClosed(false);
    if (state.success) {
      setIsOpen(false);
    }
  }

  // When user changes field's value, the error is not shown until the form is sent again
  const handleFieldChange = (e) => {
    const fieldName = e.target.name;
    setClearedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  // Effect for success handling
  useEffect(() => {
    if (state.success) {
      // Successful authentication add means a new login for security
      showAlert({
        title: messages.MY_PROFILE.ADD_EMAIL_AUTHENTICATION_ALERT.TITLE,
        description:
          messages.MY_PROFILE.ADD_EMAIL_AUTHENTICATION_ALERT.DESCRIPTION,
        onConfirm: async () => {
          try {
            await auth.signOut();
            queryClient.clear();
            navigate('/login');
          } catch (error) {
            console.error('Error logging out:', error);
          }
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  // Handle manual dialog close to reset visual errors
  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setIsAlertClosed(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          id='addEmailAuthenticationButton'
          type='button'
          disabled={isPending || hasPasswordProvider}
          className='me-2'
        >
          <Mail className='w-4 h-4 mr-2' aria-hidden='true' />
          {`Add e-mail authentication`}
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-sm'>
        <form
          action={addEmailAuthenticationFormAction}
          id='addEmailAuthenticationForm'
          noValidate
        >
          <DialogHeader>
            <DialogTitle>
              {messages.MY_PROFILE.ADD_EMAIL_AUTHENTICATION_DIALOG.TITLE}
            </DialogTitle>
            <DialogDescription>
              {messages.MY_PROFILE.ADD_EMAIL_AUTHENTICATION_DIALOG.DESCRIPTION}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
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
                aria-invalid={
                  !clearedFields.password && !!state.errors?.password
                }
                disabled={isPending}
                onChange={handleFieldChange}
              ></FormPasswordInputField>

              <FormPasswordInputField
                id='signUpConfirmPassword'
                label='Confirm password (required):'
                error={
                  !clearedFields.confirmPassword &&
                  state.errors?.confirmPassword
                    ? state.errors.confirmPassword[0]
                    : undefined
                }
                invalid={
                  !clearedFields.confirmPassword &&
                  !!state.errors?.confirmPassword
                }
                type='password'
                name='confirmPassword'
                defaultValue={state.data?.confirmPassword || ''}
                autoComplete='off'
                required
                pattern='[A-Z](?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$'
                aria-invalid={
                  !clearedFields.confirmPassword &&
                  !!state.errors?.confirmPassword
                }
                disabled={isPending}
                onChange={handleFieldChange}
              ></FormPasswordInputField>
            </div>
            {state.errors?.general && !isAlertClosed && (
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {state.errors.general[0]}
              </FormAlert>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' type='button'>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type='submit'
              form='addEmailAuthenticationForm'
              disabled={isPending}
            >
              {isPending ? 'Adding...' : 'Add e-mail authentication'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const UpdateEmailButton = ({ currentEmail, hasPasswordProvider }) => {
  // Action handling for update email form
  const [state, updateEmailFormAction, isPending] = useActionState(
    async (prevState, formData) => {
      const fieldsData = Object.fromEntries(formData);

      // Early check for same email than current
      if (fieldsData.email === currentEmail) {
        return {
          ...prevState,
          success: false,
          errors: {
            email: [messagesShared.CHANGING_EMAIL_TO_CURRENT],
          },
          data: fieldsData,
        };
      }
      return updateEmailAction(prevState, formData);
    },
    initialStateUseStateAction,
  );

  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Logic for cleaning errors in fields or alerts when modifications are done
  const [clearedFields, setClearedFields] = useState({});
  const [prevServerState, setPrevServerState] = useState(state);
  const [isAlertClosed, setIsAlertClosed] = useState(false);

  // If the state has changed, field errors should be cleared
  if (state !== prevServerState) {
    setPrevServerState(state);
    setClearedFields({});
    setIsAlertClosed(false);
    if (state.success) {
      setIsOpen(false);
    }
  }

  // When user changes field's value, the error is not shown until the form is sent again
  const handleFieldChange = (e) => {
    const fieldName = e.target.name;
    setClearedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  // Effect for success handling
  useEffect(() => {
    if (state.success) {
      queryClient.invalidateQueries({ queryKey: ['getMyProfile'] });
    }
  }, [state.success, queryClient]);

  // Handle manual dialog close to reset visual errors
  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setIsAlertClosed(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          id='updateEmailButton'
          type='button'
          disabled={isPending || !hasPasswordProvider}
          className='me-2'
        >
          <Mail className='w-4 h-4 mr-2' aria-hidden='true' />
          {'Change e-mail'}
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-sm'>
        <form action={updateEmailFormAction} id='updateEmailForm' noValidate>
          <DialogHeader>
            <DialogTitle>
              {messages.MY_PROFILE.CHANGE_EMAIL_DIALOG.TITLE}
            </DialogTitle>
            <DialogDescription>
              {messages.MY_PROFILE.CHANGE_EMAIL_DIALOG.DESCRIPTION(
                currentEmail,
              )}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <FormInputField
                id='profileNewEmail'
                label='New e-mail (required):'
                type='email'
                name='email'
                defaultValue={state.data?.email || ''}
                required
                placeholder='user@hermyx.com'
                autoComplete='email'
                pattern='^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
                disabled={isPending}
                onChange={handleFieldChange}
                error={
                  !clearedFields.email && state.errors?.email
                    ? state.errors.email[0]
                    : undefined
                }
                invalid={!clearedFields.email && !!state.errors?.email}
                aria-invalid={!clearedFields.email && !!state.errors?.email}
              />
            </div>
            <div className='space-y-2'>
              <FormInputField
                id='profileConfirmEmail'
                label='Confirm new e-mail (required):'
                type='email'
                name='confirmEmail'
                defaultValue={state.data?.confirmEmail || ''}
                required
                placeholder='user@hermyx.com'
                autoComplete='email'
                pattern='^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
                disabled={isPending}
                onChange={handleFieldChange}
                error={
                  !clearedFields.confirmEmail && state.errors?.confirmEmail
                    ? state.errors.confirmEmail[0]
                    : undefined
                }
                invalid={
                  !clearedFields.confirmEmail && !!state.errors?.confirmEmail
                }
                aria-invalid={
                  !clearedFields.confirmEmail && !!state.errors?.confirmEmail
                }
              />
            </div>
            {state.errors?.general && !isAlertClosed && (
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {state.errors.general[0]}
              </FormAlert>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' type='button'>
                Cancel
              </Button>
            </DialogClose>
            <Button type='submit' form='updateEmailForm' disabled={isPending}>
              {isPending ? 'Changing...' : 'Change e-mail'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const UpdatePasswordButton = ({ hasPasswordProvider }) => {
  // Action handling for update email form
  const [state, updatePasswordFormAction, isPending] = useActionState(
    updatePasswordAction,
    initialStateUseStateAction,
  );

  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Logic for cleaning errors in fields or alerts when modifications are done
  const [clearedFields, setClearedFields] = useState({});
  const [prevServerState, setPrevServerState] = useState(state);
  const [isAlertClosed, setIsAlertClosed] = useState(false);

  // If the state has changed, field errors should be cleared
  if (state !== prevServerState) {
    setPrevServerState(state);
    setClearedFields({});
    setIsAlertClosed(false);
    if (state.success) {
      setIsOpen(false);
    }
  }

  // When user changes field's value, the error is not shown until the form is sent again
  const handleFieldChange = (e) => {
    const fieldName = e.target.name;
    setClearedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  // Effect for success handling
  useEffect(() => {
    if (state.success) {
      queryClient.invalidateQueries({ queryKey: ['getMyProfile'] });
    }
  }, [state.success, queryClient]);

  // Handle manual dialog close to reset visual errors
  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setIsAlertClosed(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          id='updatePasswordButton'
          variant='destructive'
          type='button'
          disabled={isPending || !hasPasswordProvider}
          className='me-2'
        >
          <LockKeyhole className='w-4 h-4 mr-2' aria-hidden='true' />
          {'Change password'}
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-sm'>
        <form
          action={updatePasswordFormAction}
          id='updatePasswordForm'
          noValidate
        >
          <DialogHeader>
            <DialogTitle>
              {messages.MY_PROFILE.CHANGE_PASSWORD_DIALOG.TITLE}
            </DialogTitle>
            <DialogDescription>
              {messages.MY_PROFILE.CHANGE_PASSWORD_DIALOG.DESCRIPTION}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <FormPasswordInputField
                id='profileNewPassword'
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
                aria-invalid={
                  !clearedFields.password && !!state.errors?.password
                }
                disabled={isPending}
                onChange={handleFieldChange}
              />
            </div>
            <div className='space-y-2'>
              <FormPasswordInputField
                id='profileConfirmPassword'
                label='Confirm password (required):'
                error={
                  !clearedFields.confirmPassword &&
                  state.errors?.confirmPassword
                    ? state.errors.confirmPassword[0]
                    : undefined
                }
                invalid={
                  !clearedFields.confirmPassword &&
                  !!state.errors?.confirmPassword
                }
                type='password'
                name='confirmPassword'
                defaultValue={state.data?.confirmPassword || ''}
                autoComplete='off'
                required
                pattern='[A-Z](?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$'
                aria-invalid={
                  !clearedFields.confirmPassword &&
                  !!state.errors?.confirmPassword
                }
                disabled={isPending}
                onChange={handleFieldChange}
              />
            </div>
            {state.errors?.general && !isAlertClosed && (
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {state.errors.general[0]}
              </FormAlert>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant='outline' type='button'>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type='submit'
              form='updatePasswordForm'
              disabled={isPending}
            >
              {isPending ? 'Changing...' : 'Change password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const LinkGoogleButton = ({
  hasPasswordProvider,
  hasGoogleProvider,
  googleEmail,
}) => {
  const { setIsSyncing } = useContext(AuthContext);
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending: isPendingUnlink, mutate: mutateUnlink } = useMutation({
    onMutate: () => {
      setIsSyncing(true);
    },
    mutationFn: () => unlinkGoogleAccount(),
    onSuccess: () => {
      queryClient.invalidateQueries(['getMyProfile']);
    },
    // Backend error handling
    onError: (error) => {
      if (error?.isPopupCancel) {
        return;
      }
      showAlert({
        title: messages.MY_PROFILE.UNLINK_GOOGLE_ALERT.ERROR_TITLE,
        description:
          error?.errors?.general?.[0] || messagesShared.UNEXPECTED_ERROR,
      });
    },
    onSettled: () => {
      setIsSyncing(false);
    },
  });

  const { isPending: isPendingLink, mutate: mutateLink } = useMutation({
    mutationFn: () => linkGoogleAccount(),
    onMutate: () => {
      setIsSyncing(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['getMyProfile']);
    },
    // Backend error handling
    onError: (error) => {
      console.log(error);
      showAlert({
        title: messages.MY_PROFILE.LINK_GOOGLE_ALERT.ERROR_TITLE,
        description:
          error?.errors?.general?.[0] || messagesShared.UNEXPECTED_ERROR,
      });
    },
    onSettled: () => {
      setIsSyncing(false);
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    if (hasGoogleProvider)
      showAlert({
        title: messages.MY_PROFILE.UNLINK_GOOGLE_ALERT.TITLE,
        description:
          messages.MY_PROFILE.UNLINK_GOOGLE_ALERT.DESCRIPTION(googleEmail),
        variant: 'warning',
        confirmText: messages.MY_PROFILE.UNLINK_GOOGLE_ALERT.CONFIRM_TEXT,
        onConfirm: mutateUnlink,
      });
    else mutateLink();
  };

  return (
    <Button
      type='button'
      id='closeMissionButton'
      onClick={handleAttempt}
      disabled={
        isPendingUnlink ||
        isPendingLink ||
        (hasGoogleProvider && !hasPasswordProvider)
      }
      className='me-2'
    >
      <GoogleIcon className='h-4 w-4 mr-2' />
      {hasGoogleProvider ? 'Unlink Google' : 'Link Google'}
    </Button>
  );
};

const DeleteAccountButton = () => {
  const { logout } = useContext(AuthContext);
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const { isPending, mutate } = useMutation({
    mutationFn: () => deleteUser(),
    onSuccess: async () => {
      await logout();
      navigate('/');
    },
    // Backend error handling
    onError: (error) => {
      console.log(error.response.data.errors);
      showAlert({
        title: messages.MY_PROFILE.DELETE_ACCOUNT_ALERT.ERROR_TITLE,
        description: error?.response.data.errors?.general,
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    showAlert({
      title: messages.MY_PROFILE.DELETE_ACCOUNT_ALERT.TITLE,
      description: messages.MY_PROFILE.DELETE_ACCOUNT_ALERT.DESCRIPTION,
      variant: 'danger',
      confirmText: messages.MY_PROFILE.DELETE_ACCOUNT_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      id='deleteAccountButton'
      type='button'
      variant='destructive'
      onClick={handleAttempt}
      disabled={isPending}
    >
      <UserRoundX aria-hidden='true' />
      {'Delete account'}
    </Button>
  );
};

const buildForm = (profile) => {
  return {
    username: profile.username || '',
    name: profile.name || '',
    surnames: profile.surnames || '',
    description: profile.description || '',
  };
};

const getFieldValue = (value, isEditing) => {
  if (isEditing) return value;
  return value || emptyMessage;
};
