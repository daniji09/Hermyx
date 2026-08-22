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

  const linkClass =
    'font-medium text-primary hover:underline transition-colors';
  const renderUserLink = (username) => {
    if (!username) return null;
    return (
      <Link
        to={`/users/${username}`}
        className={linkClass}
        title={username}
        aria-label={username} // 👈 Accesibilidad salvada
        target='_blank'
        rel='noopener noreferrer'
      >
        {truncateText(username)}
      </Link>
    );
  };

  const renderMissionLink = () => {
    const missionId = dispute?.payload?.associated_mission_id;
    const title = dispute?.mission_title;
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

  const generateTitleText = () => {
    const { type, other_username, sender_username } = dispute || {};

    const otherUserLink = renderUserLink(other_username);
    const senderLink = renderUserLink(sender_username);
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

      default: // REVIEW_DISPUTE (El bloque final que tenías en el else)
        return (
          <>
            Adventurer&lsquo;s {otherUserLink} participation of mission{' '}
            {missionLink} was reported by {senderLink}.
          </>
        );
    }
  };

  const title = (
    <span className='text-sm leading-relaxed text-foreground'>
      {generateTitleText()}
    </span>
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
