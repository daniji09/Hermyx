import { useActionState, useContext, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, MessageSquareWarning, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { initialStateUseStateAction, PAGINATION_LIMIT } from '../consts/consts';
import { AuthContext } from '../contexts/AuthContext';
import { getImageUrl } from '../utils/media';
import { getDisplayName, getInitials } from '../utils/avatar';
import {
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
import { consts, USER_ROLE } from '@hermyx/shared';
import { FormAlert } from '../components/custom/form/FormAlert.jsx';
import { getUserReviewsInfiniteQueryOptions } from '../queries/ReviewsQueries';
import { getOrCreatePrivateConversation } from '../services/ConversationsServices';
import { ReviewCard } from './MyProfile.jsx';
import { UserMissionsTable } from './UserServices.jsx';
import { NotFound } from './NotFound.jsx';
import { useInView } from 'react-intersection-observer';

export const PublicProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useContext(AuthContext);
  const [filter, setFilter] = useState('published');
  const [messageError, setMessageError] = useState('');
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
  console.log(profileData);
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

  const {
    data: reviewsPagesData,
    hasNextPage: hasNextReviewsPage,
    isFetchingNextPage: isFetchingNextReviewsPage,
    fetchNextPage: fetchNextReviewsPage,
    isLoading: isReviewsLoading,
  } = useInfiniteQuery(
    getUserReviewsInfiniteQueryOptions(user?.uid, PAGINATION_LIMIT.REVIEWS, {
      retry: retryOption,
      enabled: !!user?.uid && !isOwnProfile && !!profileData?.missionsVisible,
    }),
  );

  // Observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    // RootMargin begins load 100px before user's reaches the top, so the load is smooth
    rootMargin: '0px 0px 100px 0px',
  });

  // When observer is in view, is shot
  useEffect(() => {
    if (inView && hasNextReviewsPage) {
      fetchNextReviewsPage();
    }
  }, [inView, hasNextReviewsPage, fetchNextReviewsPage]);

  const missionsVisible = profileData?.missionsVisible;
  const missions = missionsData?.pages.flatMap((page) => page.missions) || [];
  const reviewsData = getReviewsDataFromPages(reviewsPagesData?.pages);
  const { mutate: openConversation, isPending: isOpeningConversation } =
    useMutation({
      mutationFn: () => getOrCreatePrivateConversation(user.uid),
      onSuccess: (conversation) => {
        setMessageError('');
        navigate(`/conversations/${conversation.cid}`, {
          state: {
            from: `/users/${user.username}`,
          },
        });
      },
      onError: (error) => {
        setMessageError(
          error?.response?.data?.errors?.general?.[0] ||
            'Could not open conversation.',
        );
      },
    });

  if (isOwnProfile) {
    return (
      <Navigate to={currentUser?.isAdmin ? '/reports' : '/profile'} replace />
    );
  }

  if (isProfileLoading) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div role='status' className='p-8 text-center text-muted-foreground'>
          Loading profile...
        </div>
      </main>
    );
  }

  if (isProfileError || !user) {
    return <NotFound></NotFound>;
  }

  const displayName = [user.name, user.surnames].filter(Boolean).join(' ');

  return (
    <>
      <title>{`${user?.username} profile | Hermyx`}</title>
      <meta
        name='description'
        content={`${user?.username}'s public Hermyx profile.`}
      ></meta>
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <section className='mb-8 gap-6 border-b pb-8 flex-row items-center'>
          <div className='flex flex-col gap-6 pb-8 sm:flex-row sm:items-center'>
            <div className='flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted'>
              {user.avatar ? (
                <img
                  src={getImageUrl(user.avatar)}
                  alt=''
                  className='h-full w-full object-cover'
                />
              ) : (
                <span className='text-4xl font-semibold text-muted-foreground'>
                  {getInitials(getDisplayName(user))}
                </span>
              )}
            </div>

            <div className='min-w-0 flex-1'>
              <h1 className='wrap-break-words wrap-anywhere text-3xl font-bold tracking-tight sm:text-4xl'>
                {displayName || user.username}
              </h1>

              <p className='wrap-break-words wrap-anywhere mt-1 text-lg text-muted-foreground'>
                @{user.username}
              </p>

              <div className='mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
                <span className='inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-600'>
                  <Star className='h-4 w-4 fill-amber-400 text-amber-400 dark:fill-amber-500 dark:text-amber-500' />
                  {`${Number(reviewsData?.averageRating || 0).toFixed(1)}/5`}
                </span>
                <span>
                  from {reviewsData?.totalReviews || 0}{' '}
                  {(reviewsData?.totalReviews || 0) === 1
                    ? 'review'
                    : 'reviews'}
                </span>
              </div>

              {messageError && (
                <p className='mt-2 text-sm text-destructive'>{messageError}</p>
              )}
              {!currentUser?.isAdmin && (
                <div className='mt-5 flex flex-col gap-2 sm:grid w-full sm:grid-cols-2 sm:gap-4'>
                  <Button
                    type='button'
                    className='w-full'
                    onClick={() => {
                      setMessageError('');
                      openConversation();
                    }}
                    disabled={isOpeningConversation}
                  >
                    <MessageCircle
                      className='h-4 w-4 mr-1 shrink-0'
                      aria-hidden='true'
                    />
                    <span className='truncate'>
                      {isOpeningConversation ? 'Opening...' : 'Message'}
                    </span>
                  </Button>
                  <ReportUserButton user={user}></ReportUserButton>
                </div>
              )}
            </div>
          </div>
          <div>
            {user.description && (
              <p className='wrap-break-words wrap-anywhere text-sm leading-6 sm:text-base'>
                {user.description}
              </p>
            )}
          </div>
        </section>

        {user.role === USER_ROLE.ADMIN.ID ? (
          ``
        ) : !missionsVisible ? (
          <section className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
            This user keeps their service history private.
          </section>
        ) : (
          <UserMissionsTable
            missions={missions}
            filter={filter}
            setFilter={setFilter}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
            isLoading={isMissionsLoading}
            isError={isMissionsError}
            publishedMissionsMessage="It seems this user hasn't published any services yet."
            joinedMissionsMessage="It seems this user hasn't joined any services yet."
            sectionClassName={''}
            infiniteScroll={false}
          ></UserMissionsTable>
        )}
        {user.role !== USER_ROLE.ADMIN.ID && (
          <CollaboratorReviewsSection
            reviewsData={reviewsData}
            isLoading={isReviewsLoading}
            hasNextPage={hasNextReviewsPage}
            isFetchingNextPage={isFetchingNextReviewsPage}
            fetchNextPage={fetchNextReviewsPage}
            loadMoreRef={loadMoreRef}
          />
        )}
      </main>
    </>
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

const CollaboratorReviewsSection = ({
  reviewsData,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  loadMoreRef,
}) => {
  const reviews = reviewsData?.reviews || [];

  return (
    <section className='mt-10 border-t pt-5'>
      <div className='mb-5 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
        <h2 className='text-2xl font-bold tracking-tight'>Reviews</h2>
        {!isLoading && (
          <p className='text-sm text-muted-foreground'>
            {Number(reviewsData?.averageRating || 0).toFixed(1)}/5 from{' '}
            {reviewsData?.totalReviews || 0} reviews
          </p>
        )}
      </div>

      {isLoading ? (
        <p className='text-muted-foreground'>Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className='rounded-lg border border-dashed p-6 text-center text-muted-foreground'>
          This collaborator has no reviews yet.
        </p>
      ) : (
        <>
          <div className='grid gap-4'>
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isClamped={false}
              ></ReviewCard>
            ))}
          </div>

          {hasNextPage && (
            <div
              ref={isFetchingNextPage ? null : loadMoreRef}
              className='flex justify-center py-4 h-12 w-full'
            >
              {isFetchingNextPage && (
                <span className='text-xs text-muted-foreground animate-pulse'>
                  Loading reviews...
                </span>
              )}
            </div>
          )}
          {!hasNextPage && (
            <div className='text-center text-xs text-muted-foreground pt-6'>
              No more reviews found.
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
          className='
           w-full'
        >
          <MessageSquareWarning
            className='w-4 h-4 mr-1 shrink-0'
            aria-hidden='true'
          />
          <span className='truncate'>{'Report user'}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-sm max-h-[80vh] overflow-y-auto'>
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
                id='reportUserMessage'
                name='message'
                label='Message (required):'
                type='text'
                maxLength={consts.SERVICE.REPORT_MESSAGE.MAX}
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
