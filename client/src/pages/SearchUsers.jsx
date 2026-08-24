import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { searchUsersByUsernameInfiniteQueryOptions } from '../queries/UsersQueries';
import { UserSearchContainer } from '../components/custom/users/UserSearchContainer';
import { PAGINATION_LIMIT } from '../consts/consts';
import { Users } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

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
      PAGINATION_LIMIT.USERS_SEARCH,
      { username: trimmedUsername },
      {
        enabled: !!trimmedUsername,
        retry: retryOption,
      },
    ),
  );
  const users = data?.pages.flatMap((page) => page.users);

  // Observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    // RootMargin begins load 100px before user's reaches the top, so the load is smooth
    rootMargin: '0px 0px 100px 0px',
  });

  // When observer is in view, is shot
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  return (
    <>
      <title>{`User results for ${username} | Hermyx`}</title>
      <meta
        name='description'
        content={`Results for searching a user by username.`}
      ></meta>
      <main className='container mx-auto max-w-6xl p-4 sm:p-6'>
        <section className='w-full'>
          <div className='flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
            <span className='hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
              <Users className='h-6 w-6' aria-hidden='true' />
            </span>
            <div className='min-w-0'>
              <h1 className='text-3xl sm:text-4xl font-bold tracking-tight wrap-break-words'>
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
          loadMoreRef={loadMoreRef}
        />
      </main>
    </>
  );
};
