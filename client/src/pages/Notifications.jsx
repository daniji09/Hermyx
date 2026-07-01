import { useContext, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, User, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getMyInvitationsQueryOptions,
  markInvitationAsSeenMutationOptions,
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
    getMyInvitationsQueryOptions({
      onSuccess: () => {
        setLatestNotification(null);
      },
    }),
  );

  const { mutate, isPending, variables } = useMutation(
    respondToInvitationMutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['getMyInvitations'] });
        await queryClient.invalidateQueries({ queryKey: ['getMission'] });
        await queryClient.invalidateQueries({ queryKey: ['getMissions'] });
        await queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
      },
    }),
  );
  const { mutate: markAsSeen } = useMutation(
    markInvitationAsSeenMutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['getMyInvitations'] });
      },
    }),
  );

  const invitations = data?.invitations || [];
  const unseenCount = useMemo(() => {
    return invitations.filter((invitation) => !invitation.seen).length;
  }, [invitations]);
  const filteredInvitations = useMemo(() => {
    if (filter === 'all') return invitations;
    return invitations.filter((invitation) => invitation.status === filter);
  }, [filter, invitations]);

  useEffect(() => {
    const invitationId = searchParams.get('invitation');

    if (!invitationId) return;

    const targetInvitation = invitations.find(
      (invitation) => invitation.iid === Number(invitationId),
    );

    if (targetInvitation && !targetInvitation.seen) {
      markAsSeen(Number(invitationId));
    }

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete('invitation');
      return nextParams;
    });
  }, [invitations, markAsSeen, searchParams, setSearchParams]);

  const actionableCount = useMemo(() => {
    return invitations.filter((invitation) => invitation.status === 'pending')
      .length;
  }, [invitations]);

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
    <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
      <section className='mb-8 flex items-center gap-4 border-b pb-6'>
        <span className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
          <Bell className='h-6 w-6' aria-hidden='true' />
        </span>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Notifications</h1>
          <p className='text-muted-foreground'>
            {unseenCount > 0
              ? `You have ${unseenCount} unread notification${unseenCount > 1 ? 's' : ''}.`
              : actionableCount > 0
                ? `You have ${actionableCount} invitation${actionableCount > 1 ? 's' : ''} waiting for your response.`
                : 'You have no unread notifications right now.'}
          </p>
        </div>
      </section>

      {invitations.length === 0 ? (
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
            className='mb-6 w-full'
          >
            <TabsList className='grid w-full max-w-90 grid-cols-3'>
              <TabsTrigger value='all'>All</TabsTrigger>
              <TabsTrigger value='accepted'>Accepted</TabsTrigger>
              <TabsTrigger value='rejected'>Rejected</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredInvitations.length === 0 ? (
            <Card>
              <CardContent className='p-8 text-center text-muted-foreground'>
                No notifications for this filter.
              </CardContent>
            </Card>
          ) : (
            <section className='space-y-4'>
              {filteredInvitations.map((invitation) => {
                const isSeen = invitation.seen;
                const isCurrentInvitationPending =
                  isPending && variables?.invitationId === invitation.iid;

                return (
                  <Card
                    key={invitation.iid}
                    className={isSeen ? 'opacity-80' : 'border-primary/40'}
                  >
                    <CardHeader className='pb-3'>
                      <CardTitle className='flex items-start justify-between gap-4 text-lg'>
                        <span className='flex items-center gap-3'>
                          <span className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                            <User className='h-5 w-5' aria-hidden='true' />
                          </span>
                          <span>
                            Tienes un mensaje de {invitation.sender_username}
                            {!isSeen && (
                              <span className='ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary'>
                                New
                              </span>
                            )}
                          </span>
                        </span>
                        <span className='text-sm font-normal text-muted-foreground'>
                          {timestampToDayMonthYear(invitation.date)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                      <div className='space-y-1'>
                        <p className='text-sm text-muted-foreground'>
                          Mission: {invitation.mission_title}
                        </p>
                        {invitation.message ? (
                          <p className='whitespace-pre-line text-sm leading-6'>
                            {invitation.message}
                          </p>
                        ) : (
                          <p className='text-sm text-muted-foreground'>
                            No message included.
                          </p>
                        )}
                      </div>

                      {invitation.status === 'pending' ? (
                        <div className='flex flex-wrap gap-2'>
                          <Button
                            type='button'
                            onClick={() =>
                              mutate({
                                invitationId: invitation.iid,
                                response: 'accepted',
                              })
                            }
                            disabled={isCurrentInvitationPending}
                          >
                            <Check aria-hidden='true' />
                            Accept
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            onClick={() =>
                              mutate({
                                invitationId: invitation.iid,
                                response: 'rejected',
                              })
                            }
                            disabled={isCurrentInvitationPending}
                          >
                            <X aria-hidden='true' />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <p className='text-sm font-medium text-muted-foreground'>
                          Status: {invitation.status}
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
