import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useActionState, useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  REPORT_DECISION,
  REPORT_TYPE,
  REPORT_STATUS,
  consts,
} from '@hermyx/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
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
import { FormTextareaField } from '../components/custom/form/FormTextareaField';
import { FormAlert } from '../components/custom/form/FormAlert';
import { answerReportAction } from '../actions/ReportActions';
import { initialStateUseStateAction } from '../consts/consts';

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
      {report.status === REPORT_STATUS.ANSWERED.ID && (
        <Card asChild className='justify-between'>
          <article>
            <CardHeader>
              <CardTitle asChild className='text-5xl'>
                <h1>
                  {`Decision taken: ${REPORT_DECISION[report.decision].LABEL}`}
                </h1>
              </CardTitle>
              <CardDescription>{`Resolved by: ${report.resolved_by}`}</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-1 flex-col'>
              <div className='mb-4'>{report.decision_reason}</div>
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.BAN_USER_ALERT.TITLE}
      description={messages.REPORT.BAN_USER_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.BAN_USER_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button type='button' id='banUserButton' disabled={isPending}>
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.BAN_MISSION_ALERT.TITLE}
      description={messages.REPORT.BAN_MISSION_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.BAN_MISSION_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button type='button' id='banMissionButton' disabled={isPending}>
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.KICK_ADVENTURER_OUT_ALERT.TITLE}
      description={messages.REPORT.KICK_ADVENTURER_OUT_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.KICK_ADVENTURER_OUT_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button type='button' id='kickAdventurerOutButton' disabled={isPending}>
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.ACCEPT_ADVENTURERS_WORK_ALERT.TITLE}
      description={messages.REPORT.ACCEPT_ADVENTURERS_WORK_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.ACCEPT_ADVENTURERS_WORK_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.REJECT_ADVENTURERS_WORK_ALERT.TITLE}
      description={messages.REPORT.REJECT_ADVENTURERS_WORK_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.REJECT_ADVENTURERS_WORK_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button
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

  return (
    <AnswerReportDialog
      title={messages.REPORT.DISMISS_ALERT.TITLE}
      description={messages.REPORT.DISMISS_ALERT.DESCRIPTION}
      confirmText={messages.REPORT.DISMISS_ALERT.CONFIRM_TEXT}
      isPending={isPending}
      onConfirm={(reason) => mutate(reason)}
    >
      <Button type='button' id='dismissButton' disabled={isPending}>
        {`Dismiss`}
      </Button>
    </AnswerReportDialog>
  );
};

const AnswerReportDialog = ({
  children,
  title,
  description,
  confirmText,
  isMutationPending,
  onConfirm,
}) => {
  // Action handling for update email form
  const [state, answerReportFormAction, isPending] = useActionState(
    answerReportAction,
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
      onConfirm(state.data.data.reason);
    }
  }, [state, showAlert, onConfirm]);

  // Handle manual dialog close to reset visual errors
  const handleOpenChange = (open) => {
    if (!isPending && !isMutationPending) {
      setIsOpen(open);
      if (!open) {
        setIsAlertClosed(true);
      }
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className='sm:max-w-sm max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={answerReportFormAction} id='answerReportForm' noValidate>
          <div className='space-y-4 py-4'>
            <div className='space-y-2'>
              <FormTextareaField
                id='answerReportReason'
                name='reason'
                label='Reason (required):'
                type='text'
                maxLength={consts.REPORT.REASON_MESSAGE.MAX}
                defaultValue={state.data?.reason || ''}
                error={
                  !clearedFields.reason && state.errors?.reason
                    ? state.errors.reason[0]
                    : undefined
                }
                invalid={!clearedFields.reason && !!state.errors?.reason}
                aria-invalid={!clearedFields.reason && !!state.errors?.reason}
                required
                autoComplete='off'
                disabled={isPending || isMutationPending}
                onChange={handleFieldChange}
              />
            </div>
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
          <Button
            type='submit'
            disabled={isPending || isMutationPending}
            form='answerReportForm'
          >
            {isPending || isMutationPending ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
