import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { REPORT_DECISION, REPORT_TYPE, REPORT_STATUS } from '@hermyx/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getReportByIdQueryOptions } from '../queries/ReportQueries';
import { timestampToDayMonthYear } from '../utils/date';
import { Button } from '@/components/ui/button';
import { useAlert } from '../contexts/AlertContext';
import { messages } from '../messages/messages';
import { banMission, kickAdventurerOut } from '../services/MissionsServices';
import { banUser } from '../services/UsersServices';
import {
  acceptAdventurersWork,
  dismiss,
  rejectAdventurersWork,
} from '../services/ReportsServices';
import { AnswerReportDialog } from '../components/custom/reports/AnswerReportDialog';
import { truncateText } from '../../../server/src/utils/string.util';

const invalidateResolvedReportQueries = (queryClient, report) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['getReport'] }),
    queryClient.invalidateQueries({ queryKey: ['getReports'] }),
    queryClient.invalidateQueries({ queryKey: ['getMyDisputes'] }),
    queryClient.invalidateQueries({ queryKey: ['getDisputeUnreadCount'] }),
    report.conversation_id
      ? queryClient.invalidateQueries({
          queryKey: ['getConversation'],
        })
      : Promise.resolve(),
  ]);

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
    <>
      {isLoading && (
        <div role='status' className='p-8 text-center text-muted-foreground'>
          {children}
        </div>
      )}
    </>
  );
};

const ReportError = ({ isError, children }) => {
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

const ReportContent = ({ report }) => {
  if (!report) return null;
  const isDispute =
    report.type === REPORT_TYPE.REPORT_ADVENTURER.ID ||
    report.type === REPORT_TYPE.REVIEW_DISPUTE.ID ||
    report.type === REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID;

  const linkClass =
    'user-link relative z-20 font-medium text-primary hover:underline transition-colors';

  const renderUserLink = (username) => {
    if (!username) return null;
    return (
      <Link
        to={`/users/${username}`}
        className={linkClass}
        title={username}
        aria-label={username}
        target='_blank'
        rel='noopener noreferrer'
      >
        {truncateText(username)}
      </Link>
    );
  };

  const renderMissionLink = () => {
    const missionId = report?.payload?.associated_mission_id;
    const title = report?.mission_title;
    if (!missionId) return null;
    return (
      <Link
        to={`/missions/${missionId}`}
        className={linkClass}
        title={title}
        aria-label={title}
        target='_blank'
        rel='noopener noreferrer'
      >
        {truncateText(title)}
      </Link>
    );
  };

  const generateTitle = () => {
    const { type, other_username, sender_username } = report || {};

    const senderLink = renderUserLink(sender_username);
    const otherUserLink = renderUserLink(other_username);
    const missionLink = renderMissionLink();

    switch (type) {
      case REPORT_TYPE.REPORT_ADVENTURER.ID:
        return (
          <>
            Adventurer {otherUserLink} of mission {missionLink} was reported by{' '}
            {senderLink}.
          </>
        );

      case REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID:
        return (
          <>
            Applicant {otherUserLink} of mission {missionLink} was reported by{' '}
            {senderLink}.
          </>
        );

      case REPORT_TYPE.REVIEW_DISPUTE.ID:
        return (
          <>
            Adventurer&lsquo;s {otherUserLink} participation of mission{' '}
            {missionLink} was reported by {senderLink}.
          </>
        );

      case REPORT_TYPE.REPORT_MISSION.ID:
        return (
          <>
            Mission {missionLink} was reported by {senderLink}.
          </>
        );

      default: // REPORT_USER
        return (
          <>
            User {otherUserLink} was reported by {senderLink}.
          </>
        );
    }
  };

  const title = (
    <span className='leading-10 font-normal text-foreground'>
      {generateTitle()}
    </span>
  );
  return (
    <section className='w-full px-6 pt-4 sm:px-8 lg:px-12 xl:px-16'>
      <Card asChild className='justify-between'>
        <article>
          <CardHeader>
            <CardTitle asChild className='text-3xl'>
              <h1>{title}</h1>
            </CardTitle>
            {report.needs_admin_attention && (
              <CardDescription className='font-semibold text-destructive text-lg'>
                Needs admin attention
              </CardDescription>
            )}
            <CardAction>
              <p className='text-lg'>{timestampToDayMonthYear(report.date)}</p>
            </CardAction>
          </CardHeader>
          <CardContent className='flex flex-1 flex-col'>
            <div className='-mt-2 mb-5 wrap-break-words wrap-anywhere text-xl'>
              {report.message}
            </div>

            <div className='mt-auto flex items-center self-end gap-2'>
              <span className='sr-only'>Status:</span>
              <span className='italic text-muted-foreground text-lg'>
                {REPORT_STATUS[report?.status].LABEL}
              </span>
            </div>
          </CardContent>
          <CardFooter className='justify-between'>
            {isDispute && (
              <div>
                <Button asChild variant='outline' size='lg' className='w-fit'>
                  <Link
                    to={`/disputes/${report.rid}`}
                    aria-label='View dispute conversation'
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    View conversation
                  </Link>
                </Button>
              </div>
            )}
            <div className='ml-auto'>
              {report.status === REPORT_STATUS.ANSWERED.ID ? (
                <></>
              ) : report.type === REPORT_TYPE.REPORT_PROFILE.ID ? (
                <div className='flex gap-1'>
                  <BanUserButton report={report} />
                  <DismissButton report={report} />
                </div>
              ) : report.type === REPORT_TYPE.REPORT_MISSION.ID ? (
                <div className='flex gap-1'>
                  <BanMissionButton report={report} />
                  <DismissButton report={report} />
                </div>
              ) : report.type === REPORT_TYPE.REPORT_ADVENTURER.ID ? (
                <div className='flex gap-1'>
                  <KickAdventurerOutButton report={report} />
                  <DismissButton report={report} />
                </div>
              ) : (
                <div className='flex gap-1'>
                  <AcceptAdventurersWorkButton report={report} />
                  <RejectAdventurersWorkButton report={report} />
                  {report.type === REPORT_TYPE.REVIEW_DISPUTE.ID && (
                    <KickAdventurerOutButton report={report} />
                  )}
                </div>
              )}
            </div>
          </CardFooter>
        </article>
      </Card>

      {report.status === REPORT_STATUS.ANSWERED.ID && (
        <Card asChild className='justify-between mt-4'>
          <article>
            <CardHeader>
              <CardTitle asChild className='text-3xl'>
                <h2>
                  Decision taken: {REPORT_DECISION[report.decision].LABEL}
                </h2>
              </CardTitle>
              <CardDescription className='text-lg text-muted-foreground'>
                Resolved by:{' '}
                <Link
                  to={`/users/${report.admin_username}`}
                  className='font-medium hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm'
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {report.admin_username}
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent className='-mt-2 flex flex-1 flex-col'>
              <div className='mb-4 text-xl wrap-break-words'>
                {report.decision_reason}
              </div>
            </CardContent>
          </article>
        </Card>
      )}
    </section>
  );
};

const BanUserButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: (reason) =>
      banUser(report.payload.associated_user_id, report.rid, reason),
    onSuccess: () => {
      void invalidateResolvedReportQueries(queryClient, report);
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.BAN_USER_ALERT.TITLE}
      description={messages.REPORT.BAN_USER_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.BAN_USER_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button size='lg' type='button' id='banUserButton' disabled={isPending}>
        {'Ban user'}
      </Button>
    </AnswerReportDialog>
  );
};

const BanMissionButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: (reason) =>
      banMission(report.payload.associated_mission_id, report.rid, reason),
    onSuccess: () => {
      void invalidateResolvedReportQueries(queryClient, report);
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.BAN_MISSION_ALERT.TITLE}
      description={messages.REPORT.BAN_MISSION_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.BAN_MISSION_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button
        size='lg'
        type='button'
        id='banMissionButton'
        disabled={isPending}
      >
        {'Ban mission'}
      </Button>
    </AnswerReportDialog>
  );
};

const KickAdventurerOutButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: (reason) =>
      kickAdventurerOut(
        report.payload.associated_mission_id,
        report.payload.associated_vacancy_id,
        report.rid,
        reason,
      ),
    onSuccess: () => {
      void invalidateResolvedReportQueries(queryClient, report);
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.KICK_ADVENTURER_OUT_ALERT.TITLE}
      description={messages.REPORT.KICK_ADVENTURER_OUT_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.KICK_ADVENTURER_OUT_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button
        size='lg'
        type='button'
        id='kickAdventurerOutButton'
        disabled={isPending}
      >
        {'Kick adventurer out'}
      </Button>
    </AnswerReportDialog>
  );
};

const AcceptAdventurersWorkButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: (reason) => acceptAdventurersWork(report.rid, reason),
    onSuccess: () => {
      void invalidateResolvedReportQueries(queryClient, report);
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.ACCEPT_ADVENTURERS_WORK_ALERT.TITLE}
      description={messages.REPORT.ACCEPT_ADVENTURERS_WORK_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.ACCEPT_ADVENTURERS_WORK_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button
        size='lg'
        type='button'
        id='acceptAdventurersWorkOutButton'
        disabled={isPending}
      >
        {`Accept adventurer's work`}
      </Button>
    </AnswerReportDialog>
  );
};

const RejectAdventurersWorkButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: (reason) => rejectAdventurersWork(report.rid, reason),
    onSuccess: () => {
      void invalidateResolvedReportQueries(queryClient, report);
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.REJECT_ADVENTURERS_WORK_ALERT.TITLE}
      description={messages.REPORT.REJECT_ADVENTURERS_WORK_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.REJECT_ADVENTURERS_WORK_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button
        size='lg'
        type='button'
        id='rejectAdventurersWorkOutButton'
        disabled={isPending}
      >
        {`Reject adventurer's work`}
      </Button>
    </AnswerReportDialog>
  );
};

const DismissButton = ({ report }) => {
  const { showAlert } = useAlert();
  const queryClient = useQueryClient();
  const { isPending, mutate } = useMutation({
    mutationFn: (reason) => dismiss(report.rid, reason),
    onSuccess: () => {
      void invalidateResolvedReportQueries(queryClient, report);
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.DISMISS_ALERT.TITLE}
      description={messages.REPORT.DISMISS_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.DISMISS_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button size='lg' type='button' id='dismissButton' disabled={isPending}>
        {`Dismiss`}
      </Button>
    </AnswerReportDialog>
  );
};
