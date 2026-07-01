import React from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { timestampToDayMonthYear } from './../../../utils/date';
import { Button } from '@/components/ui/button';
import { Star, Users, HandCoins } from 'lucide-react';
import { messages } from '../../../messages/messages';

export const MissionSearchContainer = ({
  missions,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading,
  isLoadingMessage = messages.SEARCH_MISSIONS.LOADING,
  isError,
  isErrorMessage = messages.SEARCH_MISSIONS.ERROR,
  noMissionsMessage = messages.SEARCH_MISSIONS.NO_MISSIONS,
}) => {
  return (
    <section className='w-full px-6 pb-4 sm:px-8 lg:px-12 xl:px-16'>
      <MissionsSearchLoading isLoading={isLoading}>
        {isLoadingMessage}
      </MissionsSearchLoading>

      <MissionsSearchError isError={isError}>
        {isErrorMessage}
      </MissionsSearchError>

      <NoMissionsSearch missions={missions}>
        {noMissionsMessage}
      </NoMissionsSearch>

      <MissionSearchContent
        missions={missions}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      ></MissionSearchContent>
    </section>
  );
};

const MissionsSearchLoading = ({ isLoading, children }) => {
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

const MissionsSearchError = ({ isError, children }) => {
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

const NoMissionsSearch = ({ missions, children }) => {
  return (
    <>
      {missions?.length === 0 && (
        <div className='text-center p-12 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20'>
          {children}
        </div>
      )}
    </>
  );
};

const MissionSearchContent = ({
  missions,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}) => {
  return (
    <>
      {missions?.length > 0 && (
        <>
          <div
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
            aria-label='Missions list'
          >
            {missions?.map((mission) => (
              <MissionSearchCard
                key={mission.mid}
                mission={mission}
              ></MissionSearchCard>
            ))}
          </div>
          <div className='flex align-middle justify-center py-5'>
            <Button
              onClick={() => fetchNextPage()}
              className='rounded-lg p-2 hover:cursor-pointer'
              disabled={!hasNextPage || isFetchingNextPage}
            >
              {hasNextPage
                ? isFetchingNextPage
                  ? 'Loading'
                  : 'More missions'
                : 'No more missions to show'}
            </Button>
          </div>
        </>
      )}
    </>
  );
};

const MissionSearchCard = ({ mission }) => {
  return (
    <Card asChild className='justify-between'>
      <article>
        <CardHeader>
          <CardTitle asChild>
            <h2>{mission.title}</h2>
          </CardTitle>
          <CardDescription>
            By{' '}
            <Link to={`/users/${mission.username}`} className='hover:underline'>
              {mission.username}
            </Link>
          </CardDescription>
          <CardAction>
            <p>{timestampToDayMonthYear(mission.publication_date)}</p>
          </CardAction>
        </CardHeader>
        <CardContent className='flex flex-1 flex-col'>
          <div className='mb-4 line-clamp-4'>{mission.description}</div>
          <div className='mt-auto flex items-center gap-6'>
            <div className='flex items-center gap-2'>
              <span className='sr-only'>Difficulty:</span>
              <span>{mission.difficulty}</span>
              <Star className='h-6 w-6' aria-hidden='true' />
            </div>
            <div className='flex items-center gap-2'>
              <span className='sr-only'>Vacancies:</span>
              <span>
                {mission.occupied_vacancies}/{mission.total_vacancies}
              </span>
              <Users className='h-6 w-6' aria-hidden='true' />
            </div>
            <div className='flex items-center gap-2'>
              <span className='sr-only'>Monetary reward:</span>
              <span>{mission.monetary_reward}$</span>
              <HandCoins className='h-6 w-6' aria-hidden='true' />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link to={`/missions/${mission.mid}`}>See mission</Link>
          </Button>
        </CardFooter>
      </article>
    </Card>
  );
};
