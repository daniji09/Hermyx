import { useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  getAllMissionsInfiniteQueryOptions,
  getUserMissionsInfiniteQueryOptions,
} from '../queries/ServicesQueries';
import { PAGINATION_LIMIT } from '../consts/consts';
import {
  MissionSearchContainer,
  MissionSearchCard,
} from '../components/custom/services/ServiceSearchContainer';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { getImageUrl } from '../utils/media';
import { getDisplayName, getInitials } from '../utils/avatar';
import {
  Compass,
  Plus,
  Map,
  Users,
  ShieldCheck,
  MessageSquareWarning,
} from 'lucide-react';
import { useInView } from 'react-intersection-observer';

export const Home = () => {
  const { currentUser } = useContext(AuthContext);

  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false;
    return failureCount < 3;
  };

  // Published services
  const {
    data: publishedData,
    isLoading: publishedIsLoading,
    fetchNextPage: fetchNextPublishedPage,
    hasNextPage: hasNextPublishedPage,
    isFetchingNextPage: isFetchingNextPublishedPage,
  } = useInfiniteQuery(
    getUserMissionsInfiniteQueryOptions(
      currentUser?.id,
      'published',
      PAGINATION_LIMIT.MISSIONS,
      {
        retry: retryOption,
        enabled: !!currentUser?.id && !currentUser?.isAdmin,
      },
    ),
  );
  const publishedMissions =
    publishedData?.pages.flatMap((page) => page.missions) || [];

  // Observer for infinite scroll
  const { ref: loadMorePublishedRef, inView: publishedInView } = useInView({
    // RootMargin begins load 100px before user's reaches the top, so the load is smooth
    rootMargin: '0px 200px 0px 0px',
  });

  // When observer is in view, is shot
  useEffect(() => {
    if (publishedInView && hasNextPublishedPage) {
      fetchNextPublishedPage();
    }
  }, [publishedInView, hasNextPublishedPage, fetchNextPublishedPage]);

  // Joined services
  const {
    data: joinedData,
    isLoading: joinedIsLoading,
    fetchNextPage: fetchNextJoinedPage,
    hasNextPage: hasNextJoinedPage,
    isFetchingNextPage: isFetchingNextJoinedPage,
  } = useInfiniteQuery(
    getUserMissionsInfiniteQueryOptions(
      currentUser?.id,
      'joined',
      PAGINATION_LIMIT.MISSIONS,
      {
        retry: retryOption,
        enabled: !!currentUser?.id && !currentUser?.isAdmin,
      },
    ),
  );
  const joinedMissions =
    joinedData?.pages.flatMap((page) => page.missions) || [];

  // Observer for infinite scroll
  const { ref: loadMoreJoinedRef, inView: joinedInView } = useInView({
    // RootMargin begins load 100px before user's reaches the top, so the load is smooth
    rootMargin: '0px 200px 0px 0px',
  });

  // When observer is in view, is shot
  useEffect(() => {
    if (joinedInView && hasNextJoinedPage) {
      fetchNextJoinedPage();
    }
  }, [joinedInView, hasNextJoinedPage, fetchNextJoinedPage]);

  // Services of interest
  const {
    data: interestData,
    hasNextPage: interestHasNextPage,
    isFetchingNextPage: interestIsFetchingNextPage,
    fetchNextPage: interestFetchNextPage,
    isLoading: interestIsLoading,
    isError: interestIsError,
  } = useInfiniteQuery(
    getAllMissionsInfiniteQueryOptions(PAGINATION_LIMIT.MISSIONS, {
      retry: retryOption,
    }),
  );
  const interestMissions =
    interestData?.pages.flatMap((page) => page.missions) || [];

  // Guests page
  if (!currentUser) {
    return (
      <main className='container mx-auto max-w-6xl space-y-16 p-4 sm:p-6 mb-12 overflow-hidden'>
        <section className='text-center space-y-6 pt-12 pb-8 sm:pt-20 sm:pb-12'>
          <h1 className='text-5xl font-extrabold tracking-tight sm:text-7xl'>
            Turn your daily tasks into rewarding services
          </h1>
          <p className='text-xl text-muted-foreground max-w-2xl mx-auto'>
            Hermyx connects people who need a hand with collaborators ready to
            earn rewards. Post a service, gather your team, and get things done
            securely.
          </p>
          <div className='flex flex-col sm:flex-row justify-center gap-4 pt-4'>
            <Button asChild size='lg' className='text-lg px-8 h-14'>
              <Link to='/signup'>Start your adventure</Link>
            </Button>
            <Button
              asChild
              variant='outline'
              size='lg'
              className='text-lg px-8 h-14'
            >
              <a href='#missions'>Explore services</a>
            </Button>
          </div>
        </section>

        <section className='grid grid-cols-1 md:grid-cols-3 gap-8 py-8'>
          <div className='flex flex-col items-center text-center p-6 rounded-2xl bg-muted/20 border'>
            <div className='h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary'>
              <Map className='h-7 w-7' aria-hidden='true' />
            </div>
            <h2 className='text-xl font-bold mb-2'>1. Post a service</h2>
            <p className='text-muted-foreground'>
              Define the task, set the reward, and publish it to board.
            </p>
          </div>
          <div className='flex flex-col items-center text-center p-6 rounded-2xl bg-muted/20 border'>
            <div className='h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary'>
              <Users className='h-7 w-7' aria-hidden='true' />
            </div>
            <h2 className='text-xl font-bold mb-2'>2. Choose collaborators</h2>
            <p className='text-muted-foreground'>
              Review applications and pick the best collaborators for your team.
            </p>
          </div>
          <div className='flex flex-col items-center text-center p-6 rounded-2xl bg-muted/20 border'>
            <div className='h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary'>
              <ShieldCheck className='h-7 w-7' aria-hidden='true' />
            </div>
            <h2 className='text-xl font-bold mb-2'>3. Use test payments</h2>
            <p className='text-muted-foreground'>
              The prototype uses Stripe in test mode to demonstrate the payment
              flow. No real payment or escrow service is provided.
            </p>
          </div>
        </section>

        <section id='missions' className='scroll-mt-8 space-y-6 pt-8'>
          <div className='flex flex-col sm:flex-row justify-between items-end gap-4'>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>
                Guild Board Sneak Peek
              </h2>
              <p className='mt-1 text-muted-foreground'>
                Check out some of the latest services posted by our community.
              </p>
            </div>
            <Button asChild variant='ghost' className='hidden sm:flex'>
              <Link to='/signup'>See all services →</Link>
            </Button>
          </div>

          {interestIsLoading ? (
            <p className='text-muted-foreground'>Loading the guild board...</p>
          ) : interestMissions.length === 0 ? (
            <div className='rounded-xl border border-dashed bg-muted/10 p-8 text-center text-muted-foreground'>
              The board is quiet today. Be the first to post a service!
            </div>
          ) : (
            <Carousel opts={{ align: 'start' }} className='w-full'>
              <CarouselContent className='-ml-4 py-4'>
                {interestMissions.slice(0, 6).map((mission, index) => (
                  <CarouselItem
                    key={mission.mid}
                    className='pl-4 basis-full sm:basis-1/2 lg:basis-1/3'
                  >
                    <MissionSearchCard
                      mission={mission}
                      priority={index === 0}
                      asListItem={false}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className='hidden sm:block'>
                <CarouselPrevious className='-left-4 lg:-left-6' />
                <CarouselNext className='-right-4 lg:-right-6' />
              </div>
            </Carousel>
          )}

          <div className='sm:hidden pt-4'>
            <Button asChild variant='outline' className='w-full'>
              <Link to='/signup'>See all services</Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  // Admin page
  if (currentUser?.isAdmin) {
    return (
      <main className='container mx-auto max-w-6xl space-y-12 p-4 sm:p-6 mb-12 overflow-hidden'>
        <section className='flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8'>
          <div className='flex flex-col sm:flex-row items-center gap-5'>
            <div className='h-16 w-16 shrink-0 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 text-primary'>
              <ShieldCheck className='h-8 w-8' aria-hidden='true' />
            </div>
            <div className='min-w-0 text-center sm:text-left'>
              <h1 className='wrap-break-words text-3xl font-bold tracking-tight sm:text-4xl'>
                Admin Dashboard
              </h1>
              <p className='ms-1 text-muted-foreground'>
                Welcome back, {currentUser?.username}.
              </p>
            </div>
          </div>
          <div className='flex w-full shrink-0 flex-col gap-3 sm:w-auto'>
            <Button asChild size='lg' className='w-full sm:w-auto truncate'>
              <Link to='/reports'>
                <MessageSquareWarning
                  className='mr-2 h-5 w-5 truncate'
                  aria-hidden='true'
                />
                Manage platform reports
              </Link>
            </Button>
          </div>
        </section>

        <Separator />

        <section className='space-y-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              All Platform Services
            </h2>
            <p className='mt-1 text-muted-foreground'>
              Browse and moderate all active services on Hermyx.
            </p>
          </div>

          <MissionSearchContainer
            missions={interestMissions}
            hasNextPage={interestHasNextPage}
            isFetchingNextPage={interestIsFetchingNextPage}
            fetchNextPage={interestFetchNextPage}
            isLoading={interestIsLoading}
            isError={interestIsError}
            noMissionsMessage='There are no services available right now.'
            sectionClassName=''
            infiniteScroll={true}
          />
        </section>
      </main>
    );
  }

  // Logged page
  return (
    <>
      <title>{`Hermyx | The ultimate board to manage services securely and connect with the community.`}</title>
      <meta
        name='description'
        content={`Hermyx, an academic prototype for managing services and connecting users through a test payment flow.`}
      ></meta>
      <main className='container mx-auto max-w-6xl space-y-12 p-4 sm:p-6 mb-12 overflow-hidden'>
        <section className='flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8'>
          <div className='flex flex-col sm:flex-row items-center gap-5'>
            <Avatar className='h-16 w-16 shrink-0 border-2 border-primary/10'>
              <AvatarImage src={getImageUrl(currentUser?.avatar)} alt='' />
              <AvatarFallback className='bg-primary/5 text-xl text-primary'>
                {getInitials(getDisplayName(currentUser)) || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className='min-w-0 text-center sm:text-left'>
              <h1 className='wrap-break-words text-3xl font-bold tracking-tight sm:text-4xl'>
                Welcome back, {currentUser?.username || 'Collaborator'}!
              </h1>
              <p className='ms-1 text-muted-foreground'>
                Ready for your next great adventure?
              </p>
            </div>
          </div>
          <div className='flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row'>
            <Button asChild className='w-full sm:w-auto truncate'>
              <Link to='/services/new'>
                <Plus className='mr-2 h-4 w-4 truncate' aria-hidden='true' />
                Post a service
              </Link>
            </Button>
            <Button
              asChild
              variant='outline'
              className='w-full sm:w-auto truncate'
            >
              <a href='#quest-board'>
                <Compass className='mr-2 h-4 w-4 truncate' aria-hidden='true' />
                Find services
              </a>
            </Button>
          </div>
        </section>

        <section className='space-y-10'>
          <div className='relative'>
            <h2 className='text-2xl font-bold tracking-tight'>
              Your joined services
            </h2>
            {joinedIsLoading ? (
              <p className='text-muted-foreground'>
                Loading your joined services...
              </p>
            ) : joinedMissions.length === 0 ? (
              <div className='rounded-xl border border-dashed bg-muted/10 p-8 mt-4 text-center text-muted-foreground'>
                You haven&lsquo;t joined any active services yet. Check out the
                services of interest below!
              </div>
            ) : (
              <Carousel opts={{ align: 'start' }} className='w-full'>
                <CarouselContent className='-ml-4 py-4'>
                  {joinedMissions.map((mission, index) => (
                    <CarouselItem
                      key={mission.mid}
                      className='pl-4 basis-full sm:basis-1/2 lg:basis-1/3'
                    >
                      <MissionSearchCard
                        mission={mission}
                        priority={index === 0}
                        asListItem={false}
                      />
                    </CarouselItem>
                  ))}
                  {hasNextJoinedPage && (
                    <CarouselItem
                      ref={isFetchingNextJoinedPage ? null : loadMoreJoinedRef}
                      className='pl-4 basis-full sm:basis-1/2 lg:basis-1/3 flex items-center justify-center min-h-75'
                    >
                      {isFetchingNextJoinedPage && (
                        <span className='text-sm text-muted-foreground animate-pulse'>
                          Loading services...
                        </span>
                      )}
                    </CarouselItem>
                  )}
                </CarouselContent>

                <div className='hidden sm:block'>
                  <CarouselPrevious className='-left-4 lg:-left-6' />
                  <CarouselNext className='-right-4 lg:-right-6' />
                </div>
              </Carousel>
            )}
          </div>

          <div className='relative'>
            <h2 className='text-2xl font-bold tracking-tight'>
              Your published services
            </h2>
            {publishedIsLoading ? (
              <p className='text-muted-foreground'>
                Loading your published services...
              </p>
            ) : publishedMissions.length === 0 ? (
              <div className='rounded-xl border border-dashed mt-4 bg-muted/10 p-8 text-center text-muted-foreground'>
                You don&lsquo;t have any published services. Need help? Post a
                new one!
              </div>
            ) : (
              <Carousel opts={{ align: 'start' }} className='w-full'>
                <CarouselContent className='-ml-4 py-4'>
                  {publishedMissions.map((mission, index) => (
                    <CarouselItem
                      key={mission.mid}
                      className='pl-4 basis-full sm:basis-1/2 lg:basis-1/3'
                    >
                      <MissionSearchCard
                        mission={mission}
                        priority={index === 0}
                        asListItem={false}
                      />
                    </CarouselItem>
                  ))}
                  {hasNextPublishedPage && (
                    <CarouselItem
                      ref={
                        isFetchingNextPublishedPage
                          ? null
                          : loadMorePublishedRef
                      }
                      className='pl-4 basis-full sm:basis-1/2 lg:basis-1/3 flex items-center justify-center min-h-75'
                    >
                      {isFetchingNextPublishedPage && (
                        <span className='text-sm text-muted-foreground animate-pulse'>
                          Loading services...
                        </span>
                      )}
                    </CarouselItem>
                  )}
                </CarouselContent>
                <div className='hidden sm:block'>
                  <CarouselPrevious className='-left-4 lg:-left-6' />
                  <CarouselNext className='-right-4 lg:-right-6' />
                </div>
              </Carousel>
            )}
          </div>
        </section>

        <Separator />

        <section id='quest-board' className='scroll-mt-8 space-y-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Services of interest
            </h2>
            <p className='mt-1 text-muted-foreground'>
              Discover new services available right now.
            </p>
          </div>

          <MissionSearchContainer
            missions={interestMissions}
            hasNextPage={interestHasNextPage}
            isFetchingNextPage={interestIsFetchingNextPage}
            fetchNextPage={interestFetchNextPage}
            isLoading={interestIsLoading}
            isError={interestIsError}
            noMissionsMessage='There are no services available right now. Be the first to post one!'
            sectionClassName=''
            infiniteScroll={true}
          />
        </section>
      </main>
    </>
  );
};
