import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { REPORT_DECISION, REPORT_STATUS, REPORT_TYPE } from '@hermyx/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDisputeQueryOptions } from '../queries/DisputesQueries';
import { ConversationThread } from './Conversation';

const getTypeLabel = (type) =>
  type === REPORT_TYPE.REVIEW_DISPUTE.ID
    ? 'Review dispute'
    : 'Rejected review dispute';

export const Dispute = () => {
  const { id } = useParams();
  const {
    data: dispute,
    isLoading,
    isError,
  } = useQuery(getDisputeQueryOptions(id));

  if (isLoading)
    return <main className='p-8 text-center'>Loading dispute</main>;
  if (isError || !dispute) {
    return (
      <main className='p-8 text-center text-destructive'>
        Dispute not found or unavailable.
      </main>
    );
  }

  return (
    <main className='container mx-auto max-w-4xl space-y-4 p-4 sm:p-6'>
      <Button asChild variant='ghost' className='w-fit gap-2 px-0'>
        <Link to='/disputes'>
          <ArrowLeft className='size-4' aria-hidden='true' /> Back
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>
            {dispute.mission_title ||
              `Mission ${dispute.payload.associated_mission_id}`}
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-2 text-sm'>
          <p>{getTypeLabel(dispute.type)}</p>
          <p>
            Status:{' '}
            {dispute.status === REPORT_STATUS.ANSWERED.ID ? 'Resolved' : 'Open'}
          </p>
          <p>
            Vacancy:{' '}
            {dispute.vacancy_title || dispute.payload.associated_vacancy_id}
          </p>
          {dispute.status === REPORT_STATUS.ANSWERED.ID && (
            <div className='rounded-lg bg-muted p-3'>
              <p className='font-medium'>
                {REPORT_DECISION[dispute.decision]?.LABEL || dispute.decision}
              </p>
              <p className='text-muted-foreground'>{dispute.decision_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <ConversationThread
        conversationId={dispute.conversation_id}
        showBack={false}
        title='Dispute conversation'
        description='Requester, adventurer and administration'
      />
    </main>
  );
};
