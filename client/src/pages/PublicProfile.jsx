import { useActionState, useContext, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Navigate, useParams } from 'react-router-dom';
import { MapPin, MessageSquareWarning, Star, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { initialStateUseStateAction, PAGINATION_LIMIT } from '../consts/consts';
import { MissionSearchContainer } from '../components/custom/missions/MissionSearchContainer';
import { AuthContext } from '../contexts/AuthContext';
import {
  getUserReviewsInfiniteQueryOptions,
  getPublicUserProfileMissionsInfiniteQueryOptions,
  getPublicUserProfileQueryOptions,
} from '../queries/UsersQueries';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useAlert } from '../contexts/AlertContext';
import { reportUserAction } from '../actions/ReportActions';
import { messages } from '../messages/messages.js';
import { FormTextareaField } from '../components/custom/form/FormTextareaField.jsx';
import { consts } from '@hermyx/shared';
import { FormAlert } from '../components/custom/form/FormAlert.jsx';

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

  const {
    data: reviewsPagesData,
    hasNextPage: hasNextReviewsPage,
    isFetchingNextPage: isFetchingNextReviewsPage,
    fetchNextPage: fetchNextReviewsPage,
    isLoading: isReviewsLoading,
  } = useInfiniteQuery(
    getUserReviewsInfiniteQueryOptions(username, PAGINATION_LIMIT.REVIEWS, {
      retry: retryOption,
      enabled: !!username && !isOwnProfile && !!profileData?.missionsVisible,
    }),
  );

  const user = profileData?.user;
  const missionsVisible = profileData?.missionsVisible;
  const missions = missionsData?.pages.flatMap((page) => page.missions) || [];
  const reviewsData = getReviewsDataFromPages(reviewsPagesData?.pages);

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
          <h1 className='wrap-break-words text-3xl font-bold tracking-tight sm:text-4xl'>
            {displayName || user.username}
          </h1>

          <p className='mt-1 text-lg text-muted-foreground'>@{user.username}</p>

          <div className='mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
            <span className='inline-flex items-center gap-1 font-medium text-amber-700'>
              <Star className='h-4 w-4 fill-amber-400 text-amber-400' />
              {`${Number(reviewsData?.averageRating || 0).toFixed(1)}/5`}
            </span>
            <span>
              {reviewsData?.totalReviews || 0}{' '}
              {(reviewsData?.totalReviews || 0) === 1 ? 'review' : 'reviews'}
            </span>
            <ReportUserButton user={user}></ReportUserButton>
          </div>

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

      <AdventurerReviewsSection
        reviewsData={reviewsData}
        isLoading={isReviewsLoading}
        isPrivate={!missionsVisible}
        hasNextPage={hasNextReviewsPage}
        isFetchingNextPage={isFetchingNextReviewsPage}
        fetchNextPage={fetchNextReviewsPage}
      />
    </main>
  );
};

const getReviewsDataFromPages = (pages = []) => {
  const firstPage = pages[0];

  return {
    averageRating: firstPage?.averageRating || 0,
    totalReviews: firstPage?.totalReviews || 0,
    reviews: pages.flatMap((page) => page.reviews || []),
  };
};

