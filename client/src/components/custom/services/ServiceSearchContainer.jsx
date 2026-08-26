import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { timestampToDayMonthYear } from './../../../utils/date';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { messages } from '../../../messages/messages';
import { MISSION_STATUS } from '@hermyx/shared';
import { getImageUrl } from '../../../utils/media';
import { useInView } from 'react-intersection-observer';

export const MissionSearchContainer = ({
  missions,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading,
  isLoadingMessage = messages.SEARCH_SERVICES.LOADING,
  isError,
  isErrorMessage = messages.SEARCH_SERVICES.ERROR,
  noMissionsMessage = messages.SEARCH_SERVICES.NO_SERVICES,
  sectionClassName = 'w-full',
  infiniteScroll,
}) => {
  return (
    <section className={sectionClassName}>
      <MissionsSearchLoading isLoading={isLoading}>
        {isLoadingMessage}
      </MissionsSearchLoading>

      <MissionsSearchError isError={isError}>
        {isErrorMessage}
      </MissionsSearchError>

      <NoMissionsSearch missions={missions} isLoading={isLoading}>
        {noMissionsMessage}
      </NoMissionsSearch>

      <MissionSearchContent
        missions={missions}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        infiniteScroll={infiniteScroll}
      ></MissionSearchContent>
    </section>
  );
};

const MissionsSearchLoading = ({ isLoading, children }) => {
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

const MissionsSearchError = ({ isError, children }) => {
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

const NoMissionsSearch = ({ missions, isLoading, children }) => {
  return (
    <>
      {!isLoading && missions?.length === 0 && (
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

const MissionSearchContent = ({
  missions,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  infiniteScroll,
}) => {
  // Observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    // RootMargin begins load 100px before user's reaches the top, so the load is smooth
    rootMargin: '0px 0px 100px 0px',
  });

  // When observer is in view, is shot
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      {missions?.length > 0 && (
        <>
          <ul
            className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
            aria-label='Services list'
          >
            {missions?.map((mission) => (
              <MissionSearchCard key={mission.mid} mission={mission} />
            ))}
          </ul>
          {infiniteScroll ? (
            <>
              {hasNextPage && (
                <div
                  ref={isFetchingNextPage ? null : loadMoreRef}
                  className='flex justify-center py-4 h-12 w-full'
                >
                  {isFetchingNextPage && (
                    <span className='text-xs text-muted-foreground animate-pulse'>
                      Loading services...
                    </span>
                  )}
                </div>
              )}
              {!hasNextPage && (
                <div className='text-center text-xs text-muted-foreground pt-6'>
                  No more services found.
                </div>
              )}
            </>
          ) : (
            <div className='flex align-middle justify-center py-5'>
              <Button
                onClick={() => fetchNextPage()}
                className='rounded-lg p-2 hover:cursor-pointer'
                disabled={!hasNextPage || isFetchingNextPage}
              >
                {hasNextPage
                  ? isFetchingNextPage
                    ? 'Loading'
                    : 'More services'
                  : 'No more services to show'}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
};

export const MissionSearchCard = ({ mission }) => {
  const missionPhoto = mission.photos?.[0]
    ? getImageUrl(mission.photos[0])
    : 'https://images.unsplash.com/photo-1647221597996-54f3d0f73809?q=80&w=1932&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
  return (
    <li className='list-none h-full'>
      <Card
        asChild
        className='justify-between group relative transition-all hover:border-primary/50 hover:shadow-md overflow-hidden pt-0 focus-within:ring-1 focus-within:ring-secondary-foreground focus-within:ring-offset-2'
      >
        <article className='flex flex-col h-full'>
          <Link
            to={`/missions/${mission.mid}`}
            className='absolute inset-0 z-10'
            target='_blank'
            rel='noopener noreferrer'
          >
            <span className='sr-only'>See service {mission.title}</span>
          </Link>

          <div className='aspect-video w-full overflow-hidden bg-muted'>
            <img
              src={missionPhoto}
              alt={
                mission?.title
                  ? `Cover of the service ${mission.title}`
                  : 'Service cover'
              }
              className='aspect-video w-full object-cover transition-transform duration-300 group-hover:scale-105'
            />
          </div>

          <CardHeader>
            <CardTitle asChild className='text-2xl font-bold'>
              <h2 className='tracking-tight truncate me-3 group-hover:underline group-has-[.user-link:hover]:no-underline group-hover:text-primary group-has-[.user-link:hover]:text-foreground transition-colors'>
                {mission.title}
              </h2>
            </CardTitle>
            <CardDescription>
              By{' '}
              <Link
                to={`/users/${mission.username}`}
                className='user-link relative z-20 font-medium hover:text-primary hover:underline transition-colors'
                target='_blank'
                rel='noopener noreferrer'
              >
                {mission.username}
              </Link>
            </CardDescription>
            <CardAction>
              <p>{timestampToDayMonthYear(mission.publication_date)}</p>
            </CardAction>
          </CardHeader>

          <CardContent className='flex flex-1 flex-col -mt-2'>
            <div className='mb-5 wrap-break-words wrap-anywhere line-clamp-3'>
              {mission.description}
            </div>
            <div className='mt-auto flex items-center justify-between gap-6'>
              <div className='flex items-center gap-2'>
                <span className='sr-only'>Vacancies:</span>
                <span>
                  {mission.occupied_vacancies}/{mission.total_vacancies}
                </span>
                <Users className='h-6 w-6' aria-hidden='true' />
              </div>
              <div className='flex items-center gap-2'>
                <span className='sr-only'>Status:</span>
                <span className='italic text-muted-foreground'>
                  {MISSION_STATUS[mission?.status]?.LABEL}
                </span>
              </div>
            </div>
          </CardContent>
        </article>
      </Card>
    </li>
  );
};
