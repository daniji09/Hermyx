import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { History, MessageCircle, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMyConversationsInfiniteQueryOptions } from '../queries/ConversationsQueries';
import { PAGINATION_LIMIT } from '../consts/consts';
import { getImageUrl } from '../utils/media';
import { formatLastMessageTime } from '../utils/date';
import { cn } from './../lib/utils';

const getLastMessagePreview = (conversation) => {
  if (conversation.last_message_content) {
    return conversation.last_message_content;
  }

  if (conversation.last_message_attachment_type === 'image') {
    return 'Photo';
  }

  return 'No messages yet.';
};

const isMissionHistory = (conversation) =>
  conversation.type === 'mission' &&
  Boolean(conversation.history_until || conversation.closed_at);

const ConversationCard = ({ conversation }) => {
  const isMissionConversation = conversation.type === 'mission';
  const isHistory = isMissionHistory(conversation);
  const conversationTitle = isMissionConversation
    ? conversation.mission_title
    : conversation.other_username;

  return (
    <Link
      to={`/conversations/${conversation.cid}`}
      className='flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40 min-w-0'
    >
      <div className='flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted'>
        {isHistory ? (
          <History
            className='h-5 w-5 text-muted-foreground'
            aria-hidden='true'
          />
        ) : isMissionConversation ? (
          <Users className='h-5 w-5 text-muted-foreground' aria-hidden='true' />
        ) : conversation.other_avatar ? (
          <img
            src={getImageUrl(conversation.other_avatar)}
            alt={`${conversation.other_username} avatar`}
            className='h-full w-full object-cover'
          />
        ) : (
          <User className='h-5 w-5 text-muted-foreground' aria-hidden='true' />
        )}
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-center justify-between gap-3'>
          <h3 className='min-w-0 truncate font-semibold'>
            {conversation.type === 'private' &&
            conversation.participant_count === 0
              ? 'Hermyx user'
              : conversationTitle || 'Conversation'}
          </h3>
          {conversation.last_message_created_at && (
            <time
              className={cn(
                'shrink-0 text-xs',
                conversation.unread_count > 0
                  ? 'text-destructive font-semibold'
                  : 'text-muted-foreground',
              )}
            >
              {formatLastMessageTime(conversation.last_message_created_at)}
            </time>
          )}
        </div>

        {isMissionConversation && (
          <p className='text-xs text-muted-foreground'>
            {isHistory ? (
              'Mission history'
            ) : (
              <>
                Mission chat &middot; {conversation.participant_count}{' '}
                {conversation.participant_count === 1
                  ? 'participant'
                  : 'participants'}
              </>
            )}
          </p>
        )}
        <div className='flex justify-between'>
          <p className='min-w-0 mt-1 truncate text-sm text-muted-foreground'>
            {getLastMessagePreview(conversation)}
          </p>
          {conversation.unread_count > 0 && (
            <span className='flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground'>
              <span className='sr-only'>
                {conversation.unread_count} unread messages
              </span>
              <span aria-hidden='true'>{conversation.unread_count}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export const Conversations = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery(
    getMyConversationsInfiniteQueryOptions(PAGINATION_LIMIT.CONVERSATIONS),
  );
  const conversations = data?.pages.flatMap((page) => page.conversations) || [];

  if (isLoading) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div role='status' className='p-8 text-center text-muted-foreground'>
          Loading conversations
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
          Could not load conversations
        </div>
      </main>
    );
  }

  return (
    <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
      <section className='mb-8 flex flex-col items-start gap-4 border-b pb-6 sm:flex-row sm:items-center'>
        <span className='flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
          <MessageCircle className='h-6 w-6' aria-hidden='true' />
        </span>
        <div className='min-w-0'>
          <h1 className='text-3xl font-bold tracking-tight wrap-break-words'>
            Conversations
          </h1>
          <p className='text-muted-foreground'>
            Your direct messages, active mission chats and mission history.
          </p>
        </div>
      </section>

      {conversations.length === 0 ? (
        <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
          You have no conversations yet.
        </div>
      ) : (
        <div className='space-y-8'>
          {conversations.length > 0 && (
            <section className='grid gap-3' aria-label='List of conversations'>
              {conversations.map((conversation) => (
                <ConversationCard
                  key={conversation.cid}
                  conversation={conversation}
                />
              ))}
            </section>
          )}
          {hasNextPage && (
            <div className='flex justify-center'>
              <Button
                type='button'
                variant='outline'
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage
                  ? 'Loading conversations'
                  : 'Load more conversations'}
              </Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
};
