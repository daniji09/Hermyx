import {
  useMutation,
  useQueryClient,
  useQuery,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getMissionByIdQueryOptions,
  inviteToMissionMutationOptions,
} from './../queries/ServicesQueries';
import { searchUsersByUsernameInfiniteQueryOptions } from '../queries/UsersQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  formatParticipationReviewDeadlineTimeRemaining,
  timestampToDayMonthYear,
} from './../utils/date';
import {
  Users,
  HandCoins,
  Search,
  Star,
  User,
  UserPlus,
  MessageCircle,
  MessageSquareWarning,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthContext } from '../contexts/AuthContext';
import {
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  joinMission,
  submitMissionParticipation,
  unjoinMission,
  cancelMission,
  reopenMission,
  closeMission,
  finishMission,
} from '../services/ServiceServices';
import { reviewAdventurer, reviewOwner } from '../services/ReviewsServices';
import { messages } from '../messages/messages';
import { useAlert } from '../contexts/AlertContext';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  consts,
  messages as messagesShared,
  MISSION_STATUS,
  MISSION_PARTICIPATION_STATUS,
} from '@hermyx/shared';
import { Map } from '../components/custom/Map';
import {
  reportAdventurerAction,
  reportMissionAction,
} from '../actions/ReportActions';
import {
  initialStateUseStateAction,
  PAGINATION_LIMIT,
} from './../consts/consts';
import { FormTextareaField } from '../components/custom/form/FormTextareaField';
import { FormAlert } from '../components/custom/form/FormAlert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getImageUrl } from '../utils/media';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { MoreVertical } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getDisplayName, getInitials } from '../utils/avatar';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { NotFound } from './NotFound';
import { useInView } from 'react-intersection-observer';

export const Mission = () => {
  // Service id
  const { id } = useParams();
  const { currentUser } = useContext(AuthContext);

  // Query options
  const enabledOption = !!id;
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false; // So Axios won't try to search again the data if there is none
    return failureCount < 3;
  };

  const {
    data: mission,
    isLoading,
    isError,
    error,
  } = useQuery(
    getMissionByIdQueryOptions(id, {
      enabled: enabledOption,
      retry: retryOption,
    }),
  );

  let errorMessage = error?.message;
  if (error?.response?.status === 404) {
    errorMessage = 'Oops! This service does not exist or it has been deleted.';
  }
  return (
    <MissionPageContainer
      mission={mission}
      currentUser={currentUser}
      isLoading={isLoading}
      isError={isError}
      error={errorMessage}
      errorStatus={error?.response?.status}
    ></MissionPageContainer>
  );
};

const MissionPageContainer = ({
  mission,
  currentUser,
  isLoading,
  isError,
  errorStatus,
}) => {
  const isCreator =
    !currentUser?.isAdmin && currentUser?.id === mission?.owner_id;
  const isFull = mission?.total_vacancies === mission?.occupied_vacancies;
  return (
    <main className='container mx-auto max-w-6xl p-4 sm:p-6'>
      <MissionLoading isLoading={isLoading}>
        {'Loading service...'}
      </MissionLoading>

      {!isLoading && (
        <MissionError
          isError={isError}
          mission={mission}
          errorStatus={errorStatus}
        ></MissionError>
      )}

      {!isLoading && mission && (
        <MissionContent
          mission={mission}
          isCreator={isCreator}
          isFull={isFull}
          currentUser={currentUser}
        ></MissionContent>
      )}
    </main>
  );
};

