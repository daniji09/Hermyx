import { useContext, useEffect, useMemo, useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { Bell, Check, Clock, ShieldAlert, X } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnswerReportDialog } from '@/components/custom/reports/AnswerReportDialog';
import { useAlert } from '../contexts/AlertContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getMyNotificationsInfiniteQueryOptions,
  markAllNotificationsAsSeenMutationOptions,
  respondToNotificationMutationOptions,
} from '../queries/NotificationsQueries';
import {
  formatLastMessageTime,
  formatParticipationReviewTimeRemaining,
} from '../utils/date';
import { AuthContext } from '../contexts/AuthContext';
import {
  NOTIFICATION_ACTION,
  NOTIFICATION_KIND,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
  messages as messagesShared,
} from '@hermyx/shared';
import { PAGINATION_LIMIT } from '../consts/consts';
import { truncateText } from '../../../server/src/utils/string.util';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getImageUrl } from '../utils/media';
import { getInitials } from '../utils/avatar';
import { useInView } from 'react-intersection-observer';

export const Notifications = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setLatestNotification } = useContext(AuthContext);
  const [filter, setFilter] = useState('all');
  const [disputeNotificationId, setDisputeNotificationId] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const { showAlert } = useAlert();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery(
    getMyNotificationsInfiniteQueryOptions(
      PAGINATION_LIMIT.NOTIFICATIONS,
      filter,
      {
        onSuccess: () => {
          setLatestNotification(null);
        },
      },
    ),
  );

  // Observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    // RootMargin begins load 100px before user's reaches the top, so the load is smooth
    rootMargin: '0px 0px 100px 0px',
  });

  // When observer is in view, is shot
  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  const { mutate, isPending, variables } = useMutation(
    respondToNotificationMutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ['getMyNotifications'],
        });
        await queryClient.invalidateQueries({ queryKey: ['getMission'] });
        await queryClient.invalidateQueries({ queryKey: ['getMissions'] });
        await queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
        await queryClient.invalidateQueries({ queryKey: ['getMyDisputes'] });
        await queryClient.invalidateQueries({
          queryKey: ['getDisputeUnreadCount'],
        });
        setDisputeNotificationId(null);
      },
      onError: (error, variables) => {
        const backendMessage =
          error?.response?.data?.error ||
          error?.response?.data?.errors?.general?.[0] ||
          'An unexpected error occurred.';
        const mustConfigureBankAccount =
          backendMessage ===
          messagesShared.SERVICE.JOIN.COLLABORATOR_BANK_ACCOUNT_NOT_CONFIGURED;

        showAlert({
          title:
            variables?.response === 'disputed'
              ? 'Could not open dispute'
              : variables?.response === 'accepted'
                ? 'Could not accept invitation'
                : 'Could not reject invitation',
          description: backendMessage,
          ...(mustConfigureBankAccount && {
            variant: 'warning',
            cancelText: 'OK',
            confirmText: 'Configure bank account',
            onConfirm: () => navigate('/profile#payment-settings'),
          }),
        });
      },
    }),
  );
  const { mutate: markAllAsSeen } = useMutation(
    markAllNotificationsAsSeenMutationOptions({
      onSuccess: async () => {
        setLatestNotification(null);
        await queryClient.invalidateQueries({
          queryKey: ['getMyNotifications'],
        });
      },
    }),
  );

  const notifications = useMemo(
    () => data?.pages.flatMap((page) => page.notifications) || [],
    [data],
  );
  const unseenCount = useMemo(() => {
    return (
      data?.pages[0]?.totalUnseen ??
      notifications.filter((notification) => !notification.seen).length
    );
  }, [data, notifications]);
  useEffect(() => {
    const notificationId = searchParams.get('notification');

    if (!notificationId) return;

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete('notification');
      return nextParams;
    });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const unseenIds = notifications
      .filter((notification) => !notification.seen)
      .map((notification) => notification.nid);

    if (unseenIds.length === 0) {
      setLatestNotification(null);
      return;
    }

    markAllAsSeen();
  }, [markAllAsSeen, notifications, setLatestNotification]);

  const actionableCount = useMemo(() => {
    return notifications.filter(
      (notification) =>
        notification.kind === NOTIFICATION_KIND.ACTIONABLE.ID &&
        notification.status === NOTIFICATION_STATUS.PENDING.ID,
    ).length;
  }, [notifications]);

  const openDisputeDialog = (notificationId) => {
    setDisputeNotificationId(notificationId);
  };

  const submitDispute = (reason) => {
    mutate({
      notificationId: disputeNotificationId,
      response: 'disputed',
      message: reason,
    });
  };

  if (isLoading) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div role='status' className='p-8 text-center text-muted-foreground'>
          Loading notifications...
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div
          role='alert'
          className='rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive'
        >
          Could not load notifications.
        </div>
      </main>
    );
  }

  return (
    <>
      <title>{`Notifications | Hermyx`}</title>
      <meta
        name='description'
        content={`User's notifications in Hermyx.`}
      ></meta>
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <section className='mb-8 flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
          <span className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
            <Bell className='h-6 w-6' aria-hidden='true' />
          </span>
          <div className='min-w-0'>
            <h1 className='text-3xl sm:text-4xl font-bold tracking-tight wrap-break-words'>
              Notifications
            </h1>
            <p className='text-muted-foreground'>
              {unseenCount > 0
                ? `You have ${unseenCount} unread notification${unseenCount > 1 ? 's' : ''}.`
                : actionableCount > 0
                  ? `You have ${actionableCount} notification${actionableCount > 1 ? 's' : ''} waiting for your response.`
                  : 'You have no unread notifications right now.'}
            </p>
          </div>
        </section>

        {filter === 'all' && notifications.length === 0 ? (
          <Card>
            <CardContent className='p-8 text-center text-muted-foreground'>
              No notifications yet.
            </CardContent>
          </Card>
        ) : (
          <>
            <Tabs
              value={filter}
              onValueChange={setFilter}
              className='mb-8 w-full'
            >
              <TabsList className='flex h-auto w-full flex-col items-stretch gap-2 bg-transparent p-0 sm:grid sm:grid-cols-3 sm:gap-0 sm:bg-muted sm:p-1 my-4 sm:my-0'>
                <TabsTrigger
                  value='all'
                  className='w-full justify-center px-3 text-sm'
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value='accepted'
                  className='w-full justify-center px-3 text-sm'
                >
                  Accepted
                </TabsTrigger>
                <TabsTrigger
                  value='rejected'
                  className='w-full justify-center px-3 text-sm'
                >
                  Rejected
                </TabsTrigger>
              </TabsList>
              <TabsContent value='all' forceMount className='hidden' />
              <TabsContent value='accepted' forceMount className='hidden' />
              <TabsContent value='rejected' forceMount className='hidden' />
            </Tabs>

            {notifications.length === 0 ? (
              <Card>
                <CardContent className='p-8 text-center text-muted-foreground'>
                  No notifications for this filter.
                </CardContent>
              </Card>
            ) : (
              <ul className='space-y-4' aria-label='Notifications list'>
                {notifications.map((notification) => {
                  const isSeen = notification.seen;
                  const isMissionNotification =
                    notification.type === NOTIFICATION_TYPE.MISSION.ID;
                  const isPendingAction =
                    notification.kind === NOTIFICATION_KIND.ACTIONABLE.ID &&
                    notification.status === NOTIFICATION_STATUS.PENDING.ID;
                  const isPendingMissionReview =
                    notification.action ===
                      NOTIFICATION_ACTION.PARTICIPATION_REVIEW.ID &&
                    isPendingAction;
                  const isPendingRevisionResponse =
                    notification.action ===
                      NOTIFICATION_ACTION.PARTICIPATION_REJECTION_RESPONSE.ID &&
                    isPendingAction;
                  const canOwnerDispute =
                    isPendingMissionReview &&
                    Number(notification.payload?.attempt || 1) > 1;
                  const isCurrentNotificationPending =
                    isPending && variables?.notificationId === notification.nid;

                  const linkClass =
                    'font-medium font-semibold text-primary hover:underline transition-colors';

                  const renderSenderLink = () => {
                    const username = notification?.sender_username;
                    if (!username) return null;

                    return (
                      <span className='wrap-break-words wrap-anywhere'>
                        <Link
                          to={`/users/${username}`}
                          className={linkClass}
                          title={username}
                          aria-label={username}
                        >
                          {truncateText(username)}
                        </Link>
                      </span>
                    );
                  };

                  const renderMissionLink = () => {
                    const missionId =
                      notification?.payload?.associated_mission_id;
                    const title = notification?.mission_title;
                    if (!missionId) return null;

                    return (
                      <Link
                        to={`/services/${missionId}`}
                        className={linkClass}
                        title={title}
                        aria-label={title}
                      >
                        {truncateText(title)}
                      </Link>
                    );
                  };

                  const getNotificationPrefix = () => {
                    const missionLink = renderMissionLink();

                    // Handle service notifications.
                    if (isMissionNotification) {
                      if (isPendingMissionReview)
                        return <>Participation review of {missionLink}</>;
                      if (isPendingRevisionResponse)
                        return <>Revision request of {missionLink}</>;
                      return <>Service {missionLink} update</>;
                    }

                    const action = notification?.action;
                    if (action === NOTIFICATION_ACTION.MISSION_INVITE.ID) {
                      return <>Service {missionLink} invitation</>;
                    }
                    if (action === NOTIFICATION_ACTION.JOIN_REQUEST.ID) {
                      return <>Join service {missionLink} request</>;
                    }

                    return <>Message</>;
                  };

                  const title = (
                    <span className='leading-relaxed text-foreground'>
                      {getNotificationPrefix()} from {renderSenderLink()}.
                    </span>
                  );

                  return (
                    <li key={notification.nid}>
                      <Card
                        className={isSeen ? 'opacity-80' : 'border-primary/40'}
                      >
                        <CardHeader className='pb-3'>
                          <div className='flex flex-col gap-3 text-lg sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
                            <div className='flex min-w-0 items-center gap-3'>
                              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                                <Avatar className='size-10 shrink-0'>
                                  <AvatarImage
                                    src={getImageUrl(
                                      notification?.sender_avatar,
                                    )}
                                    alt=''
                                  />
                                  <AvatarFallback>
                                    {getInitials(notification?.sender_username)}
                                  </AvatarFallback>
                                </Avatar>
                              </div>

                              <CardTitle
                                asChild
                                className='min-w-0 wrap-break-words text-2xl text-bold'
                              >
                                <h2>{title}</h2>
                              </CardTitle>
                            </div>

                            <span className='self-start text-left text-sm font-normal text-muted-foreground sm:self-auto sm:text-right'>
                              {formatLastMessageTime(notification.date)}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                          <div className='flex -mt-4 justify-between '>
                            {notification.message ? (
                              <p className='wrap-break-words wrap-anywhere whitespace-pre-line text-sm leading-6'>
                                {notification.message}
                              </p>
                            ) : (
                              <p className='text-sm text-muted-foreground'>
                                No message included.
                              </p>
                            )}
                            {!isSeen && (
                              <div className='ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                                New
                              </div>
                            )}
                          </div>

                          {isPendingMissionReview && (
                            <p className='flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground'>
                              <Clock
                                className='h-4 w-4 shrink-0'
                                aria-hidden='true'
                              />
                              {formatParticipationReviewTimeRemaining(
                                notification.date,
                                currentTime,
                              )}
                            </p>
                          )}

                          {isPendingAction ? (
                            <div className='flex flex-wrap gap-2'>
                              <Button
                                type='button'
                                onClick={() =>
                                  mutate({
                                    notificationId: notification.nid,
                                    response: 'accepted',
                                  })
                                }
                                disabled={isCurrentNotificationPending}
                              >
                                <Check aria-hidden='true' />
                                {isPendingMissionReview
                                  ? 'Approve'
                                  : isPendingRevisionResponse
                                    ? 'Accept revision'
                                    : 'Accept'}
                              </Button>
                              <Button
                                type='button'
                                variant='outline'
                                onClick={() => {
                                  if (isPendingRevisionResponse) {
                                    openDisputeDialog(notification.nid);
                                  } else {
                                    mutate({
                                      notificationId: notification.nid,
                                      response: 'rejected',
                                    });
                                  }
                                }}
                                disabled={isCurrentNotificationPending}
                              >
                                <X aria-hidden='true' />
                                {isPendingRevisionResponse
                                  ? 'Dispute'
                                  : 'Reject'}
                              </Button>
                              {canOwnerDispute && (
                                <Button
                                  type='button'
                                  variant='destructive'
                                  onClick={() =>
                                    openDisputeDialog(notification.nid)
                                  }
                                  disabled={isCurrentNotificationPending}
                                >
                                  <ShieldAlert aria-hidden='true' />
                                  Dispute
                                </Button>
                              )}
                            </div>
                          ) : notification.status ? (
                            <div className='flex flex-wrap justify-between items-center gap-3'>
                              {notification.payload?.associated_report_id && (
                                <Button asChild variant='outline'>
                                  <Link
                                    to={`/disputes/${notification.payload.associated_report_id}`}
                                  >
                                    Open dispute
                                  </Link>
                                </Button>
                              )}
                              <p className='font-large ml-auto text-muted-foreground italic'>
                                {NOTIFICATION_STATUS[notification.status].LABEL}
                              </p>
                            </div>
                          ) : (
                            <div className='flex flex-wrap justify-end items-center gap-3'>
                              {notification.payload?.associated_report_id && (
                                <Button asChild variant='outline'>
                                  <Link
                                    to={`/disputes/${notification.payload.associated_report_id}`}
                                  >
                                    Open dispute
                                  </Link>
                                </Button>
                              )}
                              <p className='font-large ml-auto text-muted-foreground italic'>
                                Informational notification
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </li>
                  );
                })}
                {hasNextPage && (
                  <li
                    ref={isFetchingNextPage ? null : loadMoreRef}
                    className='flex justify-center py-4 h-12 w-full'
                  >
                    {isFetchingNextPage && (
                      <span className='text-xs text-muted-foreground animate-pulse'>
                        Loading notifications...
                      </span>
                    )}
                  </li>
                )}
                {!hasNextPage && (
                  <li className='text-center text-xs text-muted-foreground py-2'>
                    No more notifications found.
                  </li>
                )}
              </ul>
            )}
          </>
        )}
        {disputeNotificationId && (
          <AnswerReportDialog
            key={disputeNotificationId}
            open
            onOpenChange={(open) => {
              if (!open) setDisputeNotificationId(null);
            }}
            title='Open dispute'
            description='Explain why you disagree. This will be the first message visible to the other participant and the administrator.'
            confirmText='Open dispute'
            isPending={isPending}
            onConfirm={submitDispute}
          />
        )}
      </main>
    </>
  );
};
