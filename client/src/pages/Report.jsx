import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { REPORT_TYPE } from '@hermyx/shared/utils/reports.utils.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getReportByIdQueryOptions } from '../queries/ReportQueries';
import { timestampToDayMonthYear } from '../utils/date';
import { Button } from '@/components/ui/button';
import { useAlert } from '../contexts/AlertContext';
import { messages } from '../messages/messages';
import { banMission, kickAdventurerOut } from '../services/MissionsServices';
import { REPORT_STATUS } from './../../../shared/utils/reports.utils';
import { banUser } from '../services/UsersServices';
import {
  acceptAdventurersWork,
  dismiss,
  rejectAdventurersWork,
} from '../services/ReportsServices';

export const Report = () => {
  // Report id
  const { id } = useParams();

  // Query options
  const enabledOption = !!id;
  const retryOption = (failureCount, error) => {
    if (error.response?.status === 404) return false; // So Axios won't try to search again the data if there is none
    return failureCount < 3;
  };

  // API call using React Query (if the same query is used in more than one componente it should be isolated)
  const {
    data: report,
    isLoading,
    isError,
    error,
  } = useQuery(
    getReportByIdQueryOptions(id, {
      enabled: enabledOption,
      retry: retryOption,
    }),
  );
  let errorMessage = error?.message;
  if (error?.response?.status === 404) {
    errorMessage = 'Oops! This report does not exist.';
  }
  return (
    <ReportPageContainer
      report={report}
      isLoading={isLoading}
      isError={isError}
      error={errorMessage}
    ></ReportPageContainer>
  );
};

const ReportPageContainer = ({ report, isLoading, isError, error }) => {
  return (
    <main className='p-4'>
      <ReportLoading isLoading={isLoading}>{'Seeking report...'}</ReportLoading>

      <ReportError isError={isError}>{`${error}`}</ReportError>

      <ReportContent report={report}></ReportContent>
    </main>
  );
};