const MissionLoading = ({ isLoading, children }) => {
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

const MissionError = ({ isError, mission, errorStatus }) => {
  if (isError && !mission && errorStatus !== 404) {
    return (
      <div
        role='alert'
        className='rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive'
      >
        Could not load service.
      </div>
    );
  }

  if (!mission) return <NotFound />;
};

const ParticipationReviewCountdown = ({ deadline, className }) => {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (!deadline) return null;

  return (
    <p
      className={cn(
        'flex items-start gap-1.5 text-secondary-foreground',
        className,
      )}
    >
      <Clock className='mt-0.5 h-3.5 w-3.5 shrink-0' aria-hidden='true' />
      {formatParticipationReviewDeadlineTimeRemaining(deadline, currentTime)}
    </p>
  );
};

const MissionContent = ({ mission, isCreator, isFull, currentUser }) => {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const currentParticipation = mission?.participants?.find(
    (participant) => participant.adventurer_id === currentUser?.id,
  );

  const isParticipant = !!currentParticipation;
  const canAccessMissionChat =
    (isCreator || isParticipant) &&
    currentParticipation?.status !== MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID;

  return (
    <>
      <title>{`${mission?.title} | Hermyx`}</title>
      <meta
        name='description'
        content={`Service ${mission?.title} information and actions.`}
      ></meta>
      <div className='mx-auto max-w-7xl animate-in fade-in duration-500 pb-16 space-y-8 mt-4'>
        <div className='flex justify-between items-start gap-4'>
          <h1 className='text-3xl sm:text-4xl font-bold tracking-tight wrap-break-words wrap-anywhere'>
            {mission?.title}
          </h1>
          {!currentUser?.isAdmin &&
            mission?.status !== MISSION_STATUS.CANCELLED.ID &&
            mission?.status !== MISSION_STATUS.DELETED.ID && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='outline'
                    size='icon'
                    aria-label='Open service options'
                    className='shrink-0 rounded-full h-10 w-10'
                  >
                    <MoreVertical className='h-5 w-5 text-muted-foreground' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-56'>
                  {isCreator && MISSION_STATUS[mission?.status].CAN_EDIT && (
                    <DropdownMenuItem asChild>
                      <Link
                        to={`/services/${mission?.mid}/edit`}
                        className='w-full justify-start font-normal h-auto px-2 py-1.5 cursor-default'
                      >
                        Edit service
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isCreator &&
                    MISSION_STATUS[mission?.status].VALID_NEXT_STATES.includes(
                      MISSION_STATUS.REOPENED.ID,
                    ) && (
                      <DropdownMenuItem asChild>
                        <ReopenMissionButton
                          mission={mission}
                          variant='ghost'
                          className='w-full justify-start font-normal h-auto px-2 py-1.5 cursor-default'
                        />
                      </DropdownMenuItem>
                    )}
                  {isCreator &&
                    (MISSION_STATUS[mission?.status].CAN_DELETE ||
                      MISSION_STATUS[mission?.status].CAN_CANCEL) && (
                      <DropdownMenuItem asChild>
                        <CancelMissionButton
                          mission={mission}
                          variant='ghost'
                          className='w-full justify-start font-normal h-auto px-2 py-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-default'
                        />
                      </DropdownMenuItem>
                    )}
                  {!currentUser?.isAdmin &&
                    !isCreator &&
                    mission?.status !== MISSION_STATUS.REPORTED.ID && (
                      <DropdownMenuItem asChild>
                        <ReportMissionButton
                          mission={mission}
                          variant='ghost'
                          className='w-full justify-start font-normal h-auto px-2 py-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 cursor-default'
                        />
                      </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
        </div>

        <div className='flex flex-col lg:flex-row gap-8'>
          <div className='w-full lg:w-2/3'>
            {mission?.photos?.length > 0 ? (
              <Carousel className='w-full rounded-2xl overflow-hidden border bg-muted/20'>
                <CarouselContent>
                  {mission?.photos?.map((photo, index) => (
                    <CarouselItem key={index}>
                      <img
                        src={getImageUrl(photo.url)}
                        alt={`Service ${mission?.title} - Photo ${index + 1}`}
                        className='w-full aspect-video object-cover'
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : undefined}
                        decoding='async'
                        width='800'
                        height='450'
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {mission?.photos?.length > 1 && (
                  <>
                    <CarouselPrevious className='left-4 bg-background/80 backdrop-blur-sm' />
                    <CarouselNext className='right-4 bg-background/80 backdrop-blur-sm' />
                  </>
                )}
              </Carousel>
            ) : (
              <div className='w-full rounded-2xl overflow-hidden border bg-muted/20 shadow-sm'>
                <img
                  src='https://images.unsplash.com/photo-1647221597996-54f3d0f73809?q=75&w=800&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
                  alt='Service placeholder'
                  className='w-full aspect-video object-cover'
                  loading='eager'
                  fetchPriority='high'
                  decoding='async'
                  width='800'
                  height='450'
                />
              </div>
            )}
          </div>

          <div className='w-full lg:w-1/3'>
            <Card className='sticky top-24 shadow-lg border-primary/10 overflow-hidden'>
              <CardHeader className='bg-muted/30 border-b pb-5'>
                <div className='flex items-center gap-4'>
                  <Avatar className='h-16 w-16 border-2 border-background shadow-sm'>
                    <AvatarImage src={getImageUrl(mission?.avatar)} />
                    <AvatarFallback className='bg-primary/5 text-primary text-xl'>
                      {getInitials(getDisplayName(mission))}
                    </AvatarFallback>
                  </Avatar>
                  <div className='min-w-0'>
                    <p className='text-lg font-semibold text-muted-foreground'>
                      Applicant
                    </p>
                    <p className='font-bold text-xl truncate'>
                      <Link
                        to={`/users/${mission?.username}`}
                        className='user-link relative z-20 hover:text-primary hover:underline transition-colors'
                      >
                        @{mission?.username || 'unknown'}
                      </Link>
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='pt-1 space-y-4'>
                {canAccessMissionChat && mission?.conversation_id ? (
                  <Button asChild className='w-full' size='lg'>
                    <Link
                      to={`/conversations/${mission?.conversation_id}`}
                      state={{ from: `/services/${mission?.mid}` }}
                    >
                      <MessageCircle
                        className='mr-2 h-5 w-5'
                        aria-hidden='true'
                      />
                      Open service chat
                    </Link>
                  </Button>
                ) : !isCreator ? (
                  <Button
                    asChild
                    className='w-full border border-muted-foreground/30'
                    variant='secondary'
                    size='lg'
                  >
                    <Link to={`/users/${mission?.username}`}>
                      <MessageCircle
                        className='mr-2 h-5 w-5'
                        aria-hidden='true'
                      />
                      Chat with applicant
                    </Link>
                  </Button>
                ) : null}

                {isCreator ? (
                  <>
                    {(mission?.status === MISSION_STATUS.CLOSED.ID ||
                      mission?.waitingForPaymentVacancies?.length > 0) && (
                      <PayMissionButton
                        mission={mission}
                        className='w-full bg-green-700 border border-green-200 hover:bg-green-800 dark:border-0 dark:text-white'
                        size='lg'
                      />
                    )}

                    {(mission?.status === MISSION_STATUS.OPENED.ID ||
                      mission?.status === MISSION_STATUS.REOPENED.ID) && (
                      <CloseMissionButton
                        mission={mission}
                        className='w-full'
                        variant='outline'
                      />
                    )}

                    {mission?.canFinish &&
                      mission?.status !== MISSION_STATUS.FINISHED.ID && (
                        <FinishMissionButton
                          mission={mission}
                          className='w-full'
                        />
                      )}

                    {(mission?.status === MISSION_STATUS.IN_PROGRESS.ID ||
                      mission?.status === MISSION_STATUS.IN_DISPUTE.ID ||
                      mission?.status === MISSION_STATUS.CANCELLED.ID ||
                      mission?.status === MISSION_STATUS.DELETED.ID ||
                      mission?.status === MISSION_STATUS.REPORTED.ID ||
                      mission?.status === MISSION_STATUS.FINISHED.ID) && (
                      <div className='text-center text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 py-2 rounded-lg'>
                        <MissionOwnerStatusMessage
                          status={mission?.status}
                          canFinish={mission?.canFinish}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {(!currentUser?.isAdmin &&
                      mission?.status === MISSION_STATUS.IN_PROGRESS.ID &&
                      currentParticipation) ||
                    (!currentUser?.isAdmin &&
                      mission?.status === MISSION_STATUS.REOPENED.ID &&
                      currentParticipation) ? (
                      <>
                        <SubmitParticipationButton
                          missionId={mission?.mid}
                          participationStatus={currentParticipation?.status}
                          className='w-full '
                          size='lg'
                        />
                        {currentParticipation?.status ===
                          MISSION_PARTICIPATION_STATUS.SUBMITTED.ID &&
                          currentParticipation.review_deadline && (
                            <ParticipationReviewCountdown
                              deadline={currentParticipation.review_deadline}
                              className='justify-center rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium'
                            />
                          )}
                      </>
                    ) : currentParticipation?.status ===
                      MISSION_PARTICIPATION_STATUS.IN_DISPUTE.ID ? (
                      <p className='text-center text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 py-2 rounded-lg'>
                        {'Your participation has been disputed.'}
                      </p>
                    ) : !currentUser?.isAdmin &&
                      (mission?.status === MISSION_STATUS.CANCELLED.ID ||
                        mission?.status === MISSION_STATUS.DELETED.ID ||
                        mission?.status === MISSION_STATUS.REPORTED.ID) ? (
                      <div className='text-center text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 py-2 rounded-lg'>
                        <EndedStatusMessage
                          status={mission?.status}
                        ></EndedStatusMessage>
                      </div>
                    ) : mission?.status === MISSION_STATUS.FINISHED.ID &&
                      currentParticipation?.status ===
                        MISSION_PARTICIPATION_STATUS.RELEASED.ID ? (
                      <div className='text-center text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 py-2 rounded-lg'>
                        {messages.SERVICE.SERVICE_FINISHED}
                      </div>
                    ) : currentParticipation ? (
                      <div className='text-center text-sm font-medium text-muted-foreground bg-muted/20 border py-2 rounded-lg'>
                        {messages.SERVICE.SERVICE_JOINED}
                      </div>
                    ) : isFull ? (
                      <div className='text-center text-sm font-medium text-destructive bg-destructive/10 py-2 rounded-lg'>
                        {messages.SERVICE.SERVICE_FILLED}
                      </div>
                    ) : (
                      <div className='text-center text-sm font-medium text-green-700 bg-green-50 border border-green-200 py-2 rounded-lg'>
                        {messages.SERVICE.SERVICE_OPEN}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6 border-t'>
          <div className='lg:col-span-2 space-y-10'>
            <section className='bg-muted/10 p-6 rounded-2xl border'>
              <div className='flex flex-wrap items-center justify-between gap-4 mb-4 px-2'>
                <div>
                  <h2 className='text-2xl font-bold tracking-tight'>
                    Service team
                  </h2>
                  <p className='text-sm text-muted-foreground mt-1'>
                    Check out the available slots and current collaborators.
                  </p>
                </div>
                <div className='flex items-center gap-2 text-primary bg-primary/10 px-4 py-1.5 rounded-full text-sm font-bold'>
                  <Users className='h-4 w-4' aria-hidden='true' />
                  {mission?.occupied_vacancies}/{mission?.total_vacancies}{' '}
                  filled
                </div>
              </div>

              {isCreator &&
                MISSION_STATUS[mission?.status].CAN_ACCEPT_ADVENTURERS && (
                  <div className='mb-3 px-2'>
                    <Button
                      onClick={() => setIsSearchModalOpen(true)}
                      variant='secondary'
                    >
                      <UserPlus className='mr-2 h-4 w-4' aria-hidden='true' />{' '}
                      Invite a collaborator
                    </Button>
                  </div>
                )}

              <MissionVacancies
                mission={mission}
                isCreator={isCreator}
                currentUser={currentUser}
              />
            </section>

            <section>
              <h2 className='text-2xl font-bold tracking-tight mb-4'>
                Service details
              </h2>
              <p className='text-lg leading-relaxed whitespace-pre-wrap text-muted-foreground wrap-break-words wrap-anywhere'>
                {mission?.description}
              </p>
            </section>
          </div>

          <div className='lg:col-span-1 space-y-8'>
            <Card className='bg-card shadow-sm'>
              <CardHeader>
                <CardTitle className='text-2xl font-bold tracking-tight'>
                  Quick Info
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-5'>
                <div>
                  <p className='text-sm text-muted-foreground mb-1'>
                    Total Reward Pool
                  </p>
                  <p className='text-3xl font-black text-primary flex items-center gap-2 tabular-nums'>
                    {Number(mission?.total_payment).toFixed(2)}€
                    <HandCoins
                      className='h-7 w-7 text-primary/80'
                      aria-hidden='true'
                    />
                  </p>
                </div>
                <Separator />
                <div>
                  <p className='text-sm text-muted-foreground mb-1'>
                    Current Status
                  </p>
                  <p className='font-semibold italic text-muted-foreground'>
                    {MISSION_STATUS[mission?.status]?.LABEL}
                  </p>
                </div>
                <Separator />
                <div>
                  <p className='text-sm text-muted-foreground mb-1'>
                    Posted on
                  </p>
                  <p className='font-medium'>
                    {timestampToDayMonthYear(mission?.publication_date)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {mission?.location && mission?.latitude && mission?.longitude && (
              <div>
                <h2 className='text-2xl font-bold tracking-tight p-2'>
                  Location
                </h2>
                <div className='rounded-2xl overflow-hidden border h-64 shadow-sm'>
                  <Map
                    readOnly={true}
                    initialLocation={{
                      lat: mission?.latitude,
                      lng: mission?.longitude,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {!currentUser?.isAdmin && (
          <SearchAdventurerModal
            missionId={mission?.mid}
            vacancies={(mission?.participants || []).filter(
              (vacancy) => !vacancy.adventurer_id,
            )}
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
          />
        )}
      </div>
    </>
  );
};

const VacancyCard = ({
  mission,
  vacancy,
  isCreator,
  currentUser,
  onClick,
  onReport,
}) => {
  const isAssigned = !!vacancy.adventurer_id;
  const [reviewDialogType, setReviewDialogType] = useState(null);
  const isAssignedToUser = vacancy.adventurer_id === currentUser?.id;
  const canReviewAdventurer =
    isCreator && MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_REVIEW;
  const canReviewOwner =
    isAssignedToUser && MISSION_PARTICIPATION_STATUS[vacancy.status].CAN_REVIEW;
  const hasOwnerReview = !!vacancy.owner_review_id;
  const hasAdventurerReview = !!vacancy.adventurer_review_id;
  const hasPendingRewardOffer =
    vacancy.pending_reward_offer !== null &&
    vacancy.pending_reward_offer !== undefined;
  const rewardOfferIncreases =
    Number(vacancy.pending_reward_offer) > Number(vacancy.reward);

  const canReportAdventurer =
    isCreator &&
    vacancy.adventurer_id &&
    ![
      MISSION_PARTICIPATION_STATUS.JOINED.ID,
      MISSION_PARTICIPATION_STATUS.EMPTY.ID,
      MISSION_PARTICIPATION_STATUS.RELEASED.ID,
    ].includes(vacancy.status);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(vacancy.vacancy_id);
    }
  };

  const handleReviewClick = (event, type) => {
    event.stopPropagation();
    setReviewDialogType(type);
  };

  return (
    <Card
      role='button'
      tabIndex={0}
      className='relative shrink-0 w-56 flex flex-col gap-0 overflow-visible p-4 [--card-spacing:0] shadow-sm transition-all hover:shadow-lg hover:cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 group'
      onClick={() => onClick(vacancy.vacancy_id)}
      onKeyDown={handleKeyDown}
    >
      {canReportAdventurer && (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 z-10 border border-muted'
          onClick={(e) => {
            e.stopPropagation();
            onReport(vacancy.vacancy_id);
          }}
          title='Report collaborator'
          aria-label='Report collaborator'
        >
          <MessageSquareWarning className='h-4 w-4' aria-hidden='true' />
        </Button>
      )}

      <h3 className='font-semibold text-sm truncate min-h-5 mb-3 text-center mx-8'>
        {vacancy.vacancy_title || 'Collaborator'}
      </h3>

      <div className='flex justify-center mb-4'>
        {isAssigned ? (
          <div className='w-16 h-16 rounded-full flex items-center justify-center bg-primary/10 text-primary border-2 border-primary'>
            <Avatar size='md' className='h-full w-full'>
              <AvatarImage
                src={getImageUrl(vacancy.avatar)}
                alt={`${vacancy.username} avatar`}
                className='h-full w-full object-cover'
              />
              <AvatarFallback>
                {getInitials(getDisplayName(vacancy))}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <div className='w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed border-muted text-secondary'>
            <UserPlus size={24} aria-hidden='true' />
          </div>
        )}
      </div>

      <div className='text-center -mt-3'>
        <span
          className={`truncate w-2/3 ${isAssigned ? 'text-primary font-semibold' : 'italic '}`}
        >
          {isAssigned ? vacancy.username : 'Unassigned'}
        </span>

        <div className='flex justify-between items-center font-medium mt-4 mb-3'>
          <span className='text-primary truncate text-sm'>
            {MISSION_PARTICIPATION_STATUS[vacancy.status].LABEL}
          </span>
          <span className='text-primary text-sm'>
            {Number(vacancy.reward).toFixed(2)}€
          </span>
        </div>
        <p className='text-xs wrap-break-words wrap-anywhere line-clamp-2 leading-relaxed grow text-left'>
          {vacancy.description || 'No additional description.'}
        </p>
      </div>

      <div className='mt-1 pt-2 space-y-2'>
        {(hasOwnerReview || hasAdventurerReview) && (
          <div className='space-y-1.5'>
            {hasOwnerReview && (
              <div className='flex items-center justify-between bg-amber-50/50 border border-amber-100 dark:bg-amber-100/80 dark:border-amber-200 px-2.5 py-1.5 rounded-md'>
                <span className='text-xs font-medium text-muted-foreground dark:text-amber-800/70'>
                  Collaborator rating
                </span>
                <div className='flex items-center gap-1 text-sm font-bold text-amber-700 dark:text-amber-800'>
                  <Star
                    className='h-3.5 w-3.5 fill-amber-400 text-amber-400 dark:fill-amber-600 dark:text-amber-600'
                    aria-hidden='true'
                  />
                  {Number(vacancy.owner_review_rating).toFixed(1)}
                </div>
              </div>
            )}

            {hasAdventurerReview && (
              <div className='flex items-center justify-between bg-amber-50/50 border border-amber-100 dark:bg-amber-100/80 dark:border-amber-200 px-2.5 py-1.5 rounded-md'>
                <span className='text-xs font-medium text-muted-foreground dark:text-amber-800/70'>
                  Applicant rating
                </span>
                <div className='flex items-center gap-1 text-sm font-bold text-amber-700 dark:text-amber-800'>
                  <Star
                    className='h-3.5 w-3.5 fill-amber-400 text-amber-400  dark:fill-amber-600 dark:text-amber-600'
                    aria-hidden='true'
                  />
                  {Number(vacancy.adventurer_review_rating).toFixed(1)}
                </div>
              </div>
            )}
          </div>
        )}
        {canReviewAdventurer && !hasOwnerReview && (
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='w-full'
            onClick={(event) => handleReviewClick(event, 'adventurer')}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Star className='h-4 w-4 mr-1.5' aria-hidden='true' />
            Review collaborator
          </Button>
        )}

        {canReviewOwner && !hasAdventurerReview && (
          <Button
            type='button'
            size='sm'
            variant='outline'
            className='w-full'
            onClick={(event) => handleReviewClick(event, 'owner')}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Star className='h-4 w-4 mr-1.5' aria-hidden='true' />
            Review applicant
          </Button>
        )}
      </div>
      {isCreator && hasPendingRewardOffer && (
        <p
          className={cn(
            'mt-auto border-t pt-3 text-center text-xs font-semibold',
            rewardOfferIncreases
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400',
          )}
          title={`Reward offer pending response from @${vacancy.username}`}
        >
          Pending offer: {Number(vacancy.reward).toFixed(2)}€ →{' '}
          {Number(vacancy.pending_reward_offer).toFixed(2)}€
        </p>
      )}
      <ReviewAdventurerDialog
        mission={mission}
        participant={vacancy}
        isOpen={reviewDialogType === 'adventurer'}
        onClose={() => setReviewDialogType(null)}
      />
      <ReviewOwnerDialog
        mission={mission}
        isOpen={reviewDialogType === 'owner'}
        onClose={() => setReviewDialogType(null)}
      />
    </Card>
  );
};

const ViewVacancyDialog = ({
  mission,
  vacancy,
  isOpen,
  onClose,
  isCreator,
  currentUser,
}) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [isApplying, setIsApplying] = useState(false);
  const [joinMessage, setJoinMessage] = useState('');

  const { isPending: isJoining, mutate: joinMutate } = useMutation({
    mutationFn: () => joinMission(mission.mid, vacancy.vacancy_id, joinMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['getMission', String(mission.mid)],
      });
      queryClient.invalidateQueries({
        queryKey: ['getMission', mission.mid],
      });
      showAlert({
        title: 'Request sent',
        description:
          'The service applicant received your request. You will join the service only if they accept it.',
      });
      handleClose();
    },
    onError: (error) => {
      showAlert({
        title: messages.SERVICE.JOIN_SERVICE_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.errors?.general?.[0] ||
          messagesShared.GENERAL.UNEXPECTED_ERROR,
      });
    },
  });

  const handleClose = () => {
    setIsApplying(false);
    setJoinMessage('');
    onClose();
  };

  if (!vacancy) return null;
  const isAssigned = !!vacancy.adventurer_id;
  const isAssignedToUser = vacancy.adventurer_id === currentUser?.id;
  const hasOwnerReview = !!vacancy.owner_review_id;
  const hasAdventurerReview = !!vacancy.adventurer_review_id;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className='sm:max-w-lg max-h-[80vh] overflow-y-auto'
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <DialogHeader className='pb-4 border-b'>
          <div className='flex justify-between items-start gap-4 pr-6'>
            <DialogTitle className='text-2xl font-bold tracking-tight wrap-break-words wrap-anywhere'>
              {vacancy.vacancy_title || 'Collaborator needed'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className='space-y-6 py-2'>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <h4 className='font-semibold mb-1'>Monetary reward</h4>
              <div className='bg-muted/20 p-4 rounded-xl border'>
                <p className='text-2xl font-bold text-primary'>
                  {Number(vacancy.reward).toFixed(2)}€
                </p>
              </div>
            </div>
            <div>
              <h4 className='font-semibold mb-1'>Current status</h4>
              <div className='bg-muted/20 p-4 rounded-xl border flex flex-col justify-center min-h-17'>
                <p className='text-sm font-medium'>
                  {getParticipationStatusLabel(vacancy.status)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className='font-semibold text-sm mb-2'>Vacancy Details</h4>
            <p className='text-sm text-muted-foreground leading-relaxed bg-muted/10 p-4 rounded-xl border wrap-break-words wrap-anywhere min-h-24'>
              {vacancy.vacancy_description ||
                'No additional description provided for this vacancy.'}
            </p>
          </div>

          {isAssigned && (
            <div>
              <h4 className='font-semibold text-sm mb-2'>
                Assigned Collaborator
              </h4>
              <div className='flex items-center gap-3 p-3 bg-muted/10 border rounded-xl'>
                <Avatar className='h-10 w-10 border border-primary/10'>
                  <AvatarImage src={getImageUrl(vacancy.avatar)} />
                  <AvatarFallback>
                    {getInitials(getDisplayName(vacancy))}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className='text-sm font-semibold'>
                    {isAssignedToUser
                      ? 'You (Assigned)'
                      : `@${vacancy.username}`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(hasOwnerReview || hasAdventurerReview) && (
            <div>
              <h4 className='font-semibold text-sm mb-2'>Service reviews</h4>
              <div className='space-y-3'>
                {hasOwnerReview && (
                  <div className='bg-amber-50/50 border border-amber-100  dark:bg-amber-100/80 dark:border-amber-200  p-4 rounded-xl'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='font-bold  text-amber-800/70'>
                        Collaborator Rating
                      </span>
                      <div className='flex items-center gap-1 font-bold text-amber-700 dark:text-amber-800'>
                        <Star
                          className='h-4 w-4 fill-amber-400 text-amber-400 dark:fill-amber-600 dark:text-amber-600'
                          aria-hidden='true'
                        />
                        {Number(vacancy.owner_review_rating).toFixed(1)}
                      </div>
                    </div>
                    {vacancy.owner_review_comment ? (
                      <p className='text-sm text-amber-900/80 italic wrap-break-words'>
                        &quot;{vacancy.owner_review_comment}&quot;
                      </p>
                    ) : (
                      <p className='text-sm text-amber-900/50 italic'>
                        No written comment.
                      </p>
                    )}
                  </div>
                )}

                {hasAdventurerReview && (
                  <div className='bg-amber-50/50 border border-amber-100 dark:bg-amber-100/80 dark:border-amber-200  p-4 rounded-xl'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='font-bold text-amber-800/70'>
                        Applicant Rating
                      </span>
                      <div className='flex items-center gap-1 font-bold text-amber-700 dark:text-amber-800'>
                        <Star
                          className='h-4 w-4 fill-amber-400 text-amber-400 dark:fill-amber-600 dark:text-amber-600'
                          aria-hidden='true'
                        />
                        {Number(vacancy.adventurer_review_rating).toFixed(1)}
                      </div>
                    </div>
                    {vacancy.adventurer_review_comment ? (
                      <p className='text-sm text-amber-900/80 dark:text-amber-900/80  italic wrap-break-words'>
                        &quot;{vacancy.adventurer_review_comment}&quot;
                      </p>
                    ) : (
                      <p className='text-sm text-amber-900/50 italic'>
                        No written comment.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {isApplying && (
            <div className='animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-xl mt-4'>
              <Label
                htmlFor='joinMessage'
                className='text-sm font-semibold text-primary'
              >
                Why are you the best fit?
              </Label>
              <Textarea
                id='joinMessage'
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder='Write a short message to the applicant...'
                maxLength={consts.NOTIFICATION.MESSAGE.MAX_LENGTH}
                className='bg-background resize-none'
                rows={4}
                autoFocus
              />
              <p className='text-xs text-muted-foreground text-right'>
                {joinMessage.length}/{consts.NOTIFICATION.MESSAGE.MAX_LENGTH}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className='pt-2'>
          {!isApplying ? (
            <>
              <Button variant='outline' onClick={handleClose}>
                Close
              </Button>

              {!currentUser?.isAdmin &&
                !isCreator &&
                !isAssigned &&
                (mission.is_joined ? (
                  <Button disabled>Already in service</Button>
                ) : mission.has_pending_join_request ? (
                  <Button disabled>Request pending</Button>
                ) : (
                  <Button onClick={() => setIsApplying(true)}>
                    Apply for vacancy
                  </Button>
                ))}

              {!currentUser?.isAdmin &&
                !isCreator &&
                isAssignedToUser &&
                mission.status !== MISSION_STATUS.IN_PROGRESS.ID && (
                  <UnjoinMissionButton
                    missionId={mission.mid}
                    vacancyId={vacancy.vacancy_id}
                  />
                )}
            </>
          ) : (
            <>
              <Button
                variant='outline'
                onClick={() => setIsApplying(false)}
                disabled={isJoining}
              >
                Cancel
              </Button>
              <Button
                onClick={() => joinMutate()}
                disabled={isJoining || joinMessage.trim().length === 0}
              >
                {isJoining ? 'Sending...' : 'Send application'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UnjoinMissionButton = ({
  missionId,
  vacancyId,
  className,
  variant,
  size,
}) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => unjoinMission(missionId, vacancyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getMissions'] });
      queryClient.invalidateQueries({
        queryKey: ['getMission', String(missionId)],
      });
    },

    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.SERVICE.UNJOIN_SERVICE_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.errors?.general?.[0] ||
          messagesShared.GENERAL.UNEXPECTED_ERROR,
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    showAlert({
      title: messages.SERVICE.UNJOIN_SERVICE_ALERT.TITLE,
      description: messages.SERVICE.UNJOIN_SERVICE_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.SERVICE.UNJOIN_SERVICE_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='unjoinMissionButton'
      onClick={handleAttempt}
      disabled={isPending}
      className={className}
      variant={variant}
      size={size}
    >
      {'Unjoin service'}
    </Button>
  );
};

const MissionVacancies = ({ mission, isCreator, currentUser }) => {
  const [selectedVacancyId, setSelectedVacancyId] = useState(null);
  const [reportingVacancyId, setReportingVacancyId] = useState(null);

  const handleClickVacancy = useCallback((id) => {
    setSelectedVacancyId(id);
  }, []);

  const handleReportVacancy = useCallback((id) => {
    setReportingVacancyId(id);
  }, []);

  const selectedVacancy = mission?.participants.find(
    (v) => v.vacancy_id === selectedVacancyId,
  );

  return (
    <div className='w-full space-y-2'>
      <div className='flex overflow-x-auto gap-4 p-2 snap-x snap-mandatory hide-scrollbar items-center ms-2'>
        {mission?.participants.map((vac) => (
          <div key={vac.vacancy_id} className='snap-start'>
            <VacancyCard
              mission={mission}
              vacancy={vac}
              isCreator={isCreator}
              currentUser={currentUser}
              onClick={handleClickVacancy}
              onReport={handleReportVacancy}
            />
          </div>
        ))}
      </div>

      <ViewVacancyDialog
        key={selectedVacancy ? selectedVacancy.vacancy_id : 'empty'}
        vacancy={selectedVacancy}
        isOpen={!!selectedVacancyId}
        onClose={() => setSelectedVacancyId(null)}
        isCreator={isCreator}
        mission={mission}
        currentUser={currentUser}
      />

      <ReportAdventurerDialog
        vacancyId={reportingVacancyId}
        mid={mission?.mid}
        isOpen={!!reportingVacancyId}
        onClose={() => setReportingVacancyId(null)}
      />
    </div>
  );
};

const ReportAdventurerDialog = ({ mid, vacancyId, isOpen, onClose }) => {
  const [state, reportVacancyFormAction, isPending] = useActionState(
    reportAdventurerAction,
    initialStateUseStateAction,
  );

  const [clearedFields, setClearedFields] = useState({});
  const [prevServerState, setPrevServerState] = useState(state);
  const [isAlertClosed, setIsAlertClosed] = useState(false);
  const processedState = useRef(null);
  const { showAlert } = useAlert();

  if (state !== prevServerState) {
    setPrevServerState(state);
    setClearedFields({});
    setIsAlertClosed(false);
  }

  const handleFieldChange = (e) => {
    const fieldName = e.target.name;
    setClearedFields((prev) => ({ ...prev, [fieldName]: true }));
  };

  useEffect(() => {
    if (state.success && processedState.current !== state) {
      processedState.current = state;
      onClose();
      showAlert({
        title: messages.REPORT.SUCCESS_ALERT.TITLE,
        description: messages.REPORT.SUCCESS_ALERT.DESCRIPTION,
      });
    }
  }, [state, onClose, showAlert]);

  const handleOpenChange = (open) => {
    if (!open) {
      setIsAlertClosed(true);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-sm max-h-[80vh] overflow-y-auto'>
        <DialogHeader className='pb-3 border-b'>
          <DialogTitle>
            {messages.EDIT_SERVICE.REPORT_VACANCY_DIALOG.TITLE ||
              'Report collaborator'}
          </DialogTitle>
          <DialogDescription>
            {messages.EDIT_SERVICE.REPORT_VACANCY_DIALOG.DESCRIPTION ||
              'Please provide details about the issue with this collaborator.'}
          </DialogDescription>
        </DialogHeader>
        <form
          action={reportVacancyFormAction}
          id='reportAdventurerForm'
          noValidate
        >
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <FormTextareaField
                id='reportVacancyMessage'
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
            <input
              type='hidden'
              id='vacancyId'
              name='vacancyId'
              value={vacancyId || ''}
            />
            <input type='hidden' id='mid' name='mid' value={mid} />
            {state.errors?.general && !isAlertClosed && (
              <FormAlert onClose={() => setIsAlertClosed(true)}>
                {state.errors.general[0]}
              </FormAlert>
            )}
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline' type='button' onClick={onClose}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type='submit'
            disabled={isPending}
            form='reportAdventurerForm'
          >
            {isPending ? 'Reporting...' : 'Report collaborator'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ReviewAdventurerDialog = ({ mission, participant, isOpen, onClose }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { isPending, mutate } = useMutation({
    mutationFn: () =>
      reviewAdventurer(mission?.mid, participant.adventurer_id, {
        rating,
        comment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['getMission', String(mission.mid)],
      });
      queryClient.invalidateQueries({
        queryKey: ['getMission', mission.mid],
      });
      queryClient.invalidateQueries({
        queryKey: ['getPublicUserProfile', participant.username],
      });
      showAlert({
        title: messages.SERVICE.REVIEW_COLLABORATOR_ALERT.SUCCESS_TITLE,
        description:
          messages.SERVICE.REVIEW_COLLABORATOR_ALERT.SUCCESS_DESCRIPTION,
      });
      setRating(5);
      setComment('');
      setErrorMessage('');
      onClose();
    },
    onError: (error) => {
      setErrorMessage(
        error?.response?.data?.error ||
          error?.response?.data?.errors?.general?.[0] ||
          messages.SERVICE.REVIEW_COLLABORATOR_ALERT.ERROR_TITLE,
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (rating < 1 || rating > 5) {
      setErrorMessage('Rating must be between 1 and 5.');
      return;
    }

    if (comment.length > consts.REVIEW.COMMENT_MAX_LENGTH) {
      setErrorMessage(
        `Comment must be shorter than ${consts.REVIEW.COMMENT_MAX_LENGTH} characters.`,
      );
      return;
    }

    mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className='sm:max-w-md'
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <DialogHeader className='pb-3 border-b'>
          <DialogTitle>Review {participant.username}</DialogTitle>
          <DialogDescription>
            This review will be linked to this completed service.
          </DialogDescription>
        </DialogHeader>

        <form id='reviewAdventurerForm' onSubmit={handleSubmit} noValidate>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <label htmlFor='adventurerRating' className='text-sm font-medium'>
                Rating
              </label>
              <Input
                id='adventurerRating'
                type='number'
                min={consts.REVIEW.RATING_MIN}
                max={consts.REVIEW.RATING_MAX}
                step={consts.REVIEW.RATING_STEP}
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
              />
            </div>

            <div className='space-y-2'>
              <label htmlFor='adventurerReview' className='text-sm font-medium'>
                Comment
              </label>
              <Textarea
                id='adventurerReview'
                value={comment}
                maxLength={consts.REVIEW.COMMENT_MAX_LENGTH}
                onChange={(event) => setComment(event.target.value)}
                rows={5}
              />
              <p className='text-xs text-muted-foreground'>
                {comment.length}/{consts.REVIEW.COMMENT_MAX_LENGTH}
              </p>
            </div>

            {errorMessage && (
              <p className='rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
                {errorMessage}
              </p>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            type='submit'
            form='reviewAdventurerForm'
            disabled={isPending}
          >
            {isPending ? 'Sending...' : 'Send review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ReviewOwnerDialog = ({ mission, isOpen, onClose }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { isPending, mutate } = useMutation({
    mutationFn: () =>
      reviewOwner(mission.mid, {
        rating,
        comment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['getMission', String(mission.mid)],
      });
      queryClient.invalidateQueries({
        queryKey: ['getMission', mission.mid],
      });
      queryClient.invalidateQueries({
        queryKey: ['getUserReviews'],
      });
      showAlert({
        title: messages.SERVICE.REVIEW_COLLABORATOR_ALERT.SUCCESS_TITLE,
        description:
          messages.SERVICE.REVIEW_COLLABORATOR_ALERT.SUCCESS_DESCRIPTION,
      });
      setRating(5);
      setComment('');
      setErrorMessage('');
      onClose();
    },
    onError: (error) => {
      setErrorMessage(
        error?.response?.data?.error ||
          error?.response?.data?.errors?.general?.[0] ||
          messages.SERVICE.REVIEW_COLLABORATOR_ALERT.ERROR_TITLE,
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (rating < 1 || rating > 5) {
      setErrorMessage('Rating must be between 1 and 5.');
      return;
    }

    if (comment.length > consts.REVIEW.COMMENT_MAX_LENGTH) {
      setErrorMessage(
        `Comment must be shorter than ${consts.REVIEW.COMMENT_MAX_LENGTH} characters.`,
      );
      return;
    }

    mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className='sm:max-w-md'
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <DialogHeader className='pb-3 border-b'>
          <DialogTitle>Review service applicant</DialogTitle>
          <DialogDescription>
            This review will be linked to this completed service.
          </DialogDescription>
        </DialogHeader>

        <form id='reviewOwnerForm' onSubmit={handleSubmit} noValidate>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <label htmlFor='ownerRating' className='text-sm font-medium'>
                Rating
              </label>
              <Input
                id='ownerRating'
                type='number'
                min={consts.REVIEW.RATING_MIN}
                max={consts.REVIEW.RATING_MAX}
                step={consts.REVIEW.RATING_STEP}
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
              />
            </div>

            <div className='space-y-2'>
              <label htmlFor='ownerReview' className='text-sm font-medium'>
                Comment
              </label>
              <Textarea
                id='ownerReview'
                value={comment}
                maxLength={consts.REVIEW.COMMENT_MAX_LENGTH}
                onChange={(event) => setComment(event.target.value)}
                rows={5}
              />
              <p className='text-xs text-muted-foreground'>
                {comment.length}/{consts.REVIEW.COMMENT_MAX_LENGTH}
              </p>
            </div>

            {errorMessage && (
              <p className='rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
                {errorMessage}
              </p>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button type='submit' form='reviewOwnerForm' disabled={isPending}>
            {isPending ? 'Sending...' : 'Send review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SearchAdventurerModal = ({ missionId, vacancies, isOpen, onClose }) => {
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false;
    return failureCount < 3;
  };

  const [username, setUsername] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedVacancyId, setSelectedVacancyId] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [localError, setLocalError] = useState('');

  const { showAlert } = useAlert();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isError,
    error: searchError,
  } = useInfiniteQuery(
    searchUsersByUsernameInfiniteQueryOptions(
      PAGINATION_LIMIT.USERS,
      { username: submittedQuery },
      {
        enabled: !!submittedQuery,
        retry: retryOption,
      },
    ),
  );

  const foundUsers = data?.pages.flatMap((page) => page.users) || [];
  const { ref: loadMoreRef, inView } = useInView({
    rootMargin: '0px 0px 100px 0px',
  });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const { isPending: isSendingNotification, mutate: sendNotification } =
    useMutation(
      inviteToMissionMutationOptions({
        onSuccess: () => {
          showAlert({
            title: 'Invitation sent',
            description: `The invitation was sent to ${selectedUser.username}.`,
          });
          handleClose();
        },
        onError: (error) => {
          setLocalError(
            error?.response?.data?.errors?.general?.[0] ||
              'Could not send invitation.',
          );
        },
      }),
    );

  const handleSearch = (event) => {
    event.preventDefault();
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setLocalError('Write a username to search for a collaborator.');
      return;
    }

    setLocalError('');
    setSubmittedQuery(trimmedUsername);
  };

  const handleClose = () => {
    setUsername('');
    setSubmittedQuery('');
    setSelectedUser(null);
    setSelectedVacancyId('');
    setNotificationMessage('');
    setLocalError('');
    onClose();
  };

  const displayError =
    localError ||
    (isError && searchError?.response?.status !== 404
      ? searchError?.response?.data?.error
      : '');
  const isInitialLoading = isFetching && !isFetchingNextPage;
  const noResults = !isFetching && submittedQuery && foundUsers.length === 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className='w-[min(92vw,42rem)] max-w-2xl'>
        <AlertDialogHeader className='pb-3 border-b'>
          <AlertDialogTitle>Search collaborator</AlertDialogTitle>
          <AlertDialogDescription>
            Find the collaborator by username before sending the invitation.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='min-w-0'>
          {!selectedUser ? (
            <form
              onSubmit={handleSearch}
              className='flex flex-col gap-4'
              noValidate
            >
              <label
                htmlFor='searchAdventurerByUsername'
                className='text-sm font-medium text-primary'
              >
                Collaborator username
              </label>
              <div className='flex gap-3'>
                <Input
                  id='searchAdventurerByUsername'
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder='Search by username'
                  autoComplete='off'
                />
                <Button type='submit' disabled={isInitialLoading}>
                  <Search className='h-4 w-4 mr-2' aria-hidden='true' />
                  {isInitialLoading ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {displayError && (
                <p className='rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
                  {displayError}
                </p>
              )}

              {noResults && (
                <p className='text-sm text-muted-foreground text-center py-4'>
                  No collaborator found with that username.
                </p>
              )}

              {foundUsers.length > 0 && (
                <div className='flex flex-col gap-3 max-h-80 overflow-y-auto pr-2'>
                  {foundUsers.map((foundUser) => (
                    <div
                      key={foundUser.uid}
                      className='rounded-2xl border bg-muted/20 px-4 py-4 shrink-0'
                    >
                      <div className='flex items-center justify-between gap-4'>
                        <div className='flex min-w-0 items-center gap-3'>
                          <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                            <User className='h-5 w-5' aria-hidden='true' />
                          </span>
                          <div className='min-w-0'>
                            <p className='truncate text-base font-semibold'>
                              {foundUser.username}
                            </p>
                            <p className='truncate text-sm text-muted-foreground'>
                              {foundUser.email || 'Ready to invite.'}
                            </p>
                          </div>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => {
                            setSelectedUser(foundUser);
                            setNotificationMessage('');
                            setLocalError('');
                          }}
                        >
                          Invite
                        </Button>
                      </div>
                    </div>
                  ))}

                  {hasNextPage && (
                    <div
                      ref={isFetchingNextPage ? null : loadMoreRef}
                      className='flex justify-center py-4'
                    >
                      {isFetchingNextPage && (
                        <span className='text-sm text-muted-foreground animate-pulse'>
                          Loading more users...
                        </span>
                      )}
                    </div>
                  )}

                  {!hasNextPage && foundUsers.length > 5 && (
                    <div className='text-center text-xs text-muted-foreground py-2'>
                      No more users found.
                    </div>
                  )}
                </div>
              )}
            </form>
          ) : (
            <div className='flex flex-col gap-4'>
              <div className='min-w-0 rounded-2xl border bg-card px-4 py-4'>
                <div className='flex items-center gap-3'>
                  <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                    <User className='h-5 w-5' aria-hidden='true' />
                  </span>
                  <div className='min-w-0'>
                    <p className='truncate text-base font-semibold text-primary'>
                      {selectedUser.username}
                    </p>
                    <p className='truncate text-sm text-primary'>
                      {selectedUser.email || 'Selected collaborator'}
                    </p>
                  </div>
                </div>
              </div>

              <label
                htmlFor='invitationVacancy'
                className='text-sm font-medium text-primary'
              >
                Vacancy
              </label>
              <select
                id='invitationVacancy'
                value={selectedVacancyId}
                onChange={(event) => {
                  setSelectedVacancyId(event.target.value);
                  setLocalError('');
                }}
                className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
              >
                <option value=''>Select a vacancy</option>
                {vacancies.map((vacancy) => (
                  <option key={vacancy.vacancy_id} value={vacancy.vacancy_id}>
                    {vacancy.vacancy_title || 'Untitled vacancy'} -{' '}
                    {Number(vacancy.reward).toFixed(2)}€
                  </option>
                ))}
              </select>

              <label
                htmlFor='notificationMessage'
                className='text-sm font-medium text-primary'
              >
                Invitation message
              </label>
              <Textarea
                className='min-h-40 w-full min-w-0 resize-y'
                id='notificationMessage'
                value={notificationMessage}
                onChange={(event) => setNotificationMessage(event.target.value)}
                placeholder='Write a short message for the collaborator'
                rows={5}
              />

              {displayError && (
                <p className='rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
                  {displayError}
                </p>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter className='justify-end gap-2'>
          {selectedUser ? (
            <>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setSelectedUser(null);
                  setNotificationMessage('');
                  setLocalError('');
                }}
              >
                Back
              </Button>
              <Button
                type='button'
                onClick={() =>
                  selectedVacancyId
                    ? sendNotification({
                        missionId,
                        receiverId: selectedUser.uid,
                        vacancyId: Number(selectedVacancyId),
                        message: notificationMessage,
                      })
                    : setLocalError('Select a vacancy before inviting.')
                }
                disabled={isSendingNotification || vacancies.length === 0}
              >
                {isSendingNotification ? 'Sending...' : 'Send invitation'}
              </Button>
            </>
          ) : (
            <Button type='button' variant='outline' onClick={handleClose}>
              Close
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const CloseMissionButton = ({ mission, className, variant, size }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => closeMission(mission.mid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getMissions'] });
      queryClient.invalidateQueries({
        queryKey: ['getMission', String(mission.mid)],
      });
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.SERVICE.CLOSE_SERVICE_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.errors?.general?.[0] ||
          messagesShared.GENERAL.UNEXPECTED_ERROR,
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    if (mission.status === MISSION_STATUS.REOPENED.ID) {
      showAlert({
        title: messages.SERVICE.CLOSE_SERVICE_ALERT.TITLE,
        description:
          messages.SERVICE.CLOSE_SERVICE_ALERT
            .NO_NEW_COLLABORATORS_AFTER_REOPEN,
        confirmText: messages.SERVICE.CLOSE_SERVICE_ALERT.CONFIRM_TEXT,
        onConfirm: mutate,
      });
    } else {
      showAlert({
        title:
          mission.occupied_vacancies === 0
            ? messages.SERVICE.CLOSE_SERVICE_ALERT.ERROR_TITLE
            : messages.SERVICE.CLOSE_SERVICE_ALERT.TITLE,
        description:
          mission.occupied_vacancies === 0
            ? messages.SERVICE.CLOSE_SERVICE_ALERT.NO_COLLABORATORS_DESCRIPTION
            : mission.total_vacancies > mission.occupied_vacancies
              ? messages.SERVICE.CLOSE_SERVICE_ALERT
                  .AVAILABLE_VACANCIES_DESCRIPTION
              : messages.SERVICE.CLOSE_SERVICE_ALERT.START_DESCRIPTION,
        variant: mission.occupied_vacancies === 0 ? 'info' : 'warning',
        confirmText:
          mission.occupied_vacancies === 0
            ? 'Ok'
            : messages.SERVICE.CLOSE_SERVICE_ALERT.CONFIRM_TEXT,
        onConfirm: mission.occupied_vacancies === 0 ? null : mutate,
      });
    }
  };

  return (
    <Button
      type='button'
      id='closeMissionButton'
      onClick={handleAttempt}
      disabled={isPending}
      className={className}
      variant={variant}
      size={size}
    >
      {'Close service'}
    </Button>
  );
};

const SubmitParticipationButton = ({
  missionId,
  participationStatus,
  className,
  variant,
  size,
}) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => submitMissionParticipation(missionId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['getMission', String(missionId)],
      });
      queryClient.invalidateQueries({
        queryKey: ['getMission', missionId],
      });
    },
    onError: (error) => {
      showAlert({
        title: messages.SERVICE.SUBMIT_PARTICIPATION_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.errors?.general?.[0] ||
          messagesShared.GENERAL.UNEXPECTED_ERROR,
      });
    },
  });

  const handleAttempt = () => {
    showAlert({
      title: messages.SERVICE.SUBMIT_PARTICIPATION_ALERT.TITLE,
      description: messages.SERVICE.SUBMIT_PARTICIPATION_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.SERVICE.SUBMIT_PARTICIPATION_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  const isSubmitted =
    participationStatus &&
    participationStatus !== MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID;
  const buttonLabel =
    participationStatus &&
    participationStatus !== MISSION_PARTICIPATION_STATUS.IN_PROGRESS.ID
      ? getParticipationStatusLabel(participationStatus)
      : 'Submit my part';
  const classNameButton =
    participationStatus === MISSION_PARTICIPATION_STATUS.REJECTED.ID
      ? 'bg-destructive/80'
      : 'bg-green-700 border border-green-200 hover:bg-green-800 dark:text-white';

  return (
    <Button
      type='button'
      id='submitParticipationButton'
      onClick={handleAttempt}
      disabled={isPending || isSubmitted}
      className={cn(classNameButton, className)}
      variant={variant}
      size={size}
    >
      {buttonLabel}
    </Button>
  );
};

const MissionOwnerStatusMessage = ({ status, canFinish }) => {
  if (status === MISSION_STATUS.FINISHED.ID) {
    return <p className='p-1'>{messages.SERVICE.SERVICE_FINISHED_OWNER}</p>;
  }

  if (canFinish) {
    return (
      <p className='p-1'>
        Finish this service for the records or add some more collaborators if
        needed!
      </p>
    );
  }

  if (status === MISSION_STATUS.IN_PROGRESS.ID) {
    return (
      <p className='p-1'>
        Waiting for collaborators to submit their participation.
      </p>
    );
  }

  if (status === MISSION_STATUS.IN_DISPUTE.ID) {
    return <p className='p-1'>{messages.SERVICE.SERVICE_IN_DISPUTE}</p>;
  }

  if (
    status === MISSION_STATUS.CANCELLED.ID ||
    status === MISSION_STATUS.DELETED.ID ||
    status === MISSION_STATUS.REPORTED.ID
  )
    return <EndedStatusMessage status={status}></EndedStatusMessage>;

  return <p className='p-1'>{messages.SERVICE.SERVICE_CLOSED}</p>;
};

const EndedStatusMessage = ({ status }) => {
  if (status === MISSION_STATUS.CANCELLED.ID) {
    return <p className='p-1 '>This service has been cancelled.</p>;
  }

  if (status === MISSION_STATUS.DELETED.ID) {
    return <p className='p-1'>This service has been deleted.</p>;
  }

  if (status === MISSION_STATUS.REPORTED.ID) {
    return <p className='p-1'>This service has been reported.</p>;
  }
};

const PayMissionButton = ({ mission, className, variant, size }) => {
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const text =
    mission.status === MISSION_STATUS.CLOSED.ID
      ? 'Start service'
      : 'Pay service';

  // Interceptor
  const handleAttempt = () => {
    mission.status === MISSION_STATUS.CLOSED.ID
      ? // This action needs confirmation
        showAlert({
          title: messages.SERVICE.START_SERVICE_ALERT.TITLE,
          description: messages.SERVICE.START_SERVICE_ALERT.START_DESCRIPTION,
          variant: 'warning',
          confirmText: messages.SERVICE.START_SERVICE_ALERT.CONFIRM_TEXT,
          onConfirm: () => {
            navigate(`/services/${mission.mid}/pay`);
          },
        })
      : navigate(`/services/${mission.mid}/pay`);
  };

  return (
    <Button
      type='button'
      id='payMissionButton'
      onClick={handleAttempt}
      className={className}
      variant={variant}
      size={size}
    >
      {text}
    </Button>
  );
};

const CancelMissionButton = ({ mission, className, variant, size }) => {
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => cancelMission(mission.mid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getMissions'] });
      const wasDeleted = MISSION_STATUS[mission.status].CAN_DELETE;

      if (!wasDeleted) {
        queryClient.invalidateQueries({
          queryKey: ['getMission', String(mission.mid)],
        });
      }

      showAlert({
        title: wasDeleted ? 'Service deleted' : 'Service cancelled',
        description: wasDeleted
          ? 'The service was deleted successfully.'
          : 'The service was cancelled successfully.',
        onConfirm: wasDeleted ? () => navigate('/services/mine') : undefined,
      });
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.SERVICE.CANCEL_SERVICE_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.errors?.general?.[0] ||
          messagesShared.GENERAL.UNEXPECTED_ERROR,
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    showAlert({
      title: messages.SERVICE.CANCEL_SERVICE_ALERT.TITLE,
      description: MISSION_STATUS[mission.status].CAN_DELETE
        ? messages.SERVICE.CANCEL_SERVICE_ALERT.DESCRIPTION_DELETE
        : messages.SERVICE.CANCEL_SERVICE_ALERT.DESCRIPTION_CANCEL,
      variant: 'warning',
      confirmText: messages.SERVICE.CANCEL_SERVICE_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='cancelMissionButton'
      onClick={handleAttempt}
      disabled={isPending}
      className={className}
      variant={variant}
      size={size}
    >
      {'Cancel service'}
    </Button>
  );
};

const ReopenMissionButton = ({ mission, className, variant, size }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => reopenMission(mission.mid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getMissions'] });
      queryClient.invalidateQueries({
        queryKey: ['getMission', String(mission.mid)],
      });
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.SERVICE.REOPEN_SERVICE_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.errors?.general?.[0] ||
          messagesShared.GENERAL.UNEXPECTED_ERROR,
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    showAlert({
      title:
        mission.occupied_vacancies === mission.total_vacancies
          ? messages.SERVICE.REOPEN_SERVICE_ALERT.ERROR_TITLE
          : messages.SERVICE.REOPEN_SERVICE_ALERT.TITLE,
      description:
        mission.occupied_vacancies === mission.total_vacancies
          ? messagesShared.SERVICE.REOPEN.CANNOT_WITHOUT_EMPTY_VACANCIES
          : messages.SERVICE.REOPEN_SERVICE_ALERT.DESCRIPTION,
      variant: 'error',
      confirmText:
        mission.occupied_vacancies === mission.total_vacancies
          ? 'Ok'
          : messages.SERVICE.REOPEN_SERVICE_ALERT.CONFIRM_TEXT,
      onConfirm:
        mission.occupied_vacancies === mission.total_vacancies ? null : mutate,
    });
  };

  return (
    <Button
      type='button'
      id='reopenMissionButton'
      onClick={handleAttempt}
      disabled={isPending}
      className={className}
      variant={variant}
      size={size}
    >
      {'Reopen service'}
    </Button>
  );
};

const FinishMissionButton = ({ mission, className, variant, size }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => finishMission(mission.mid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getMissions'] });
      queryClient.invalidateQueries({
        queryKey: ['getMission', String(mission.mid)],
      });
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.SERVICE.FINISH_SERVICE_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.errors?.general?.[0] ||
          messagesShared.GENERAL.UNEXPECTED_ERROR,
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    showAlert({
      title: messages.SERVICE.FINISH_SERVICE_ALERT.TITLE,
      description: messages.SERVICE.FINISH_SERVICE_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.SERVICE.FINISH_SERVICE_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='finishMissionButton'
      onClick={handleAttempt}
      disabled={isPending}
      className={className}
      variant={variant}
      size={size}
    >
      {'Finish service'}
    </Button>
  );
};

const ReportMissionButton = ({ mission, className, variant, size }) => {
  // Action handling for update email form
  const [state, reportMissionFormAction, isPending] = useActionState(
    reportMissionAction,
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
          id='reportMissionButton'
          type='button'
          disabled={isPending}
          className={className}
          variant={variant}
          size={size}
        >
          <MessageSquareWarning className='w-4 h-4 mr-2' aria-hidden='true' />
          {'Report service'}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-sm max-h-[80vh] overflow-y-auto'>
        <DialogHeader className='pb-3 border-b'>
          <DialogTitle>
            {messages.PUBLIC_PROFILE.REPORT_SERVICE_DIALOG.TITLE}
          </DialogTitle>
          <DialogDescription>
            {messages.PUBLIC_PROFILE.REPORT_SERVICE_DIALOG.DESCRIPTION}
          </DialogDescription>
        </DialogHeader>
        <form
          action={reportMissionFormAction}
          id='reportMissionForm'
          noValidate
        >
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <FormTextareaField
                id='reportMissionMessage'
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
            <input
              type='hidden'
              id='mid'
              name='mid'
              value={mission.mid || ''}
            />
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
          <Button type='submit' disabled={isPending} form='reportMissionForm'>
            {isPending ? 'Reporting...' : 'Report service'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const getParticipationStatusLabel = (status) => {
  if (!status) {
    return messages.SERVICE.SERVICE_JOINED;
  }

  return (
    MISSION_PARTICIPATION_STATUS[status].LABEL ||
    messages.SERVICE.STATUS_LABELS[status] ||
    (status === 'looking_for_adventurers'
      ? messages.SERVICE.STATUS_LABELS.looking_for_collaborators
      : null) ||
    status.replaceAll('_', ' ')
  );
};
