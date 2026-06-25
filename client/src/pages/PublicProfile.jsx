import { useContext, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import { MapPin, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PAGINATION_LIMIT } from '../consts/consts';
import { MissionSearchContainer } from '../components/custom/missions/MissionSearchContainer';
import { AuthContext } from '../contexts/AuthContext';
import {
  getPublicUserProfileMissionsInfiniteQueryOptions,
  getPublicUserProfileQueryOptions,
} from '../queries/UsersQueries';

export const PublicProfile = () => {
  const { username } = useParams();
  const { currentUser } = useContext(AuthContext);
  const [filter, setFilter] = useState('created');
  const isOwnProfile =
    username?.toLowerCase() === currentUser?.username?.toLowerCase();

  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false;
    return failureCount < 3;
  };

  const {
    data: profileData,
    isLoading: isProfileLoading,
    isError: isProfileError,
  } = useQuery(
    getPublicUserProfileQueryOptions(username, {
      retry: retryOption,
      enabled: !!username && !isOwnProfile,
    }),
  );

  const {
    data: missionsData,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: isMissionsLoading,
    isError: isMissionsError,
  } = useInfiniteQuery(
    getPublicUserProfileMissionsInfiniteQueryOptions(
      username,
      filter,
      PAGINATION_LIMIT.MISSIONS,
      {
        retry: retryOption,
        enabled: !!username && !isOwnProfile && !!profileData?.missionsVisible,
      },
    ),
  );

  const user = profileData?.user;
  const missionsVisible = profileData?.missionsVisible;
  const missions = missionsData?.pages.flatMap((page) => page.missions) || [];

  if (isOwnProfile) {
    return <Navigate to='/profile' replace />;
  }

  if (isProfileLoading) {
    return (
      <main className='container mx-auto max-w-5xl p-4 sm:p-6'>
        <div className='p-8 text-center text-muted-foreground'>
          Loading profile
        </div>
      </main>
    );
  }

  if (isProfileError || !user) {
    return (
      <main className='container mx-auto max-w-5xl p-4 sm:p-6'>
        <div className='rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive'>
          Profile not found
        </div>
      </main>
    );
  }

  const displayName = [user.name, user.surnames].filter(Boolean).join(' ');

  return (
    <main className='container mx-auto max-w-5xl p-4 sm:p-6'>
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

          {user.location && (
            <p className='mt-3 flex items-center gap-2 text-muted-foreground'>
              <MapPin className='h-4 w-4' aria-hidden='true' />
              {user.location}
            </p>
          )}

          {user.description && (
            <p className='mt-4 max-w-3xl whitespace-pre-line text-sm leading-6 sm:text-base'>
              {user.description}
            </p>
          )}
        </div>
      </section>

      {!missionsVisible ? (
        <section className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
          This user keeps their mission history private.
        </section>
      ) : (
        <Tabs
          defaultValue='created'
          value={filter}
          onValueChange={setFilter}
          className='w-full'
        >
          <TabsList className='mb-8 grid w-full max-w-100 grid-cols-2'>
            <TabsTrigger value='created'>Created</TabsTrigger>
            <TabsTrigger value='joined'>Joined</TabsTrigger>
          </TabsList>

          <TabsContent value='created' className='mt-0'>
            <MissionSearchContainer
              missions={missions}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              isLoading={isMissionsLoading}
              isError={isMissionsError}
              noMissionsMessage='This user has not created missions yet.'
            />
          </TabsContent>

          <TabsContent value='joined' className='mt-0'>
            <MissionSearchContainer
              missions={missions}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              isLoading={isMissionsLoading}
              isError={isMissionsError}
              noMissionsMessage='This user has not joined missions yet.'
            />
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
};
