import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getMissionsInfiniteQueryOptions } from '../queries/MissionsQueries';
import { PAGINATION_LIMIT } from '../consts/consts';
import { useSearchParams } from 'react-router-dom';
import { MissionSearchContainer } from '../components/custom/missions/MissionSearchContainer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Map } from 'lucide-react';

export const SearchMission = () => {
  // Search params, if they exists
  const [searchParams, setSearchParams] = useSearchParams();
  const title = searchParams.get('title') || '';
  const minPayment = searchParams.get('minPayment') || '';
  const maxPayment = searchParams.get('maxPayment') || '';
  const [minPaymentInput, setMinPaymentInput] = useState(minPayment);
  const [maxPaymentInput, setMaxPaymentInput] = useState(maxPayment);
  const maxDistanceKm = searchParams.get('maxDistanceKm') || '';
  const [maxDistanceInput, setMaxDistanceInput] = useState(maxDistanceKm);
  const searchFilters = {
    ...(title ? { title } : {}),
    ...(minPayment ? { minPayment } : {}),
    ...(maxPayment ? { maxPayment } : {}),
    ...(maxDistanceKm ? { maxDistanceKm } : {}),
  };

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
    getMissionsInfiniteQueryOptions(PAGINATION_LIMIT.MISSIONS, searchFilters, {
      retry: retryOption,
    }),
  );
  // Data destructure for cleaner code
  const missions = data?.pages.flatMap((page) => page.missions);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMinPaymentInput(minPayment);
    setMaxPaymentInput(maxPayment);
    setMaxDistanceInput(maxDistanceKm);
  }, [minPayment, maxPayment, maxDistanceKm]);

  const handleFiltersSubmit = (event) => {
    event.preventDefault();
    const nextMinPayment = minPaymentInput.trim();
    const nextMaxPayment = maxPaymentInput.trim();
    const nextMaxDistanceKm = maxDistanceInput.trim();
    const nextParams = new URLSearchParams(searchParams);

    if (nextMinPayment) {
      nextParams.set('minPayment', nextMinPayment);
    } else {
      nextParams.delete('minPayment');
    }

    if (nextMaxPayment) {
      nextParams.set('maxPayment', nextMaxPayment);
    } else {
      nextParams.delete('maxPayment');
    }

    if (nextMaxDistanceKm) {
      nextParams.set('maxDistanceKm', nextMaxDistanceKm);
    } else {
      nextParams.delete('maxDistanceKm');
    }

    setSearchParams(nextParams);
  };

  const handleClearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('minPayment');
    nextParams.delete('maxPayment');
    nextParams.delete('maxDistanceKm');
    setMinPaymentInput('');
    setMaxPaymentInput('');
    setMaxDistanceInput('');
    setSearchParams(nextParams);
  };

  return (
    <main className='container mx-auto max-w-6xl p-4 sm:p-6'>
      <section className='w-full'>
        <div className='flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
          <span className='hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <Map className='h-6 w-6' aria-hidden='true' />
          </span>
          <div className='min-w-0'>
            <h1 className='text-3xl sm:text-4xl font-bold tracking-tight wrap-break-words'>
              Missions
            </h1>
            <p className='text-muted-foreground'>
              {data?.pages[0]?.pagination?.totalItems} results for &quot;
              {title.trim()}&quot;.
            </p>
          </div>
        </div>
      </section>
      <section className='w-full' aria-label='Filters section'>
        <div className='mb-8 flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
          <form
            onSubmit={handleFiltersSubmit}
            className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-end'
          >
            <div className='grid gap-1.5'>
              <label htmlFor='minPayment' className='text-sm font-medium'>
                Min price
              </label>
              <Input
                id='minPayment'
                name='minPayment'
                type='number'
                min='0'
                step='0.1'
                value={minPaymentInput}
                onChange={(event) => setMinPaymentInput(event.target.value)}
                placeholder='0'
                className='sm:w-36'
              />
            </div>

            <div className='grid gap-1.5'>
              <label htmlFor='maxPayment' className='text-sm font-medium'>
                Max price
              </label>
              <Input
                id='maxPayment'
                name='maxPayment'
                type='number'
                min='0'
                step='0.1'
                value={maxPaymentInput}
                onChange={(event) => setMaxPaymentInput(event.target.value)}
                placeholder='Any'
                className='sm:w-36'
              />
            </div>

            <div className='grid gap-1.5'>
              <label htmlFor='maxDistanceKm' className='text-sm font-medium'>
                Max distance
              </label>
              <Input
                id='maxDistanceKm'
                name='maxDistanceKm'
                type='number'
                min='0'
                step='0.1'
                value={maxDistanceInput}
                onChange={(event) => setMaxDistanceInput(event.target.value)}
                placeholder='Any'
                className='sm:w-36'
              />
            </div>

            <div className='flex gap-2'>
              <Button type='submit'>Apply</Button>
              <Button
                type='button'
                variant='outline'
                onClick={handleClearFilters}
                disabled={!minPayment && !maxPayment && !maxDistanceKm}
              >
                Clear
              </Button>
            </div>
          </form>
        </div>
      </section>
      <MissionSearchContainer
        missions={missions}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        isLoading={isLoading}
        isError={isError}
      ></MissionSearchContainer>
    </main>
  );
};
