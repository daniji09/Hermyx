import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  getAllMissionsInfiniteQueryOptions,
  getUserMissionsInfiniteQueryOptions,
} from '../queries/MissionsQueries';
import { PAGINATION_LIMIT } from '../consts/consts';
import {
  MissionSearchContainer,
  MissionSearchCard,
} from '../components/custom/missions/MissionSearchContainer';
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
import { Compass, Plus, Map, Users, ShieldCheck } from 'lucide-react';

export const Home = () => {
  const { currentUser } = useContext(AuthContext);

  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false;
    return failureCount < 3;
  };

  // Published missions
  const { data: publishedData, isLoading: publishedIsLoading } =
    useInfiniteQuery(
      getUserMissionsInfiniteQueryOptions(
        currentUser?.id,
        'published',
        PAGINATION_LIMIT.MISSIONS,
        {
          retry: retryOption,
          enabled: !!currentUser?.id,
        },
      ),
    );
  const publishedMissions =
    publishedData?.pages.flatMap((page) => page.missions) || [];

  // Joined missions
  const { data: joinedData, isLoading: joinedIsLoading } = useInfiniteQuery(
    getUserMissionsInfiniteQueryOptions(
      currentUser?.id,
      'joined',
      PAGINATION_LIMIT.MISSIONS,
      {
        retry: retryOption,
        enabled: !!currentUser?.id,
      },
    ),
  );
  const joinedMissions =
    joinedData?.pages.flatMap((page) => page.missions) || [];

  // Interest missions
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
            Hermyx connects people who need a hand with adventurers ready to
            earn rewards. Post a mission, gather your party, and get things done
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
              <a href='#missions'>Explore missions</a>
            </Button>
          </div>
        </section>

        <section className='grid grid-cols-1 md:grid-cols-3 gap-8 py-8'>
          <div className='flex flex-col items-center text-center p-6 rounded-2xl bg-muted/20 border'>
            <div className='h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary'>
              <Map className='h-7 w-7' />
            </div>
            <h3 className='text-xl font-bold mb-2'>1. Post a mission</h3>
            <p className='text-muted-foreground'>
              Define the task, set the reward, and publish it to board.
            </p>
          </div>
          <div className='flex flex-col items-center text-center p-6 rounded-2xl bg-muted/20 border'>
            <div className='h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary'>
              <Users className='h-7 w-7' />
            </div>
            <h3 className='text-xl font-bold mb-2'>2. Choose adventurers</h3>
            <p className='text-muted-foreground'>
              Review applications and pick the best adventurers for your party.
            </p>
          </div>
          <div className='flex flex-col items-center text-center p-6 rounded-2xl bg-muted/20 border'>
            <div className='h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary'>
              <ShieldCheck className='h-7 w-7' />
            </div>
            <h3 className='text-xl font-bold mb-2'>3. Pay securely</h3>
            <p className='text-muted-foreground'>
              Payments are safely held in escrow via Stripe until the mission is
              completed.
            </p>
          </div>
        </section>

        <section id='missions' className='scroll-mt-8 space-y-6 pt-8'>
          <div className='flex flex-col sm:flex-row justify-between items-end gap-4'>
            <div>
              <h2 className='text-3xl font-bold tracking-tight'>
                Guild Board Sneak Peek
              </h2>
              <p className='mt-1 text-muted-foreground'>
                Check out some of the latest missions posted by our community.
              </p>
            </div>
            <Button asChild variant='ghost' className='hidden sm:flex'>
              <Link to='/signup'>See all missions →</Link>
            </Button>
          </div>

          {interestIsLoading ? (
            <p className='text-muted-foreground'>Loading the guild board...</p>
          ) : interestMissions.length === 0 ? (
            <div className='rounded-xl border border-dashed bg-muted/10 p-8 text-center text-muted-foreground'>
              The board is quiet today. Be the first to post a mission!
            </div>
          ) : (
            <Carousel opts={{ align: 'start' }} className='w-full'>
              <CarouselContent className='-ml-4 py-4'>
                {interestMissions.slice(0, 6).map((mission) => (
                  <CarouselItem
                    key={mission.mid}
                    className='pl-4 basis-full sm:basis-1/2 lg:basis-1/3'
                  >
                    <MissionSearchCard mission={mission} />
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
              <Link to='/signup'>See all missions</Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  // Logged page
  return (
    <main className='container mx-auto max-w-6xl space-y-12 p-4 sm:p-6 mb-12 overflow-hidden'>
      <section className='flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8'>
        <div className='flex flex-col sm:flex-row items-center gap-5'>
          <Avatar className='h-16 w-16 shrink-0 border-2 border-primary/10'>
            <AvatarImage src={getImageUrl(currentUser?.avatar)} alt='' />
            <AvatarFallback className='bg-primary/5 text-xl text-primary'>
              {currentUser?.username?.charAt(0).toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0 text-center sm:text-left'>
            <h1 className='wrap-break-words text-2xl font-bold tracking-tight sm:text-3xl'>
              Welcome back, {currentUser?.username || 'Adventurer'}!
            </h1>
            <p className='mt-1 text-muted-foreground'>
              Ready for your next great adventure?
            </p>
          </div>
        </div>
        <div className='flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row'>
          <Button asChild className='w-full sm:w-auto truncate'>
            <Link to='/missions/new'>
              <Plus className='mr-2 h-4 w-4 truncate' aria-hidden='true' />
              Post a mission
            </Link>
          </Button>
          <Button
            asChild
            variant='outline'
            className='w-full sm:w-auto truncate'
          >
            <a href='#quest-board'>
              <Compass className='mr-2 h-4 w-4 truncate' aria-hidden='true' />
              Find missions
            </a>
          </Button>
        </div>
      </section>

      <section className='space-y-10'>
        <div className='space-y-4 relative'>
          <h2 className='text-2xl font-bold tracking-tight'>
            Your joined missions
          </h2>
          {joinedIsLoading ? (
            <p className='text-muted-foreground'>
              Loading your joined missions...
            </p>
          ) : joinedMissions.length === 0 ? (
            <div className='rounded-xl border border-dashed bg-muted/10 p-8 text-center text-muted-foreground'>
              You haven&lsquo;t joined any active missions yet. Check out the
              missions of interest below!
            </div>
          ) : (
            <Carousel opts={{ align: 'start' }} className='w-full'>
              <CarouselContent className='-ml-4 py-4'>
                {joinedMissions.map((mission) => (
                  <CarouselItem
                    key={mission.mid}
                    className='pl-4 basis-full sm:basis-1/2 lg:basis-1/3'
                  >
                    <MissionSearchCard mission={mission} />
                  </CarouselItem>
                ))}
              </CarouselContent>

              <div className='hidden sm:block'>
                <CarouselPrevious className='-left-4 lg:-left-6' />
                <CarouselNext className='-right-4 lg:-right-6' />
              </div>
            </Carousel>
          )}
        </div>

        <div className='space-y-4 relative'>
          <h2 className='text-2xl font-bold tracking-tight'>
            Your published missions
          </h2>
          {publishedIsLoading ? (
            <p className='text-muted-foreground'>
              Loading your published missions...
            </p>
          ) : publishedMissions.length === 0 ? (
            <div className='rounded-xl border border-dashed bg-muted/10 p-8 text-center text-muted-foreground'>
              You don&lsquo;t have any published missions. Need help? Post a new
              one!
            </div>
          ) : (
            <Carousel opts={{ align: 'start' }} className='w-full'>
              <CarouselContent className='-ml-4 py-4'>
                {publishedMissions.map((mission) => (
                  <CarouselItem
                    key={mission.mid}
                    className='pl-4 basis-full sm:basis-1/2 lg:basis-1/3'
                  >
                    <MissionSearchCard mission={mission} />
                  </CarouselItem>
                ))}
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

      <section id='quest-board' className='scroll-mt-8 space-y-6'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>
            Missions of interest
          </h2>
          <p className='mt-1 text-muted-foreground'>
            Discover new missions available right now.
          </p>
        </div>

        <MissionSearchContainer
          missions={interestMissions}
          hasNextPage={interestHasNextPage}
          isFetchingNextPage={interestIsFetchingNextPage}
          fetchNextPage={interestFetchNextPage}
          isLoading={interestIsLoading}
          isError={interestIsError}
          noMissionsMessage='There are no missions available right now. Be the first to post one!'
          sectionClassName=''
        />
      </section>
    </main>
  );
};
