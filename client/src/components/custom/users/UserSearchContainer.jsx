import { Link } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getImageUrl } from '../../../utils/media';
import { getInitials } from '../../../utils/avatar';

export const UserSearchContainer = ({
  users,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading,
  isLoadingMessage = 'Searching users...',
  isError,
  isErrorMessage = 'Oops! Something went wrong while loading users',
  noUsersMessage = 'It seems there are no users matching this search.',
}) => {
  return (
    <section className='w-full px-6 pb-4 sm:px-8 lg:px-12 xl:px-16'>
      <UsersSearchLoading isLoading={isLoading}>
        {isLoadingMessage}
      </UsersSearchLoading>

      <UsersSearchError isError={isError}>{isErrorMessage}</UsersSearchError>

      <NoUsersSearch users={users}>{noUsersMessage}</NoUsersSearch>

      <UserSearchContent
        users={users}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
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

const NoUsersSearch = ({ users, children }) => {
  return (
    <>
      {users?.length === 0 && (
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
  fetchNextPage,
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
          <div className='flex align-middle justify-center py-5'>
            <Button
              onClick={() => fetchNextPage()}
              className='rounded-lg p-2 hover:cursor-pointer'
              disabled={!hasNextPage || isFetchingNextPage}
            >
              {hasNextPage
                ? isFetchingNextPage
                  ? 'Loading'
                  : 'More users'
                : 'No more users to show'}
            </Button>
          </div>
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
                <CardTitle asChild>
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
