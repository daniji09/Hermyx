import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getImageUrl } from '../../../utils/media';
import { getInitials } from '../../../utils/avatar';

export const UserSearchContainer = ({
  users,
  hasNextPage,
  isFetchingNextPage,
  loadMoreRef,
  isLoading,
  isLoadingMessage = 'Searching users...',
  isError,
  isErrorMessage = 'Oops! Something went wrong while loading users',
  noUsersMessage = 'It seems there are no users matching this search.',
}) => {
  return (
    <section className='w-full mt-8'>
      <UsersSearchLoading isLoading={isLoading}>
        {isLoadingMessage}
      </UsersSearchLoading>

      <UsersSearchError isError={isError}>{isErrorMessage}</UsersSearchError>

      <NoUsersSearch users={users} isLoading={isLoading}>
        {noUsersMessage}
      </NoUsersSearch>

      <UserSearchContent
        users={users}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        loadMoreRef={loadMoreRef}
      ></UserSearchContent>
    </section>
  );
};

const UsersSearchLoading = ({ isLoading, children }) => {
  return (
    <>
      {isLoading && (
        <div role='status' className='p-8 text-center text-muted-foreground'>
          {children}
        </div>
      )}
    </>
  );
};

const UsersSearchError = ({ isError, children }) => {
  return (
    <>
      {isError && (
        <div
          role='alert'
          className='rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive'
        >
          {children}
        </div>
      )}
    </>
  );
};

const NoUsersSearch = ({ users, children, isLoading }) => {
  return (
    <>
      {!isLoading && users?.length === 0 && (
        <div
          role='status'
          aria-live='polite'
          className='text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20'
        >
          {children}
        </div>
      )}
    </>
  );
};

const UserSearchContent = ({
  users,
  hasNextPage,
  isFetchingNextPage,
  loadMoreRef,
}) => {
  return (
    <>
      {users?.length > 0 && (
        <>
          <ul
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            aria-label='Users list'
          >
            {users.map((foundUser) => (
              <UserSearchCard key={foundUser.uid} foundUser={foundUser} />
            ))}
          </ul>
          {hasNextPage && (
            <div
              ref={isFetchingNextPage ? null : loadMoreRef}
              className='flex justify-center py-4 h-12 w-full'
            >
              {isFetchingNextPage && (
                <span className='text-xs text-muted-foreground animate-pulse'>
                  Loading conversations...
                </span>
              )}
            </div>
          )}
          {!hasNextPage && (
            <div className='text-center text-xs text-muted-foreground pt-6'>
              No more users found.
            </div>
          )}
        </>
      )}
    </>
  );
};

const UserSearchCard = ({ foundUser }) => {
  return (
    <li>
      <Card
        asChild
        className='justify-between group relative transition-all hover:border-primary/50 hover:shadow-md overflow-hidden focus-within:ring-1 focus-within:ring-secondary-foreground focus-within:ring-offset-2'
      >
        <article className='flex flex-col h-full'>
          <Link
            to={`/users/${foundUser.username}`}
            className='absolute inset-0 z-10'
            target='_blank'
            rel='noopener noreferrer'
          >
            <span className='sr-only'>See profile of {foundUser.username}</span>
          </Link>

          <CardHeader>
            <div className='flex items-center gap-3'>
              <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full'>
                <Avatar className='size-10 shrink-0'>
                  <AvatarImage src={getImageUrl(foundUser?.avatar)} alt='' />
                  <AvatarFallback>
                    {getInitials(foundUser?.username)}
                  </AvatarFallback>
                </Avatar>
              </span>
              <div className='min-w-0'>
                <CardTitle asChild className='text-2xl font-bold'>
                  <h2 className='wrap-break-words wrap-anywhere line-clamp-1 group-hover:underline group-hover:text-primary transition-colors'>
                    {foundUser.name && foundUser.surnames
                      ? `${foundUser.name} ${foundUser.surnames}`
                      : foundUser.username}
                  </h2>
                </CardTitle>
                <CardDescription className='truncate'>
                  {foundUser.username || 'User profile'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className='flex flex-1 flex-col -mt-2 mb-1'>
            <div className='wrap-break-words wrap-anywhere line-clamp-3 text-muted-foreground text-sm'>
              {foundUser.description ||
                `View this user profile and public information.`}
            </div>
          </CardContent>
        </article>
      </Card>
    </li>
  );
};
