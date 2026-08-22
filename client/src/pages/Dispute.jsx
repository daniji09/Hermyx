import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { REPORT_STATUS, REPORT_TYPE } from '@hermyx/shared';
import { getDisputeQueryOptions } from '../queries/DisputesQueries';
import { ConversationThread } from './Conversation';

const truncateText = (text, maxLength = 20) => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

export const Dispute = () => {
  const { id } = useParams();
  const {
    data: dispute,
    isLoading,
    isError,
  } = useQuery(getDisputeQueryOptions(id));

  const title =
    dispute?.type === REPORT_TYPE.REPORT_ADVENTURER.ID ? (
      <p className='text-sm'>
        Adventurer{' '}
        <Link
          to={`/users/${dispute?.other_username}`}
          className='font-medium text-primary hover:underline'
          title={dispute?.other_username}
        >
          {truncateText(dispute?.other_username)}
        </Link>{' '}
        of mission{' '}
        <Link
          to={`/missions/${dispute?.payload?.associated_mission_id}`}
          className='font-medium text-primary hover:underline'
          title={dispute?.mission_title}
        >
          {truncateText(dispute?.mission_title)}
        </Link>{' '}
        was reported by{' '}
        <Link
          to={`/users/${dispute?.sender_username}`}
          className='font-medium text-primary hover:underline'
          title={dispute?.sender_username}
        >
          {truncateText(dispute?.sender_username)}
        </Link>
        .
      </p>
    ) : dispute?.type === REPORT_TYPE.REJECTED_REVIEW_DISPUTE.ID ? (
      <p className='text-sm'>
        Applicant{' '}
        <Link
          to={`/users/${dispute?.other_username}`}
          className='font-medium text-primary hover:underline'
          title={dispute?.other_username}
        >
          {truncateText(dispute?.other_username)}
        </Link>{' '}
        of mission{' '}
        <Link
          to={`/missions/${dispute?.payload?.associated_mission_id}`}
          className='font-medium text-primary hover:underline'
          title={dispute?.mission_title}
        >
          {truncateText(dispute?.mission_title)}
        </Link>{' '}
        was reported by{' '}
        <Link
          to={`/users/${dispute?.sender_username}`}
          className='font-medium text-primary hover:underline'
          title={dispute?.sender_username}
        >
          {truncateText(dispute?.sender_username)}
        </Link>
        .
      </p>
    ) : (
      <p className='text-sm'>
        Adventurer&lsquo;s{' '}
        <Link
          to={`/users/${dispute?.other_username}`}
          className='font-medium text-primary hover:underline'
          title={dispute?.other_username}
        >
          {truncateText(dispute?.other_username)}
        </Link>{' '}
        participation of mission{' '}
        <Link
          to={`/missions/${dispute?.payload?.associated_mission_id}`}
          className='font-medium text-primary hover:underline'
          title={dispute?.mission_title}
        >
          {truncateText(dispute?.mission_title)}
        </Link>{' '}
        was reported by{' '}
        <Link
          to={`/users/${dispute?.sender_username}`}
          className='font-medium text-primary hover:underline'
          title={dispute?.sender_username}
        >
          {truncateText(dispute?.sender_username)}
        </Link>
        .
      </p>
    );

  if (isLoading)
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div role='status' className='p-8 text-center text-muted-foreground'>
          Loading dispute...
        </div>
      </main>
    );

  if (isError || !dispute) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div
          role='alert'
          className='rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive'
        >
          Could not load dispute.
        </div>
      </main>
    );
  }

  return (
    <ConversationThread
      conversationId={dispute.conversation_id}
      showBack={true}
      title={title}
      description={`The complainant, the accused and the administration ${dispute?.status === REPORT_STATUS.SENT.ID ? 'are' : 'were'}  all involved in this ${dispute?.status === REPORT_STATUS.SENT.ID ? 'open' : 'closed'} dispute.`}
      decision={dispute?.decision}
    />
  );
};
