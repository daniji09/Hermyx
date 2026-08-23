import { useContext, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthContext } from './../contexts/AuthContext';
import { getUserMissionsInfiniteQueryOptions } from '../queries/MissionsQueries';
import { PAGINATION_LIMIT } from '../consts/consts';
import { MissionSearchContainer } from '../components/custom/missions/MissionSearchContainer';
import { Map } from 'lucide-react';

export const UserMissions = () => {
  // Current user from context
  const { currentUser } = useContext(AuthContext);

  // State that controls current tab
  const [filter, setFilter] = useState('published');

  // Query options
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false; // So Axios won't try to search again the data if there is none
    return failureCount < 3;
  };

  // API call using React Query (if the same query is used in more than one componente it should be isolated)
  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery(
    getUserMissionsInfiniteQueryOptions(
      currentUser.id,
      filter,
      PAGINATION_LIMIT.MISSIONS,
      {
        retry: retryOption,
        enabled: !!currentUser?.id,
      },
    ),
  );

  // Data destructure for cleaner code
  const missions = data?.pages.flatMap((page) => page.missions) || [];

  return (
    <main className='container mx-auto p-4 sm:p-6 max-w-6xl '>
      <section className='w-full px-6 pt-4 sm:px-8 lg:px-12 xl:px-16'>
        <div className='flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
          <span className='hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <Map className='h-6 w-6' aria-hidden='true' />
          </span>
          <div className='min-w-0'>
            <h1 className='text-3xl sm:text-4xl font-bold tracking-tight wrap-break-words'>
              My missions
            </h1>
            <p className='text-muted-foreground'>
              Manage your published missions and track your active
              participations.
            </p>
          </div>
        </div>
      </section>
      <UserMissionsTable
        missions={missions}
        filter={filter}
        setFilter={setFilter}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        isLoading={isLoading}
        isError={isError}
      ></UserMissionsTable>
    </main>
  );
};

export const UserMissionsTable = ({
  missions,
  filter,
  setFilter,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading,
  isError,
  sectionClassName = 'flex flex-col gap-6 mb-8 w-full px-6 pt-4 sm:px-8 lg:px-12 xl:px-16',
}) => {
  return (
    <section className={sectionClassName}>
      <Tabs
        defaultValue='published'
        value={filter}
        onValueChange={setFilter}
        className='w-full'
      >
        <TabsList
          aria-label='Filter your missions'
          className='grid h-auto w-full grid-cols-2 bg-muted p-1 my-4'
        >
          <TabsTrigger value='published'>Published</TabsTrigger>
          <TabsTrigger value='joined'>Joined</TabsTrigger>
        </TabsList>

        <TabsContent value='published'>
          <MissionSearchContainer
            missions={missions}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            isLoading={isLoading}
            isError={isError}
            noMissionsMessage={`It seems you haven't published any missions yet. Let's ask for some help!`}
            sectionClassName='w-full'
          ></MissionSearchContainer>
        </TabsContent>

        <TabsContent value='joined' className='mt-0'>
          <MissionSearchContainer
            missions={missions}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            isLoading={isLoading}
            isError={isError}
            noMissionsMessage={`It seems you haven't joined any missions yet. Embrace an adventure!`}
            sectionClassName='w-full'
          ></MissionSearchContainer>
        </TabsContent>
      </Tabs>
    </section>
  );
};
