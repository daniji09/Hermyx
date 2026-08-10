import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquareWarning } from 'lucide-react';
import { REPORT_STATUS, REPORT_TYPE } from '@hermyx/shared';
import { getMyDisputesQueryOptions } from '../queries/DisputesQueries';

const getPreview = (dispute) => {
  if (dispute.last_message_content) return dispute.last_message_content;
  if (dispute.last_message_attachment_type === 'image') return 'Photo';
  return 'No messages yet.';
};

const getTypeLabel = (type) =>
  type === REPORT_TYPE.REVIEW_DISPUTE.ID
    ? 'Review dispute'
    : 'Rejected review dispute';

export const Disputes = () => {
  const {
    data: disputes = [],
    isLoading,
    isError,
  } = useQuery(getMyDisputesQueryOptions());

  if (isLoading) {
    return <main className='p-8 text-center'>Loading disputes</main>;
  }

  if (isError) {
    return (
      <main className='p-8 text-center text-destructive'>
        Could not load disputes.
      </main>
    );
  }

  return (
    <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
      <section className='mb-6 border-b pb-4'>
        <h1 className='text-3xl font-bold tracking-tight'>My disputes</h1>
        <p className='text-muted-foreground'>
          Delivery disputes involving you and the administration.
        </p>
      </section>

      {disputes.length === 0 ? (
        <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
          You have no disputes.
        </div>
      ) : (
        <section className='grid gap-3'>
          {disputes.map((dispute) => (
            <Link
              key={dispute.rid}
              to={`/disputes/${dispute.rid}`}
              className='flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40'
            >
              <span className='flex size-12 shrink-0 items-center justify-center rounded-full bg-muted'>
                <MessageSquareWarning className='size-5' aria-hidden='true' />
              </span>
              <div className='min-w-0 flex-1'>
                <div className='flex items-center justify-between gap-3'>
                  <h2 className='truncate font-semibold'>
                    {dispute.mission_title ||
                      `Mission ${dispute.payload.associated_mission_id}`}
                  </h2>
                  {dispute.unread_count > 0 && (
                    <span className='flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground'>
                      {dispute.unread_count}
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
        </section>
      )}
    </main>
  );
};
