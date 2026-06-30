import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const UserSearchContainer = ({
  users,
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

      <UserSearchContent users={users}></UserSearchContent>
    </section>
  );
};

const UsersSearchLoading = ({ isLoading, children }) => {
  return (
    <>
      {isLoading && (
        <div className='flex justify-center p-8 text-muted-foreground'>
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
        <div className='text-center p-8 text-destructive border border-destructive/20 rounded-lg bg-destructive/5'>
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
        <div className='text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20'>
          {children}
        </div>
      )}
    </>
  );
};

const UserSearchContent = ({ users }) => {
  return (
    <>
      {users?.length > 0 && (
        <div
          className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
          aria-label='Users list'
        >
          {users.map((foundUser) => (
            <UserSearchCard key={foundUser.uid} foundUser={foundUser} />
          ))}
        </div>
      )}
    </>
  );
};

const UserSearchCard = ({ foundUser }) => {
  return (
    <Card asChild className='justify-between'>
      <article>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
              <User className='h-5 w-5' aria-hidden='true' />
            </span>
            <div className='min-w-0'>
              <CardTitle asChild>
                <h2 className='truncate'>{foundUser.username}</h2>
              </CardTitle>
              <CardDescription className='truncate'>
                {foundUser.email || 'User profile'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>
            View this user profile and public information.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link to={`/users/${foundUser.username}`}>See profile</Link>
          </Button>
        </CardFooter>
      </article>
    </Card>
  );
};