const ReportLoading = ({ isLoading, children }) => {
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

const ReportError = ({ isError, children }) => {
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

const ReportContent = ({ report }) => {
  if (!report) return null;
  console.log(report);
  return (
    <section className='w-full px-6 pt-4 sm:px-8 lg:px-12 xl:px-16'>
      <Card asChild className='justify-between'>
        <article>
          <CardHeader>
            <CardTitle asChild className='text-5xl'>
              <h1>
                {report.type === REPORT_TYPE.REPORT_PROFILE.ID
                  ? `User ${report.payload.associated_user_id}`
                  : report.type === REPORT_TYPE.REPORT_MISSION.ID
                    ? `Mission ${report.payload.associated_mission_id}`
                    : report.type === REPORT_TYPE.REPORT_ADVENTURER.ID ||
                        report.type === REPORT_TYPE.REVIEW_DISPUTE.ID
                      ? `Adventurer of vacancy ${report.payload.associated_vacancy_id} on mission ${report.payload.associated_mission_id}`
                      : `Applicant of mission ${report.payload.associated_mission_id}`}
                {` was reported by ${report.sender_id}`}
              </h1>
            </CardTitle>
            <CardDescription>{`Status: ${report.status}`}</CardDescription>
            <CardAction>
              <p>{timestampToDayMonthYear(report.date)}</p>
            </CardAction>
          </CardHeader>
          <CardContent className='flex flex-1 flex-col'>
            <div className='mb-4'>{report.message}</div>
          </CardContent>
          <CardFooter>
            {report.status === REPORT_STATUS.ANSWERED.ID ? (
              'Report answered'
            ) : report.type === REPORT_TYPE.REPORT_PROFILE.ID ? (
              <>
                <BanUserButton report={report} />
                <DismissButton report={report} />
              </>
            ) : report.type === REPORT_TYPE.REPORT_MISSION.ID ? (
              <>
                <BanMissionButton report={report} />
                <DismissButton report={report} />
              </>
            ) : report.type === REPORT_TYPE.REPORT_ADVENTURER.ID ? (
              <>
                <KickAdventurerOutButton report={report} />
                <DismissButton report={report} />
              </>
            ) : (
              <>
                <AcceptAdventurersWorkButton report={report} />
                <RejectAdventurersWorkButton report={report} />
                {report.type === REPORT_TYPE.REVIEW_DISPUTE.ID && (
                  <KickAdventurerOutButton report={report} />
                )}
              </>
            )}
          </CardFooter>
        </article>
      </Card>
    </section>
  );
};

const BanUserButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => banUser(report.payload.associated_user_id, report.rid),
    onSuccess: () => {
      queryClient.invalidateQueries(['getReport']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.REPORT.BAN_USER_ALERT.ERROR_TITLE,
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
      title: messages.REPORT.BAN_USER_ALERT.TITLE,
      description: messages.REPORT.BAN_USER_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.REPORT.BAN_USER_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='banUserButton'
      onClick={handleAttempt}
      disabled={isPending}
    >
      {'Ban user'}
    </Button>
  );
};

const BanMissionButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () =>
      banMission(report.payload.associated_mission_id, report.rid),
    onSuccess: () => {
      queryClient.invalidateQueries(['getReport']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.REPORT.BAN_MISSION_ALERT.ERROR_TITLE,
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
      title: messages.REPORT.BAN_MISSION_ALERT.TITLE,
      description: messages.REPORT.BAN_MISSION_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.REPORT.BAN_MISSION_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='banMissionButton'
      onClick={handleAttempt}
      disabled={isPending}
    >
      {'Ban mission'}
    </Button>
  );
};

const KickAdventurerOutButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () =>
      kickAdventurerOut(
        report.payload.associated_mission_id,
        report.payload.associated_vacancy_id,
        report.rid,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries(['getReport']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.REPORT.KICK_ADVENTURER_OUT_ALERT.ERROR_TITLE,
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
      title: messages.REPORT.KICK_ADVENTURER_OUT_ALERT.TITLE,
      description: messages.REPORT.KICK_ADVENTURER_OUT_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.REPORT.KICK_ADVENTURER_OUT_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='kickAdventurerOutButton'
      onClick={handleAttempt}
      disabled={isPending}
    >
      {'Kick adventurer out'}
    </Button>
  );
};

const AcceptAdventurersWorkButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => acceptAdventurersWork(report.rid),
    onSuccess: () => {
      queryClient.invalidateQueries(['getReport']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.REPORT.ACCEPT_ADVENTURERS_WORK_ALERT.ERROR_TITLE,
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
      title: messages.REPORT.ACCEPT_ADVENTURERS_WORK_ALERT.TITLE,
      description: messages.REPORT.ACCEPT_ADVENTURERS_WORK_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.REPORT.ACCEPT_ADVENTURERS_WORK_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='acceptAdventurersWorkOutButton'
      onClick={handleAttempt}
      disabled={isPending}
    >
      {`Accept adventurer's work`}
    </Button>
  );
};

const RejectAdventurersWorkButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => rejectAdventurersWork(report.rid),
    onSuccess: () => {
      queryClient.invalidateQueries(['getReport']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.REPORT.REJECT_ADVENTURERS_WORK_ALERT.ERROR_TITLE,
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
      title: messages.REPORT.REJECT_ADVENTURERS_WORK_ALERT.TITLE,
      description: messages.REPORT.REJECT_ADVENTURERS_WORK_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.REPORT.REJECT_ADVENTURERS_WORK_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='rejectAdventurersWorkOutButton'
      onClick={handleAttempt}
      disabled={isPending}
    >
      {`Reject adventurer's work`}
    </Button>
  );
};

const DismissButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: () => dismiss(report.rid),
    onSuccess: () => {
      queryClient.invalidateQueries(['getReport']);
    },
    // Backend error handling
    onError: (error) => {
      showAlert({
        title: messages.REPORT.DISMISS_ALERT.ERROR_TITLE,
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
      title: messages.REPORT.DISMISS_ALERT.TITLE,
      description: messages.REPORT.DISMISS_ALERT.DESCRIPTION,
      variant: 'warning',
      confirmText: messages.REPORT.DISMISS_ALERT.CONFIRM_TEXT,
      onConfirm: mutate,
    });
  };

  return (
    <Button
      type='button'
      id='dismissButton'
      onClick={handleAttempt}
      disabled={isPending}
    >
      {`Dismiss`}
    </Button>
  );
};
