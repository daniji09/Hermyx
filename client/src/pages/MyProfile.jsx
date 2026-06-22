import { useQuery } from '@tanstack/react-query';
import { User } from 'lucide-react';
import { getMyProfileQueryOptions } from '../queries/UsersQueries';

const emptyMessage = 'Nothing registered';

export const MyProfile = () => {
  const { data, isLoading, isError } = useQuery(
    getMyProfileQueryOptions({
      retry: (failureCount, error) => {
        if (error.response?.status === 401) return false;
        return failureCount < 3;
      },
    }),
  );

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

      <section className='grid gap-4 sm:grid-cols-2'>
        <ProfileField label='Name' value={user.name} />
        <ProfileField label='Surnames' value={user.surnames} />
        <ProfileField label='Username' value={user.username} />
        <ProfileField label='Description' value={user.description} large />
      </section>
    </main>
  );
};

const ProfileField = ({ label, value, large = false }) => {
  return (
    <article
      className={`rounded-lg border p-4 ${large ? 'sm:col-span-2' : ''}`}
    >
      <h2 className='mb-2 text-sm font-medium text-muted-foreground'>
        {label}
      </h2>

      <p className='break-words text-base'>{value || emptyMessage}</p>
    </article>
  );
};
