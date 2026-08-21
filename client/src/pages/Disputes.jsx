import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquareWarning } from 'lucide-react';
import { REPORT_STATUS, REPORT_TYPE } from '@hermyx/shared';
import { Button } from '@/components/ui/button';
import { getMyDisputesInfiniteQueryOptions } from '../queries/DisputesQueries';
import { PAGINATION_LIMIT } from '../consts/consts';

const getPreview = (dispute) => {
  if (dispute.last_message_content) return dispute.last_message_content;
  if (dispute.last_message_attachment_type === 'image') return 'Photo';
  return 'No messages yet.';
};

const getTypeLabel = (type) => REPORT_TYPE[type]?.LABEL || type;

export const Disputes = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery(
    getMyDisputesInfiniteQueryOptions(PAGINATION_LIMIT.DISPUTES),
  );
  const disputes = data?.pages.flatMap((page) => page.disputes) || [];

  if (isLoading) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div role='status' className='p-8 text-center text-muted-foreground'>
          Loading disputes...
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
          Could not load disputes.
        </div>
      </main>
    );
  }

  return (
    <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
      <section className='mb-8 flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
        <span className='hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
          <MessageSquareWarning className='h-6 w-6' aria-hidden='true' />
        </span>
        <div className='min-w-0'>
          <h1 className='text-3xl font-bold tracking-tight wrap-break-words'>
            Disputes
          </h1>
          <p className='text-muted-foreground'>
            Delivery disputes involving you and the administration.
          </p>
        </div>
      </section>

      {disputes.length === 0 ? (
        <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
          You have no disputes.
        </div>
      ) : (
        <section className='grid gap-3' aria-label='List of disputes'>
          {disputes.map((dispute) => (
            <Link
              key={dispute.rid}
              to={`/disputes/${dispute.rid}`}
              className='flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40 min-w-0'
            >
              <span className='flex size-12 shrink-0 items-center justify-center rounded-full bg-muted'>
                <MessageSquareWarning className='size-5' aria-hidden='true' />
              </span>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center justify-between gap-3'>
                  <h2 className='min-w-0 truncate font-semibold'>
                    {dispute.mission_title ||
                      `Mission ${dispute.payload.associated_mission_id}`}
                  </h2>
                  {dispute.unread_count > 0 && (
                    <span className='flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground'>
                      <span className='sr-only'>
                        {dispute.unread_count} unread messages
                      </span>

                      <span aria-hidden='true'>{dispute.unread_count}</span>
                    </span>
                  )}
                </div>
                <p className='text-xs text-muted-foreground'>
                  {getTypeLabel(dispute.type)} ·{' '}
                  {dispute.status === REPORT_STATUS.ANSWERED.ID
                    ? 'Resolved'
                    : 'Open'}
                  {dispute.counterpart_username
                    ? ` · With ${dispute.counterpart_username}`
                    : ''}
                </p>
                <p className='mt-1 truncate text-sm text-muted-foreground'>
                  {getPreview(dispute)}
                </p>
              </div>
            </Link>
          ))}
          {hasNextPage && (
            <div className='flex justify-center pt-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading disputes' : 'Load more disputes'}
              </Button>
            </div>
          )}
        </section>
      )}
    </main>
  );
};
