import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getMissionByIdQueryOptions } from './../queries/MissionsQueries';
import { createInvitationMutationOptions } from '../queries/InvitationsQueries';
import { searchUsersByUsernameQueryOptions } from '../queries/UsersQueries';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { timestampToDayMonthYear } from './../utils/date';
import {
  Star,
  Users,
  HandCoins,
  Plus,
  Search,
  User,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthContext } from '../contexts/AuthContext';
import { useCallback, useContext, useRef, useState } from 'react';
import {
  startMission,
  joinMission,
  closeMission,
  unjoinMission,
  cancelMission,
} from '../services/MissionsServices';
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
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { consts } from '@hermyx/shared';
import { Map } from '../components/custom/Map';

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

  let errorMessage = error?.message;
  if (error?.response?.status === 404) {
    errorMessage = 'Oops! This mission does not exist or it has been deleted.';
  }
  console.log(mission);
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
  const isEditable =
    mission?.status !== 'refunding' &&
    mission?.status !== 'refunded' &&
    mission?.status !== 'cancelling' &&
    mission?.status !== 'cancelled' &&
    mission?.status !== 'finished';

  const isCancelable =
    mission?.status === 'opened' ||
    mission?.status === 'pending_payment' ||
    mission?.status === 'in_progress' ||
    mission?.status === 'in_dispute' ||
    mission?.status === 'reopened';

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
                    <span>Difficulty:</span>
                    <span>{mission.difficulty}</span>
                    <Star className='h-6 w-6' aria-hidden='true' />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span>Vacancies:</span>
                    <span>
                      {mission.occupied_vacancies}/{mission.total_vacancies}
                    </span>
                    <Users className='h-6 w-6' aria-hidden='true' />
                  </div>
                  {isCreator && (
                    <div className='flex flex-wrap items-center gap-2 pt-1'>
                      <AddAdventurerButton
                        onClick={() => setIsSearchModalOpen(true)}
                      />
                      {mission.participants?.map((participant) => (
                        <AddedAdventurerBadge
                          key={participant.vacancy_id}
                          participant={participant}
                        />
                      ))}
                    </div>
                  )}
                  <div className='flex items-center gap-2'>
                    <span>Monetary reward:</span>
                    <span>{mission.monetary_reward}$</span>
                    <HandCoins className='h-6 w-6' aria-hidden='true' />
                  </div>
                </div>
                <MissionVacancies
                  mission={mission}
                  isCreator={isCreator}
                  currentUser={currentUser}
                ></MissionVacancies>
                {mission.location && (
                  <Map
                    readOnly={true}
                    initialLocation={{
                      lat: mission.latitude,
                      lng: mission.longitude,
                    }}
                  ></Map>
                )}
              </CardContent>
              <CardFooter>
                <>
                  {isCreator ? (
                    mission.status === 'in_progress' ? (
                      <CloseMissionButton
                        missionId={mission.mid}
                      ></CloseMissionButton>
                    ) : mission.status === 'funded' ? (
                      <StartMissionButton
                        mission={mission}
                      ></StartMissionButton>
                    ) : mission.status === 'pending_payment' ? (
                      <PayMissionButton
                        missionId={mission.mid}
                      ></PayMissionButton>
                    ) : (
                      <p className='text-muted-foreground bg-muted/20'>
                        {messages.MISSION.MISSION_CLOSED}
                      </p>
                    )
                  ) : isFull ? (
                    <p className='text-muted-foreground bg-muted/20'>
                      {messages.MISSION.MISSION_FILLED}
                    </p>
                  ) : (
                    <p className='text-muted-foreground bg-muted/20'>
                      {messages.MISSION.MISSION_OPEN}
                    </p>
                  )}
                  {isCreator && isEditable && (
                    <Button asChild>
                      <Link to={`/missions/${mission.mid}/edit`}>
                        Edit mission
                      </Link>
                    </Button>
                  )}
                  {isCreator && isCancelable && (
                    <CancelMissionButton mission={mission} />
                  )}
                </>
              </CardFooter>
            </section>
          </Card>
          <SearchAdventurerModal
            missionId={mission.mid}
            isOpen={isSearchModalOpen}
            onClose={() => setIsSearchModalOpen(false)}
          />
        </>
      )}
    </>
  );
};

