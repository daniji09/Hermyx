import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { getMissionByIdQueryOptions } from './../queries/MissionsQueries';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { timestampToDayMonthYear } from './../utils/date';
import { Star, Users, HandCoins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthContext } from '../contexts/AuthContext';
import { useContext } from 'react';
import {
  startMission,
  joinMission,
  closeMission,
} from '../services/MissionsServices';
import { messages } from '../messages/messages';
import { useAlert } from '../contexts/AlertContext';

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

const MissionContent = ({ mission, isCreator, isFull }) => {
  return (
    <>
      {mission && (
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
                <div className='flex items-center gap-2'>
                  <span>Monetary reward:</span>
                  <span>{mission.monetary_reward}$</span>
                  <HandCoins className='h-6 w-6' aria-hidden='true' />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {isCreator ? (
                mission.status === 'in_progress' ? (
                  <CloseMissionButton
                    missionId={mission.mid}
                  ></CloseMissionButton>
                ) : mission.status === 'funded' ? (
                  <StartMissionButton mission={mission}></StartMissionButton>
                ) : mission.status === 'pending_payment' ? (
                  <PayMissionButton missionId={mission.mid}></PayMissionButton>
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
                <JoinMissionButton
                  missionId={mission.mid}
                  isJoined={mission.is_joined}
                />
              )}
            </CardFooter>
          </section>
        </Card>
      )}
    </>
  );
};

const JoinMissionButton = ({ missionId, isJoined }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => joinMission(missionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['getMissions']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.MISSION.JOIN_MISSION_ALERT.ERROR_TITLE,
        description: error?.response.data.errors?.general,
      });
    },
  });

  let buttonText = 'Join mission';
  let isDisabled = false;

  if (isJoined) {
    buttonText = 'Joined mission';
    isDisabled = true;
  } else if (isPending) {
    buttonText = 'Joining...';
    isDisabled = true;
  }

  // Interceptor
  const handleAttempt = () => {
    // This action needs confirmation
    showAlert({
      title: messages.MISSION.JOIN_MISSION_ALERT.TITLE,
      description: messages.MISSION.JOIN_MISSION_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.MISSION.JOIN_MISSION_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='joinMissionButton'
      onClick={handleAttempt}
      disabled={isDisabled || isPending}
    >
      {buttonText}
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
