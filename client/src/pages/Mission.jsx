import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getMissionByIdQueryOptions,
  inviteToMissionMutationOptions,
} from './../queries/MissionsQueries';
import { searchUsersByUsernameQueryOptions } from '../queries/UsersQueries';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { timestampToDayMonthYear } from './../utils/date';
import {
  Users,
  HandCoins,
  Plus,
  Search,
  Star,
  User,
  UserPlus,
  MessageSquareWarning,
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
} from '../services/MissionsServices';
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
import { consts, messages as messagesShared } from '@hermyx/shared';
import { Map } from '../components/custom/Map';
import {
  MISSION_LIFE_CYCLE,
  VACANCY_LIFE_CYCLE,
} from '@hermyx/shared/utils/missions.utils';
import { reportMissionAction } from '../actions/ReportActions';
import { initialStateUseStateAction } from './../consts/consts';
import { FormTextareaField } from '../components/custom/form/FormTextareaField';
import { FormAlert } from '../components/custom/form/FormAlert';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export const Mission = () => {
  // Mission id
  const { id } = useParams();
  const { currentUser } = useContext(AuthContext);

  // Query options
  const enabledOption = !!id;
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false; // So Axios won't try to search again the data if there is none
    return failureCount < 3;
  };

  // API call using React Query (if the same query is used in more than one componente it should be isolated)
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
  console.log(mission);
  let errorMessage = error?.message;
  if (error?.response?.status === 404) {
    errorMessage = 'Oops! This mission does not exist or it has been deleted.';
  }
  return (
    <MissionPageContainer
      mission={mission}
      currentUser={currentUser}
      isLoading={isLoading}
      isError={isError}
      error={errorMessage}
    ></MissionPageContainer>
  );
};

const MissionPageContainer = ({
  mission,
  currentUser,
  isLoading,
  isError,
  error,
}) => {
  const isCreator = currentUser?.id === mission?.owner_id;
  const isFull = mission?.total_vacancies === mission?.occupied_vacancies;
  return (
    <main className='p-4'>
      <MissionLoading isLoading={isLoading}>
        {'Seeking mission...'}
      </MissionLoading>

      <MissionError isError={isError}>{`${error}`}</MissionError>

      <MissionContent
        mission={mission}
        isCreator={isCreator}
        isFull={isFull}
        currentUser={currentUser}
      ></MissionContent>
    </main>
  );
};

const MissionLoading = ({ isLoading, children }) => {
  return (
    <main>
      {isLoading && (
        <div className='flex justify-center p-8 text-muted-foreground'>
          {children}
        </div>
      )}
    </main>
  );
};

const MissionError = ({ isError, children }) => {
  return (
    <main>
      {isError && (
        <div className='text-center p-8 text-destructive border border-destructive/20 rounded-lg bg-destructive/5'>
          {children}
        </div>
      )}
    </main>
  );
};