const VacancyCard = ({ vacancy, onClick }) => {
  const isAssigned = !!vacancy.adventurer_id;
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(vacancy.id);
    }
  };
  return (
    <Card
      role='button'
      tabIndex={0}
      className='relative shrink-0 w-50 h-60 flex flex-col p-4 shadow-sm transition-all hover:shadow-lg hover:cursor-pointer focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 group'
      onClick={() => onClick(vacancy.vacancy_id)}
      onKeyDown={handleKeyDown}
    >
      <h3 className='font-semibold text-sm truncate min-h-5 mb-3 text-center mx-8'>
        {vacancy.vacancy_title || 'Adventurer'}
      </h3>

      <div className='flex justify-center mb-4'>
        {isAssigned ? (
          // TODO: avatar del usuario
          <div className='w-16 h-16 rounded-full flex items-center justify-center bg-primary/10 text-primary border-2 border-primary'>
            <User size={24} />
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

      <p className='text-xs line-clamp-3 leading-relaxed grow'>
        {vacancy.vacancy_description || 'No additional description.'}
      </p>
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
  const isAssignedToUser = vacancy.adventurer_id === currentUser.uid;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-md'>
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
            mission.status !== 'in_progress' && (
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
            <VacancyCard vacancy={vac} onClick={handleClickVacancy} />
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

const AddedAdventurerBadge = ({ participant }) => {
  return (
    <Badge
      variant='outline'
      className='gap-2 border-slate-900 bg-slate-900 text-white hover:bg-slate-900'
    >
      <span className='flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full'>
        {participant.avatar ? (
          <img
            src={participant.avatar}
            alt={`${participant.username} avatar`}
            className='h-full w-full object-cover'
          />
        ) : (
          <User className='h-3.5 w-3.5 text-white' aria-hidden='true' />
        )}
      </span>
      <span className='max-w-24 truncate'>{participant.username}</span>
    </Badge>
  );
};

const SearchAdventurerModal = ({ missionId, isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [invitationMessage, setInvitationMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { showAlert } = useAlert();
  const { isPending: isSendingInvitation, mutate: sendInvitation } =
    useMutation(
      createInvitationMutationOptions({
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
    setInvitationMessage('');
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
                            setInvitationMessage('');
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
                htmlFor='invitationMessage'
                className='text-sm font-medium text-slate-900'
              >
                Invitation message
              </label>
              <Textarea
                className='min-h-40 w-full min-w-0 resize-y'
                id='invitationMessage'
                value={invitationMessage}
                onChange={(event) => setInvitationMessage(event.target.value)}
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
                  setInvitationMessage('');
                  setErrorMessage('');
                }}
              >
                Back
              </Button>
              <Button
                type='button'
                onClick={() =>
                  sendInvitation({
                    missionId,
                    receiverId: selectedUser.uid,
                    message: invitationMessage,
                  })
                }
                disabled={isSendingInvitation}
              >
                {isSendingInvitation ? 'Sending...' : 'Send invitation'}
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

const JoinMissionButton = ({ missionId, vacancyId, isJoined }) => {
  const { showAlert } = useAlert();
  const [hasRequestedToJoin, setHasRequestedToJoin] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const joinRequestMessageRef = useRef(null);
  const { isPending, mutate } = useMutation({
    mutationFn: (message) => joinMission(missionId, vacancyId, message),
    onSuccess: () => {
      setHasRequestedToJoin(true);
      setIsJoinDialogOpen(false);
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
              maxLength={consts.INVITATION.MESSAGE_MAX_LENGTH}
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
      console.log(error.response);
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

const StartMissionButton = ({ mission }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => startMission(mission.mid),
    onSuccess: () => {
      queryClient.invalidateQueries(['getMissions']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.MISSION.START_MISSION_ALERT.ERROR_TITLE,
        description: error?.response.data.errors?.general,
      });
    },
  });

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    showAlert({
      title:
        mission.occupied_vacancies === 0
          ? messages.MISSION.START_MISSION_ALERT.ERROR_TITLE
          : messages.MISSION.START_MISSION_ALERT.TITLE,
      description:
        mission.occupied_vacancies === 0
          ? messages.MISSION.START_MISSION_ALERT.NO_ADVENTURERS_DESCRIPTION
          : mission.total_vacancies > mission.occupied_vacancies
            ? messages.MISSION.START_MISSION_ALERT
                .AVAILABLE_VACANCIES_DESCRIPTION
            : messages.MISSION.START_MISSION_ALERT.START_DESCRIPTION,
      variant: mission.occupied_vacancies === 0 ? 'info' : 'warning',
      confirmText:
        mission.occupied_vacancies === 0
          ? 'OK'
          : messages.MISSION.START_MISSION_ALERT.CONFIRM_TEXT,
      onConfirm: mission.occupied_vacancies === 0 ? null : mutate,
    });
  };

  return (
    <Button
      type='button'
      id='closeMissionButton'
      onClick={handleAttempt}
      disabled={isPending}
    >
      {'Start mission'}
    </Button>
  );
};

const CloseMissionButton = ({ missionId }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => closeMission(missionId),
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
    showAlert({
      title: messages.MISSION.CLOSE_MISSION_ALERT.TITLE,
      description: messages.MISSION.CLOSE_MISSION_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.MISSION.CLOSE_MISSION_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
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

const PayMissionButton = ({ missionId }) => {
  const navigate = useNavigate();

  return (
    <Button
      type='button'
      id='payMissionButton'
      onClick={() => {
        navigate(`/missions/${missionId}/pay`);
      }}
    >
      {'Pay mission'}
    </Button>
  );
};

const CancelMissionButton = ({ mission }) => {
  const deleteMission =
    mission.status === 'opened' || mission.status === 'pending_payment';

  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => cancelMission(mission.mid),
    onSuccess: () => {
      queryClient.invalidateQueries(['getMissions']);
    },
    // Backend error handling
    onError: (error) => {
      console.log(error.response);
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
      description: deleteMission
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
