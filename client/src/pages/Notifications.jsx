import { useContext, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, User, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getMyNotificationsQueryOptions,
  markNotificationAsSeenMutationOptions,
  respondToInvitationMutationOptions,
} from '../queries/InvitationsQueries';
import { timestampToDayMonthYear } from '../utils/date';
import { AuthContext } from '../contexts/AuthContext';

export const Notifications = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { setLatestNotification } = useContext(AuthContext);
  const [filter, setFilter] = useState('all');
  const { data, isLoading, isError } = useQuery(
    getMyNotificationsQueryOptions({
      onSuccess: () => {
        setLatestNotification(null);
      },
    }),
  );

  const { mutate, isPending, variables } = useMutation(
    respondToInvitationMutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ['getMyNotifications'],
        });
        await queryClient.invalidateQueries({ queryKey: ['getMission'] });
        await queryClient.invalidateQueries({ queryKey: ['getMissions'] });
        await queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
      },
    }),
  );
  const { mutate: markAsSeen } = useMutation(
    markNotificationAsSeenMutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: ['getMyNotifications'],
        });
      },
    }),
  );

  const notifications = data?.notifications || [];
  const unseenCount = useMemo(() => {
    return notifications.filter((notification) => !notification.seen).length;
  }, [notifications]);
  const filteredNotifications = useMemo(() => {
    if (filter === 'all') return notifications;
    return notifications.filter(
      (notification) => notification.status === filter,
    );
  }, [filter, notifications]);

  useEffect(() => {
    const notificationId = searchParams.get('notification');

    if (!notificationId) return;

    const targetNotification = notifications.find(
      (notification) => notification.nid === Number(notificationId),
    );

    if (targetNotification && !targetNotification.seen) {
      markAsSeen(Number(notificationId));
    }

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete('notification');
      return nextParams;
    });
  }, [notifications, markAsSeen, searchParams, setSearchParams]);

  const actionableCount = useMemo(() => {
    return notifications.filter(
      (notification) => notification.status === 'pending',
    ).length;
  }, [notifications]);

  if (isLoading) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div className='p-8 text-center text-muted-foreground'>
          Loading notifications
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <Alert variant='destructive'>
          <AlertTitle>Could not load notifications</AlertTitle>
          <AlertDescription>Try again in a few moments.</AlertDescription>
        </Alert>
      </main>
    );
  }

  return (
    <main className='container mx-auto max-w-4xl p-3 sm:p-6'>
      <section className='mb-8 flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
        <span className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
          <Bell className='h-6 w-6' aria-hidden='true' />
        </span>
        <div className='min-w-0'>
          <h1 className='text-3xl font-bold tracking-tight break-words'>
            Notifications
          </h1>
          <p className='text-muted-foreground'>
            {unseenCount > 0
              ? `You have ${unseenCount} unread notification${unseenCount > 1 ? 's' : ''}.`
              : actionableCount > 0
                ? `You have ${actionableCount} invitation${actionableCount > 1 ? 's' : ''} waiting for your response.`
                : 'You have no unread notifications right now.'}
          </p>
        </div>
      </section>

      {notifications.length === 0 ? (
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
            <TabsList className='flex h-auto w-full flex-col items-stretch gap-2 bg-transparent p-0 sm:max-w-90 sm:grid sm:grid-cols-3 sm:gap-0 sm:bg-muted sm:p-1'>
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
          </Tabs>

          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className='p-8 text-center text-muted-foreground'>
                No notifications for this filter.
              </CardContent>
            </Card>
          ) : (
            <section className='space-y-4'>
              {filteredNotifications.map((notification) => {
                const isSeen = notification.seen;
                const isMissionNotification = notification.type === 'mission';
                const isPendingMissionReview =
                  isMissionNotification && notification.status === 'pending';
                const isCurrentInvitationPending =
                  isPending && variables?.notificationId === notification.nid;

                return (
                  <Card
                    key={notification.nid}
                    className={isSeen ? 'opacity-80' : 'border-primary/40'}
                  >
                    <CardHeader className='pb-3'>
                      <CardTitle className='flex flex-col gap-3 text-lg sm:flex-row sm:items-start sm:justify-between sm:gap-4'>
                        <span className='flex min-w-0 items-start gap-3'>
                          <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                            <User className='h-5 w-5' aria-hidden='true' />
                          </span>
                          <span className='min-w-0'>
                            <span className='block break-words leading-snug'>
                              {isMissionNotification ? (
                                <>
                                  {isPendingMissionReview
                                    ? 'Participation review from '
                                    : 'Mission update from '}
                                  <span className='break-all'>
                                    {notification.sender_username}
                                  </span>
                                </>
                              ) : (
                                <>
                                  Tienes un mensaje de{' '}
                                  <span className='break-all'>
                                    {notification.sender_username}
                                  </span>
                                </>
                              )}
                            </span>
                            {!isSeen && (
                              <span className='ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                                New
                              </span>
                            )}
                          </span>
                        </span>
                        <span className='self-start text-left text-sm font-normal text-muted-foreground sm:self-auto sm:text-right'>
                          {timestampToDayMonthYear(notification.date)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div className='space-y-1'>
                        <p className='text-sm text-muted-foreground'>
                          Mission: {notification.mission_title}
                        </p>
                        {notification.message ? (
                          <p className='whitespace-pre-line text-sm leading-6'>
                            {notification.message}
                          </p>
                        ) : (
                          <p className='text-sm text-muted-foreground'>
                            No message included.
                          </p>
                        )}
                      </div>

                      {notification.status === 'pending' ? (
                        <div className='flex flex-wrap gap-2'>
                          <Button
                            type='button'
                            onClick={() =>
                              mutate({
                                notificationId: notification.nid,
                                response: 'accepted',
                              })
                            }
                            disabled={isCurrentInvitationPending}
                          >
                            <Check aria-hidden='true' />
                            {isPendingMissionReview ? 'Approve' : 'Accept'}
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            onClick={() =>
                              mutate({
                                notificationId: notification.nid,
                                response: 'rejected',
                              })
                            }
                            disabled={isCurrentInvitationPending}
                          >
                            <X aria-hidden='true' />
                            Reject
                          </Button>
                        </div>
                      ) : notification.status ? (
                        <p className='text-sm font-medium text-muted-foreground'>
                          Status: {notification.status}
                        </p>
                      ) : (
                        <p className='text-sm font-medium text-muted-foreground'>
                          Informational notification
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          )}
        </>
      )}
    </main>
  );
};