const AdventurerReviewsSection = ({
  reviewsData,
  isLoading,
  isPrivate,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}) => {
  const reviews = reviewsData?.reviews || [];

  return (
    <section className='mt-10 border-t pt-8'>
      <div className='mb-5 flex items-center justify-between gap-4'>
        <h2 className='text-2xl font-bold tracking-tight'>Reviews</h2>
        {!isLoading && (
          <p className='text-sm text-muted-foreground'>
            {Number(reviewsData?.averageRating || 0).toFixed(1)}/5 from{' '}
            {reviewsData?.totalReviews || 0}
          </p>
        )}
      </div>

      {isPrivate ? (
        <p className='rounded-lg border border-dashed p-6 text-center text-muted-foreground'>
          This user keeps their mission history and reviews private.
        </p>
      ) : isLoading ? (
        <p className='text-muted-foreground'>Loading reviews</p>
      ) : reviews.length === 0 ? (
        <p className='rounded-lg border border-dashed p-6 text-center text-muted-foreground'>
          This adventurer has no reviews yet.
        </p>
      ) : (
        <>
          <div className='grid gap-4'>
            {reviews.map((review) => (
              <article
                key={review.id}
                className='rounded-lg border bg-card p-4 shadow-sm'
              >
                <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
                  <span className='inline-flex items-center gap-1 font-semibold text-amber-700'>
                    <Star className='h-4 w-4 fill-amber-400 text-amber-400' />
                    {Number(review.rating).toFixed(1)}/5
                  </span>
                  <span className='text-sm text-muted-foreground'>
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>

                {review.comment && (
                  <p className='whitespace-pre-line text-sm leading-6'>
                    {review.comment}
                  </p>
                )}

                <p className='mt-3 text-xs text-muted-foreground'>
                  {review.owner_username} on {review.mission_title}
                </p>
              </article>
            ))}
          </div>

          {hasNextPage && (
            <div className='mt-6 flex justify-center'>
              <Button
                type='button'
                variant='outline'
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading reviews' : 'Load more reviews'}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

const ReportUserButton = ({ user }) => {
  // Action handling for update email form
  const [state, reportUserFormAction, isPending] = useActionState(
    reportUserAction,
    initialStateUseStateAction,
  );

  // Logic for cleaning errors in fields or alerts when modifications are done
  const [clearedFields, setClearedFields] = useState({});
  const [prevServerState, setPrevServerState] = useState(state);
  const [isAlertClosed, setIsAlertClosed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const processedState = useRef(null);
  const { showAlert } = useAlert();

  // If the state has changed, field errors should be cleared
  if (state !== prevServerState) {
    setPrevServerState(state);
    setClearedFields({});
    setIsAlertClosed(false);
    if (state.success) {
      setIsOpen(false);
    }
  }

  // When user changes field's value, the error is not shown until the form is sent again
  const handleFieldChange = (e) => {
    const fieldName = e.target.name;
    setClearedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  // Effect for success handling
  useEffect(() => {
    if (state.success && processedState.current !== state) {
      processedState.current = state;
      showAlert({
        title: messages.REPORT.SUCCESS_ALERT.TITLE,
        description: messages.REPORT.SUCCESS_ALERT.DESCRIPTION,
      });
    }
  }, [state, showAlert]);

  // Handle manual dialog close to reset visual errors
  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) {
      setIsAlertClosed(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          id='reportUserButton'
          variant='destructive'
          type='button'
          disabled={isPending}
          className='me-2'
        >
          <MessageSquareWarning className='w-4 h-4 mr-2' aria-hidden='true' />
          {'Report user'}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>
            {messages.PUBLIC_PROFILE.REPORT_USER_DIALOG.TITLE}
          </DialogTitle>
          <DialogDescription>
            {messages.PUBLIC_PROFILE.REPORT_USER_DIALOG.DESCRIPTION}
          </DialogDescription>
        </DialogHeader>
        <form action={reportUserFormAction} id='reportUserForm' noValidate>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <FormTextareaField
                id='reportVacancyMessage'
                name='message'
                label='Message (required):'
                type='text'
                maxLength={consts.MISSION.REPORT_MESSAGE.MAX}
                defaultValue={state.data?.message || ''}
                error={
                  !clearedFields.message && state.errors?.message
                    ? state.errors.message[0]
                    : undefined
                }
                invalid={!clearedFields.message && !!state.errors?.message}
                aria-invalid={!clearedFields.message && !!state.errors?.message}
                required
                autoComplete='off'
                disabled={isPending}
                onChange={handleFieldChange}
              />
            </div>
            <input type='hidden' id='uid' name='uid' value={user.uid || ''} />
            {state.errors?.general && !isAlertClosed && (
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {state.errors.general[0]}
              </FormAlert>
            )}
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' type='button'>
              Cancel
            </Button>
          </DialogClose>
          <Button type='submit' disabled={isPending} form='reportUserForm'>
            {isPending ? 'Reporting...' : 'Report user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