const MissionContent = ({ mission, isCreator, isFull, currentUser }) => {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const currentParticipation = mission?.participants?.find(
    (participant) => participant.adventurer_id === currentUser?.id,
  );

  return (
    <>
      {mission && (
        <>
          <Card asChild className='m-4'>
            <section>
              <CardHeader>
                <CardTitle asChild className='text-5xl'>
                  <h1>{mission.title}</h1>
                </CardTitle>
                <CardDescription className='text-xl'>
                  <p>{timestampToDayMonthYear(mission.publication_date)}</p>
                </CardDescription>
              </CardHeader>
              <CardContent className='flex flex-1 flex-col text-lg'>
                <div className='mb-4'>{mission.description}</div>
                <div className='mt-auto flex flex-col gap-2'>
                  <div className='flex items-center gap-2'>
                    <span>Vacancies:</span>
                    <span>
                      {mission.occupied_vacancies}/{mission.total_vacancies}
                    </span>
                    <Users className='h-6 w-6' aria-hidden='true' />
                  </div>
                  <ParticipantSection
                    mission={mission}
                    isCreator={isCreator}
                    onAddAdventurer={() => setIsSearchModalOpen(true)}
                  />
                  <div className='flex items-center gap-2'>
                    <span>Total payment:</span>
                    <span>{Number(mission.total_payment).toFixed(2)}$</span>
                    <HandCoins className='h-6 w-6' aria-hidden='true' />
                  </div>
                  {mission.status}
                </div>
                <MissionVacancies
                  mission={mission}
                  isCreator={isCreator}
                  currentUser={currentUser}
                ></MissionVacancies>
                {mission.location && (
                  <Map
                    readOnly={true}
                    initialLocation={
                      mission?.latitude &&
                      mission?.longitude && {
                        lat: mission?.latitude,
                        lng: mission?.longitude,
                      }
                    }
                  ></Map>
                )}
                {mission.photos && (
                  <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
                    {mission.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={getImageUrl(photo.url)}
                        alt={`Mission ${mission.title} - Photo ${index + 1}`}
                        className='w-full h-48 object-cover rounded-lg shadow-md border border-gray-200'
                      />
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <>
                  {isCreator ? (
                    mission.status === MISSION_LIFE_CYCLE.CLOSED.ID ||
                    mission.waitingForPaymentVacancies.length > 0 ? (
                      <PayMissionButton mission={mission}></PayMissionButton>
                    ) : mission.status === MISSION_LIFE_CYCLE.IN_PROGRESS.ID ? (
                      <MissionOwnerStatusMessage status={mission.status} />
                    ) : (
                      <p className='text-muted-foreground bg-muted/20'>
                        {messages.MISSION.MISSION_CLOSED}
                      </p>
                    )
                  ) : mission.status === MISSION_LIFE_CYCLE.IN_PROGRESS.ID &&
                    currentParticipation ? (
                    <SubmitParticipationButton
                      missionId={mission.mid}
                      participationStatus={currentParticipation.status}
                    />
                  ) : isFull ? (
                    <p className='text-muted-foreground bg-muted/20'>
                      {messages.MISSION.MISSION_FILLED}
                    </p>
                  ) : (
                    <p className='text-muted-foreground bg-muted/20'>
                      {messages.MISSION.MISSION_OPEN}
                    </p>
                  )}
                  {isCreator &&
                    (mission.status === MISSION_LIFE_CYCLE.OPENED.ID ||
                      mission.status === MISSION_LIFE_CYCLE.REOPENED.ID) && (
                      <CloseMissionButton
                        mission={mission}
                      ></CloseMissionButton>
                    )}
                  {isCreator && MISSION_LIFE_CYCLE[mission.status].CAN_EDIT && (
                    <Button asChild>
                      <Link to={`/missions/${mission.mid}/edit`}>
                        Edit mission
                      </Link>
                    </Button>
                  )}
                  {isCreator &&
                    (MISSION_LIFE_CYCLE[mission.status].CAN_DELETE ||
                      MISSION_LIFE_CYCLE[mission.status].CAN_CANCEL) && (
                      <CancelMissionButton mission={mission} />
                    )}
                  {isCreator &&
                    MISSION_LIFE_CYCLE[
                      mission.status
                    ].VALID_NEXT_STATES.includes(
                      MISSION_LIFE_CYCLE.REOPENED.ID,
                    ) && <ReopenMissionButton mission={mission} />}
                  {isCreator &&
                    mission.canFinish &&
                    mission.status !== MISSION_LIFE_CYCLE.FINISHED.ID && (
                      <FinishMissionButton mission={mission} />
                    )}
                  {!isCreator &&
                    mission.status !== MISSION_LIFE_CYCLE.REPORTED.ID && (
                      <ReportMissionButton mission={mission} />
                    )}
                </>
              </CardFooter>
            </section>
          </Card>
          <SearchAdventurerModal
            missionId={mission.mid}
            vacancies={(mission.participants || []).filter(
              (vacancy) => !vacancy.adventurer_id,
            )}
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
          />
        </>
      )}
    </>
  );
};

const canReviewParticipant = (participant) => {
  return (
    !!participant.adventurer_id &&
    [
      VACANCY_LIFE_CYCLE.ACCEPTED.ID,
      VACANCY_LIFE_CYCLE.IN_DISPUTE.ID,
      VACANCY_LIFE_CYCLE.RELEASED.ID,
    ].includes(participant.status)
  );
};

const VacancyCard = ({ mission, vacancy, isCreator, currentUser, onClick }) => {
  const isAssigned = !!vacancy.adventurer_id;
  const [reviewDialogType, setReviewDialogType] = useState(null);
  const isAssignedToUser = vacancy.adventurer_id === currentUser?.id;
  const canReviewAdventurer = isCreator && canReviewParticipant(vacancy);
  const canReviewOwner = isAssignedToUser && canReviewParticipant(vacancy);
  const hasOwnerReview = !!vacancy.owner_review_id;
  const hasAdventurerReview = !!vacancy.adventurer_review_id;

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
      <h3 className='font-semibold text-sm truncate min-h-5 mb-3 text-center mx-8'>
        {vacancy.vacancy_title || 'Adventurer'}
      </h3>

      <div className='flex justify-center mb-4'>
        {isAssigned ? (
          <div className='w-16 h-16 rounded-full flex items-center justify-center bg-primary/10 text-primary border-2 border-primary'>
            <Avatar size='md' className='h-full w-full'>
              <AvatarImage
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${vacancy.avatar}`}
                alt={`${vacancy.username} avatar`}
                className='h-full w-full object-cover'
              />
              <AvatarFallback>
                <User className='h-12 w-12 text-muted-foreground' />
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <div className='w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed border-slate-300 text-slate-400'>
            <UserPlus size={24} />
          </div>
        )}
      </div>

      <div className='flex justify-between items-center text-xs font-medium mb-2'>
        <span
          className={`truncate w-2/3 ${isAssigned ? 'text-primary font-bold' : 'italic '}`}
        >
          {isAssigned ? vacancy.username : 'Unassigned'}
        </span>
        <span className='w-1/3 text-right text-primary font-bold text-sm'>
          {vacancy.reward}€
        </span>
      </div>

      <p className='text-xs line-clamp-2 leading-relaxed'>
        {vacancy.vacancy_description || 'No additional description.'}
      </p>
      <div className='mt-4'>
        {hasOwnerReview ? (
          <div className='inline-flex w-full items-center justify-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-sm font-medium text-amber-700'>
            <Star className='h-4 w-4 fill-amber-400 text-amber-400' />
            {Number(vacancy.owner_review_rating).toFixed(1)}
          </div>
        ) : (
          canReviewAdventurer && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='w-full'
              onClick={(event) => handleReviewClick(event, 'adventurer')}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Star className='h-4 w-4' aria-hidden='true' />
              Review adventurer
            </Button>
          )
        )}
        {canReviewOwner &&
          (hasAdventurerReview ? (
            <div className='mt-2 inline-flex w-full items-center justify-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-sm font-medium text-amber-700'>
              <Star className='h-4 w-4 fill-amber-400 text-amber-400' />
              {Number(vacancy.adventurer_review_rating).toFixed(1)}
            </div>
          ) : (
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='mt-2 w-full'
              onClick={(event) => handleReviewClick(event, 'owner')}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Star className='h-4 w-4' aria-hidden='true' />
              Review owner
            </Button>
          ))}
      </div>
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
  if (!vacancy) return null;

  const isAssigned = !!vacancy.adventurer_id;
  const isAssignedToUser = vacancy.adventurer_id === currentUser?.id;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className='sm:max-w-md'
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className='text-xl'>
            {vacancy.vacancy_title || 'Adventurer needed'}
          </DialogTitle>
          <DialogDescription>
            Vacancy details can be seen below.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <h4 className='text-sm font-semibold'>Monetary reward</h4>
            <div className='flex justify-between items-center p-3 rounded-lg border'>
              <span className='text-sm font-bold text-primary'>
                {vacancy.reward}€
              </span>
            </div>
          </div>

          <div className='space-y-2'>
            <h4 className='text-sm font-semibold'>Vacancy description</h4>
            <p className='text-sm leading-relaxed p-3 rounded-lg border'>
              {vacancy.vacancy_description || 'No additional description.'}
            </p>
          </div>

          <div className='space-y-2'>
            <h4 className='text-sm font-semibold'>Current state</h4>
            {isAssigned ? (
              <div className='flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm'>
                <User size={16} />
                <span>
                  Assigned to{' '}
                  <strong>
                    {vacancy.adventurer_id === currentUser?.id
                      ? 'you!'
                      : vacancy.username}
                  </strong>
                </span>
              </div>
            ) : (
              <div className='p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium'>
                This vacancy is open and seeking for an adventurer!
              </div>
            )}
          </div>
        </div>

        <DialogFooter className='sm:justify-end gap-2'>
          <Button variant='outline' onClick={onClose}>
            Close
          </Button>

          {!isCreator && !isAssigned && (
            <JoinMissionButton
              missionId={mission.mid}
              vacancyId={vacancy.vacancy_id}
              isJoined={mission.is_joined}
            />
          )}

          {!isCreator &&
            isAssignedToUser &&
            mission.status !== MISSION_LIFE_CYCLE.IN_PROGRESS.ID && (
              <UnjoinMissionButton
                missionId={mission.mid}
                vacancyId={vacancy.vacancy_id}
              />
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MissionVacancies = ({ mission, isCreator, currentUser }) => {
  const [selectedVacancyId, setSelectedVacancyId] = useState(null);

  const handleClickVacancy = useCallback((id) => {
    setSelectedVacancyId(id);
  }, []);

  const selectedVacancy = mission.participants.find(
    (v) => v.vacancy_id === selectedVacancyId,
  );

  return (
    <div className='w-full space-y-2'>
      <h3 className='font-semibold text-lg'>Mission vacancies</h3>

      <div className='flex overflow-x-auto gap-4 p-2 snap-x snap-mandatory hide-scrollbar items-center'>
        {mission.participants.map((vac) => (
          <div key={vac.vacancy_id} className='snap-start'>
            <VacancyCard
              mission={mission}
              vacancy={vac}
              isCreator={isCreator}
              currentUser={currentUser}
              onClick={handleClickVacancy}
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
    </div>
  );
};

const AddAdventurerButton = ({ onClick }) => {
  return (
    <Button type='button' onClick={onClick}>
      <Plus className='h-4 w-4' aria-hidden='true' />
      Add adventurer
    </Button>
  );
};

const ParticipantSection = ({ mission, isCreator, onAddAdventurer }) => {
  if (!isCreator) {
    return null;
  }

  return (
    <div className='flex flex-wrap items-center gap-2 pt-1'>
      {isCreator &&
        MISSION_LIFE_CYCLE[mission.status].CAN_ACCEPT_ADVENTURERS && (
          <AddAdventurerButton onClick={onAddAdventurer} />
        )}
      {(mission.participants || []).map((participant) => (
        <ParticipantRow
          key={participant.vacancy_id}
          participant={participant}
        />
      ))}
    </div>
  );
};

const ParticipantRow = ({ participant }) => {
  return (
    <div className='flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm'>
      <div className='inline-flex max-w-full items-center gap-2 rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-white'>
        <span className='flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full'>
          {participant.avatar ? (
            <img
              src={participant.avatar}
              alt={`${participant.username} avatar`}
              className='h-full w-full object-cover'
            />
          ) : (
            <User className='h-3.5 w-3.5' aria-hidden='true' />
          )}
        </span>
        <span className='max-w-24 truncate text-sm font-medium'>
          {participant.username}
        </span>
        <span className='rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/90'>
          {getParticipationStatusLabel(participant.status)}
        </span>
      </div>
    </div>
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
      reviewAdventurer(mission.mid, participant.adventurer_id, {
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
        title: messages.MISSION.REVIEW_ADVENTURER_ALERT.SUCCESS_TITLE,
        description:
          messages.MISSION.REVIEW_ADVENTURER_ALERT.SUCCESS_DESCRIPTION,
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
          messages.MISSION.REVIEW_ADVENTURER_ALERT.ERROR_TITLE,
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

    if (comment.length > consts.MISSION.REVIEW.COMMENT_MAX_LENGTH) {
      setErrorMessage(
        `Comment must be shorter than ${consts.MISSION.REVIEW.COMMENT_MAX_LENGTH} characters.`,
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
        <DialogHeader>
          <DialogTitle>Review {participant.username}</DialogTitle>
          <DialogDescription>
            This review will be linked to this completed mission.
          </DialogDescription>
        </DialogHeader>

        <form id='reviewAdventurerForm' onSubmit={handleSubmit}>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <label htmlFor='adventurerRating' className='text-sm font-medium'>
                Rating
              </label>
              <Input
                id='adventurerRating'
                type='number'
                min={consts.MISSION.REVIEW.RATING_MIN}
                max={consts.MISSION.REVIEW.RATING_MAX}
                step={consts.MISSION.REVIEW.RATING_STEP}
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
                maxLength={consts.MISSION.REVIEW.COMMENT_MAX_LENGTH}
                onChange={(event) => setComment(event.target.value)}
                rows={5}
              />
              <p className='text-xs text-muted-foreground'>
                {comment.length}/{consts.MISSION.REVIEW.COMMENT_MAX_LENGTH}
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
        title: messages.MISSION.REVIEW_ADVENTURER_ALERT.SUCCESS_TITLE,
        description:
          messages.MISSION.REVIEW_ADVENTURER_ALERT.SUCCESS_DESCRIPTION,
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
          messages.MISSION.REVIEW_ADVENTURER_ALERT.ERROR_TITLE,
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

    if (comment.length > consts.MISSION.REVIEW.COMMENT_MAX_LENGTH) {
      setErrorMessage(
        `Comment must be shorter than ${consts.MISSION.REVIEW.COMMENT_MAX_LENGTH} characters.`,
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
        <DialogHeader>
          <DialogTitle>Review mission owner</DialogTitle>
          <DialogDescription>
            This review will be linked to this completed mission.
          </DialogDescription>
        </DialogHeader>

        <form id='reviewOwnerForm' onSubmit={handleSubmit}>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <label htmlFor='ownerRating' className='text-sm font-medium'>
                Rating
              </label>
              <Input
                id='ownerRating'
                type='number'
                min={consts.MISSION.REVIEW.RATING_MIN}
                max={consts.MISSION.REVIEW.RATING_MAX}
                step={consts.MISSION.REVIEW.RATING_STEP}
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
                maxLength={consts.MISSION.REVIEW.COMMENT_MAX_LENGTH}
                onChange={(event) => setComment(event.target.value)}
                rows={5}
              />
              <p className='text-xs text-muted-foreground'>
                {comment.length}/{consts.MISSION.REVIEW.COMMENT_MAX_LENGTH}
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
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedVacancyId, setSelectedVacancyId] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { showAlert } = useAlert();
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
          setErrorMessage(
            error?.response?.data?.error || 'Could not send invitation.',
          );
        },
      }),
    );

  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      setFoundUsers([]);
      setErrorMessage('Write a username to search for an adventurer.');
      return;
    }

    setIsSearching(true);
    setErrorMessage('');

    try {
      const users = await queryClient.fetchQuery(
        searchUsersByUsernameQueryOptions(trimmedUsername),
      );
      setFoundUsers(users);
      if (users.length === 0) {
        setErrorMessage('No adventurer found with that username.');
      }
    } catch (error) {
      setFoundUsers([]);
      setErrorMessage(
        error?.response?.data?.error ||
          'No adventurer found with that username.',
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setFoundUsers([]);
    setSelectedUser(null);
    setSelectedVacancyId('');
    setNotificationMessage('');
    setErrorMessage('');
    setIsSearching(false);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className='w-[min(92vw,42rem)] max-w-2xl'>
        <AlertDialogHeader>
          <AlertDialogTitle>Search adventurer</AlertDialogTitle>
          <AlertDialogDescription>
            Find the adventurer by username before sending the invitation.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className='min-w-0'>
          {!selectedUser ? (
            <form onSubmit={handleSearch} className='flex flex-col gap-4'>
              <label
                htmlFor='searchAdventurerByUsername'
                className='text-sm font-medium text-slate-900'
              >
                Adventurer username
              </label>
              <div className='flex gap-3'>
                <Input
                  id='searchAdventurerByUsername'
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder='Search by username'
                  autoComplete='off'
                />
                <Button type='submit' disabled={isSearching}>
                  <Search className='h-4 w-4' aria-hidden='true' />
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>

              {errorMessage && (
                <p className='rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
                  {errorMessage}
                </p>
              )}

              {foundUsers.length > 0 && (
                <div className='flex flex-col gap-3'>
                  {foundUsers.map((foundUser) => (
                    <div
                      key={foundUser.uid}
                      className='rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4'
                    >
                      <div className='flex items-center justify-between gap-4'>
                        <div className='flex min-w-0 items-center gap-3'>
                          <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                            <User className='h-5 w-5' aria-hidden='true' />
                          </span>
                          <div className='min-w-0'>
                            <p className='truncate text-base font-semibold text-slate-900'>
                              {foundUser.username}
                            </p>
                            <p className='truncate text-sm text-slate-500'>
                              {foundUser.email ||
                                'User found and ready to invite.'}
                            </p>
                          </div>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => {
                            setSelectedUser(foundUser);
                            setNotificationMessage('');
                            setErrorMessage('');
                          }}
                        >
                          Invite
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
          ) : (
            <div className='flex flex-col gap-4'>
              <div className='min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4'>
                <div className='flex items-center gap-3'>
                  <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                    <User className='h-5 w-5' aria-hidden='true' />
                  </span>
                  <div className='min-w-0'>
                    <p className='truncate text-base font-semibold text-slate-900'>
                      {selectedUser.username}
                    </p>
                    <p className='truncate text-sm text-slate-500'>
                      {selectedUser.email || 'Selected adventurer'}
                    </p>
                  </div>
                </div>
              </div>

              <label
                htmlFor='invitationVacancy'
                className='text-sm font-medium text-slate-900'
              >
                Vacancy
              </label>
              <select
                id='invitationVacancy'
                value={selectedVacancyId}
                onChange={(event) => {
                  setSelectedVacancyId(event.target.value);
                  setErrorMessage('');
                }}
                className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm'
              >
                <option value=''>Select a vacancy</option>
                {vacancies.map((vacancy) => (
                  <option key={vacancy.vacancy_id} value={vacancy.vacancy_id}>
                    {vacancy.vacancy_title || 'Untitled vacancy'} -{' '}
                    {vacancy.reward} EUR
                  </option>
                ))}
              </select>

              <label
                htmlFor='notificationMessage'
                className='text-sm font-medium text-slate-900'
              >
                Invitation message
              </label>
              <Textarea
                className='min-h-40 w-full min-w-0 resize-y'
                id='notificationMessage'
                value={notificationMessage}
                onChange={(event) => setNotificationMessage(event.target.value)}
                placeholder='Write a short message for the adventurer'
                rows={5}
              />

              {errorMessage && (
                <p className='rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
                  {errorMessage}
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
                  setErrorMessage('');
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
                    : setErrorMessage('Select a vacancy before inviting.')
                }
                disabled={isSendingNotification || vacancies.length === 0}
              >
                {isSendingNotification ? 'Sending...' : 'Send invitation'}
              </Button>
            </>
          ) : (
            <Button type='button' variant='ghost' onClick={handleClose}>
              Close
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const JoinMissionButton = ({
  missionId,
  vacancyId,
  isJoined,
  hasPendingJoinRequest = false,
}) => {
  const { showAlert } = useAlert();
  const [hasRequestedToJoin, setHasRequestedToJoin] = useState(
    hasPendingJoinRequest,
  );
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const joinRequestMessageRef = useRef(null);
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: (message) => joinMission(missionId, vacancyId, message),
    onSuccess: () => {
      setHasRequestedToJoin(true);
      setIsJoinDialogOpen(false);
      queryClient.invalidateQueries({
        queryKey: ['getMission', String(missionId)],
      });
      queryClient.invalidateQueries({
        queryKey: ['getMission', missionId],
      });
      if (joinRequestMessageRef.current) {
        joinRequestMessageRef.current.value = '';
      }
      showAlert({
        title: 'Request sent',
        description:
          'The mission owner received your request. You will join the mission only if they accept it.',
      });
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.MISSION.JOIN_MISSION_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.error ||
          error?.response?.data?.errors?.general?.[0],
      });
    },
  });

  let buttonText = 'Join mission';
  let isDisabled = false;

  if (isJoined) {
    buttonText = 'Joined mission';
    isDisabled = true;
  } else if (hasRequestedToJoin) {
    buttonText = 'Request sent';
    isDisabled = true;
  } else if (isPending) {
    buttonText = 'Sending request...';
    isDisabled = true;
  }

  // Interceptor
  const handleAttempt = () => {
    setIsJoinDialogOpen(true);
  };

  return (
    <>
      <Button
        type='button'
        id='joinMissionButton'
        onClick={handleAttempt}
        disabled={isDisabled || isPending}
      >
        {buttonText}
      </Button>

      <AlertDialog
        open={isJoinDialogOpen}
        onOpenChange={(open) => {
          setIsJoinDialogOpen(open);
          if (!open && joinRequestMessageRef.current) {
            joinRequestMessageRef.current.value = '';
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {messages.MISSION.JOIN_MISSION_ALERT.TITLE}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div>
            <label htmlFor='joinMissionMessage'>
              Message for the mission owner
            </label>
            <Textarea
              id='joinMissionMessage'
              ref={joinRequestMessageRef}
              placeholder='Write a short message explaining why you want to join'
              maxLength={consts.NOTIFICATION.MESSAGE_MAX_LENGTH}
              rows={5}
            />
          </div>

          <AlertDialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setIsJoinDialogOpen(false);
                if (joinRequestMessageRef.current) {
                  joinRequestMessageRef.current.value = '';
                }
              }}
            >
              Cancel
            </Button>
            <Button
              type='button'
              onClick={() => mutate(joinRequestMessageRef.current?.value || '')}
              disabled={isPending}
            >
              {messages.MISSION.JOIN_MISSION_ALERT.CONFIRM_TEXT}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const UnjoinMissionButton = ({ missionId, vacancyId }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => unjoinMission(missionId, vacancyId),
    onSuccess: () => {
      queryClient.invalidateQueries(['getMissions']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.MISSION.UNJOIN_MISSION_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.error ||
          error?.response?.data?.errors?.general?.[0],
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    showAlert({
      title: messages.MISSION.UNJOIN_MISSION_ALERT.TITLE,
      description: messages.MISSION.UNJOIN_MISSION_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.MISSION.UNJOIN_MISSION_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='unjoinMissionButton'
      onClick={handleAttempt}
      disabled={isPending}
    >
      {'Unjoin mission'}
    </Button>
  );
};

const CloseMissionButton = ({ mission }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => closeMission(mission.mid),
    onSuccess: () => {
      queryClient.invalidateQueries(['getMissions']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.MISSION.CLOSE_MISSION_ALERT.ERROR_TITLE,
        description: error?.response.data.errors?.general,
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    if (mission.status === MISSION_LIFE_CYCLE.REOPENED.ID) {
      showAlert({
        title: messages.MISSION.CLOSE_MISSION_ALERT.TITLE,
        description:
          messages.MISSION.CLOSE_MISSION_ALERT.NO_NEW_ADVENTURERS_AFTER_REOPEN,
        confirmText: messages.MISSION.CLOSE_MISSION_ALERT.CONFIRM_TEXT,
        onConfirm: mutate,
      });
    } else {
      showAlert({
        title:
          mission.occupied_vacancies === 0
            ? messages.MISSION.CLOSE_MISSION_ALERT.ERROR_TITLE
            : messages.MISSION.CLOSE_MISSION_ALERT.TITLE,
        description:
          mission.occupied_vacancies === 0
            ? messages.MISSION.CLOSE_MISSION_ALERT.NO_ADVENTURERS_DESCRIPTION
            : mission.total_vacancies > mission.occupied_vacancies
              ? messages.MISSION.CLOSE_MISSION_ALERT
                  .AVAILABLE_VACANCIES_DESCRIPTION
              : messages.MISSION.CLOSE_MISSION_ALERT.START_DESCRIPTION,
        variant: mission.occupied_vacancies === 0 ? 'info' : 'warning',
        confirmText:
          mission.occupied_vacancies === 0
            ? 'Ok'
            : messages.MISSION.CLOSE_MISSION_ALERT.CONFIRM_TEXT,
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
    >
      {'Close mission'}
    </Button>
  );
};

const SubmitParticipationButton = ({ missionId, participationStatus }) => {
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
        title: messages.MISSION.SUBMIT_PARTICIPATION_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.error ||
          error?.response?.data?.errors?.general?.[0],
      });
    },
  });

  const handleAttempt = () => {
    showAlert({
      title: messages.MISSION.SUBMIT_PARTICIPATION_ALERT.TITLE,
      description: messages.MISSION.SUBMIT_PARTICIPATION_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.MISSION.SUBMIT_PARTICIPATION_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  const isSubmitted =
    participationStatus &&
    participationStatus !== VACANCY_LIFE_CYCLE.IN_PROGRESS.ID;
  const buttonLabel =
    participationStatus &&
    participationStatus !== VACANCY_LIFE_CYCLE.IN_PROGRESS.ID
      ? getParticipationStatusLabel(participationStatus)
      : 'Submit my part';

  return (
    <Button
      type='button'
      id='submitParticipationButton'
      onClick={handleAttempt}
      disabled={isPending || isSubmitted}
    >
      {buttonLabel}
    </Button>
  );
};

const MissionOwnerStatusMessage = ({ status }) => {
  if (status === MISSION_LIFE_CYCLE.IN_PROGRESS.ID) {
    return (
      <p className='text-muted-foreground bg-muted/20'>
        Waiting for adventurers to submit their participation.
      </p>
    );
  }

  if (status === 'in_dispute') {
    return (
      <p className='text-muted-foreground bg-muted/20'>
        {messages.MISSION.MISSION_IN_DISPUTE}
      </p>
    );
  }

  return (
    <p className='text-muted-foreground bg-muted/20'>
      {messages.MISSION.MISSION_CLOSED}
    </p>
  );
};

const PayMissionButton = ({ mission }) => {
  const { showAlert } = useAlert();
  const navigate = useNavigate();
  const text =
    mission.status === MISSION_LIFE_CYCLE.CLOSED.ID
      ? 'Start mission'
      : 'Pay mission';

  // Interceptor
  const handleAttempt = () => {
    mission.status === MISSION_LIFE_CYCLE.CLOSED.ID
      ? // This action needs confirmation
        showAlert({
          title: messages.MISSION.START_MISSION_ALERT.TITLE,
          description: messages.MISSION.START_MISSION_ALERT.START_DESCRIPTION,
          variant: 'warning',
          confirmText: messages.MISSION.START_MISSION_ALERT.CONFIRM_TEXT,
          onConfirm: () => {
            navigate(`/missions/${mission.mid}/pay`);
          },
        })
      : navigate(`/missions/${mission.mid}/pay`);
  };

  return (
    <Button type='button' id='payMissionButton' onClick={handleAttempt}>
      {text}
    </Button>
  );
};

const CancelMissionButton = ({ mission }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => cancelMission(mission.mid),
    onSuccess: () => {
      queryClient.invalidateQueries(['getMissions']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.MISSION.CANCEL_MISSION_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.error ||
          error?.response?.data?.errors?.general?.[0],
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    showAlert({
      title: messages.MISSION.CANCEL_MISSION_ALERT.TITLE,
      description: MISSION_LIFE_CYCLE[mission.status].CAN_DELETE
        ? messages.MISSION.CANCEL_MISSION_ALERT.DESCRIPTION_DELETE
        : messages.MISSION.CANCEL_MISSION_ALERT.DESCRIPTION_CANCEL,
      variant: 'warning',
      confirmText: messages.MISSION.CANCEL_MISSION_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='cancelMissionButton'
      onClick={handleAttempt}
      disabled={isPending}
    >
      {'Cancel mission'}
    </Button>
  );
};

const ReopenMissionButton = ({ mission }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => reopenMission(mission.mid),
    onSuccess: () => {
      queryClient.invalidateQueries(['getMissions']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.MISSION.REOPEN_MISSION_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.error ||
          error?.response?.data?.errors?.general?.[0],
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    showAlert({
      title:
        mission.occupied_vacancies === mission.total_vacancies
          ? messages.MISSION.REOPEN_MISSION_ALERT.ERROR_TITLE
          : messages.MISSION.REOPEN_MISSION_ALERT.TITLE,
      description:
        mission.occupied_vacancies === mission.total_vacancies
          ? messagesShared.CANNOT_REOPEN_MISSION_WITHOUT_EMPTY_VACANCIES
          : messages.MISSION.REOPEN_MISSION_ALERT.DESCRIPTION,
      variant: 'error',
      confirmText:
        mission.occupied_vacancies === mission.total_vacancies
          ? 'Ok'
          : messages.MISSION.REOPEN_MISSION_ALERT.CONFIRM_TEXT,
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
    >
      {'Reopen mission'}
    </Button>
  );
};

const FinishMissionButton = ({ mission }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => finishMission(mission.mid),
    onSuccess: () => {
      queryClient.invalidateQueries(['getMissions']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.MISSION.FINISH_MISSION_ALERT.ERROR_TITLE,
        description:
          error?.response?.data?.error ||
          error?.response?.data?.errors?.general?.[0],
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    showAlert({
      title: messages.MISSION.FINISH_MISSION_ALERT.TITLE,
      description: messages.MISSION.FINISH_MISSION_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.MISSION.FINISH_MISSION_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='finishMissionButton'
      onClick={handleAttempt}
      disabled={isPending}
    >
      {'Finish mission'}
    </Button>
  );
};

const ReportMissionButton = ({ mission }) => {
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
          variant='destructive'
          type='button'
          disabled={isPending}
          className='me-2'
        >
          <MessageSquareWarning className='w-4 h-4 mr-2' aria-hidden='true' />
          {'Report mission'}
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
            {isPending ? 'Reporting...' : 'Report mission'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const getParticipationStatusLabel = (status) => {
  if (!status) {
    return messages.MISSION.MISSION_JOINED;
  }

  return messages.MISSION.STATUS_LABELS[status] || status.replaceAll('_', ' ');
};

const getImageUrl = (photoPath) => {
  if (photoPath.startsWith('http')) return photoPath;
  // Adjusts "/uploads/" so it calls the actual backend
  return `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${photoPath}`;
};
