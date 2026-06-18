import { useContext, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthContext } from './../contexts/AuthContext';
import { getUserMissionsInfiniteQueryOptions } from '../queries/MissionsQueries';
import { PAGINATION_LIMIT } from '../consts/consts';
import { MissionSearchContainer } from '../components/custom/missions/MissionSearchContainer';

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
    <main className='container mx-auto p-4 sm:p-6 max-w-5xl'>
      <div className='flex flex-col gap-6 mb-8'>
        <h1 className='text-3xl sm:text-4xl font-bold tracking-tight'>
          My Missions
        </h1>

        <Tabs
          defaultValue='published'
          value={filter}
          onValueChange={setFilter}
          className='w-full'
        >
          <TabsList className='grid w-full max-w-100 grid-cols-2 mb-8'>
            <TabsTrigger value='published'>Published</TabsTrigger>
            <TabsTrigger value='joined'>Joined</TabsTrigger>
          </TabsList>

          <TabsContent
            value='published'
            className='mt-0 focus-visible:outline-none'
          >
            <MissionSearchContainer
              missions={missions}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              isLoading={isLoading}
              isError={isError}
              noMissionsMessage={`It seems you haven't published any missions yet. Let's ask for some help!`}
            ></MissionSearchContainer>
          </TabsContent>

          <TabsContent
            value='joined'
            className='mt-0 focus-visible:outline-none'
          >
            <MissionSearchContainer
              missions={missions}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
              isLoading={isLoading}
              isError={isError}
              noMissionsMessage={`It seems you haven't joined any missions yet. Embrace an adventure!`}
            ></MissionSearchContainer>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};
