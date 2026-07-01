import { useInfiniteQuery } from '@tanstack/react-query';
import { getMissionsInfiniteQueryOptions } from './../queries/MissionsQueries';
import { PAGINATION_LIMIT } from '../consts/consts';
import { useSearchParams } from 'react-router-dom';
import { MissionSearchContainer } from './../components/custom/missions/MissionSearchContainer';

export const SearchMission = () => {
  // Search params, if they exists
  const [searchParams] = useSearchParams();
  const title = searchParams.get('title') || '';

  // Query options
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false; // So Axios won't try to search again the data if there is none
    return failureCount < 3;
  };

  // API call using React Query (if the same query is used in more than one component it should be isolated)
  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery(
    getMissionsInfiniteQueryOptions(
      PAGINATION_LIMIT.MISSIONS,
      { title },
      {
        retry: retryOption,
      },
    ),
  );
  // Data destructure for cleaner code
  const missions = data?.pages.flatMap((page) => page.missions);

  return (
    <main>
      <section className='w-full px-6 pt-4 sm:px-8 lg:px-12 xl:px-16'>
        <div className='mb-6 border-b pb-4'>
          <h1 className='text-3xl font-bold tracking-tight'>Missions</h1>
          <p className='text-muted-foreground'>Results for "{title.trim()}"</p>
        </div>
      </section>
      <MissionSearchContainer
        missions={missions}
        hasNextPage={hasNextPage}
        isFetchNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        isLoading={isLoading}
        isError={isError}
      ></MissionSearchContainer>
    </main>
  );
};
