import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { searchUsersByUsernameInfiniteQueryOptions } from '../queries/UsersQueries';
import { UserSearchContainer } from '../components/custom/users/UserSearchContainer';
import { PAGINATION_LIMIT } from '../consts/consts';

export const SearchUsers = () => {
  const [searchParams] = useSearchParams();
  const username = searchParams.get('username') || '';
  const trimmedUsername = username.trim();

  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false;
    return failureCount < 3;
  };

  const { data, isLoading, isError } = useInfiniteQuery(
    searchUsersByUsernameInfiniteQueryOptions(
      PAGINATION_LIMIT.MISSIONS,
      { username: trimmedUsername },
      {
        enabled: !!trimmedUsername,
        retry: retryOption,
      },
    ),
  );
  const users = data?.pages.flatMap((page) => page.users); // TODO: pagination must be done with infinite scroll

  return (
    <main>
      <section className='w-full px-6 pt-4 sm:px-8 lg:px-12 xl:px-16'>
        <div className='mb-6 border-b pb-4'>
          <h1 className='text-3xl font-bold tracking-tight'>Users</h1>
          <p className='text-muted-foreground'>
            Results for "{trimmedUsername}"
          </p>
        </div>
      </section>
      <UserSearchContainer
        users={trimmedUsername ? users : []}
        isLoading={isLoading}
        isError={isError}
        noUsersMessage={
          trimmedUsername
            ? 'No users found with that username.'
            : 'Write a username to search for users.'
        }
      />
    </main>
  );
};
