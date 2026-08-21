import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { searchUsersByUsernameInfiniteQueryOptions } from '../queries/UsersQueries';
import { UserSearchContainer } from '../components/custom/users/UserSearchContainer';
import { PAGINATION_LIMIT } from '../consts/consts';
import { Users } from 'lucide-react';

export const SearchUsers = () => {
  const [searchParams] = useSearchParams();
  const username = searchParams.get('username') || '';
  const trimmedUsername = username.trim();

  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false;
    return failureCount < 3;
  };

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery(
    searchUsersByUsernameInfiniteQueryOptions(
      PAGINATION_LIMIT.USERS,
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
      <section className='w-full px-6 pt-4 pb-8 sm:px-8 lg:px-12 xl:px-16'>
        <div className='flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
          <span className='hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <Users className='h-6 w-6' aria-hidden='true' />
          </span>
          <div className='min-w-0'>
            <h1 className='text-3xl font-bold tracking-tight wrap-break-words'>
              Users
            </h1>
            <p className='text-muted-foreground'>
              {data?.pages[0]?.pagination?.totalItems} results for &quot;
              {username.trim()}&quot;.
            </p>
          </div>
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
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </main>
  );
};
