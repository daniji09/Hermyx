import { useContext, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Save, User, X } from 'lucide-react';
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

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { StripeManagement } from '../components/custom/StripeManagement';

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
          <h1 className='break-words text-3xl font-bold tracking-tight sm:text-4xl'>
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
    </main>
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
