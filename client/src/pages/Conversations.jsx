import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { History, MessageCircle, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMyConversationsInfiniteQueryOptions } from '../queries/ConversationsQueries';
import { PAGINATION_LIMIT } from '../consts/consts';
import { getImageUrl } from '../utils/media';

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
      state={{ from: '/conversations' }}
      className='flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40'
    >
      <div className='flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted'>
        {isHistory ? (
          <History className='h-5 w-5 text-muted-foreground' />
        ) : isMissionConversation ? (
          <Users className='h-5 w-5 text-muted-foreground' />
        ) : conversation.other_avatar ? (
          <img
            src={getImageUrl(conversation.other_avatar)}
            alt={`${conversation.other_username} avatar`}
            className='h-full w-full object-cover'
          />
        ) : (
          <User className='h-5 w-5 text-muted-foreground' />
        )}
      </div>

      <div className='min-w-0 flex-1'>
        <div className='flex items-center justify-between gap-3'>
          <h3 className='truncate font-semibold'>
            {conversationTitle || 'Conversation'}
          </h3>
          {conversation.last_message_created_at && (
            <span className='shrink-0 text-xs text-muted-foreground'>
              {new Date(
                conversation.last_message_created_at,
              ).toLocaleDateString()}
            </span>
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

        <p className='mt-1 truncate text-sm text-muted-foreground'>
          {getLastMessagePreview(conversation)}
        </p>
      </div>

      <MessageCircle
        className='h-5 w-5 shrink-0 text-muted-foreground'
        aria-hidden='true'
      />
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
  const activeConversations = conversations.filter(
    (conversation) => !isMissionHistory(conversation),
  );
  const missionHistory = conversations.filter(isMissionHistory);

  if (isLoading) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div className='p-8 text-center text-muted-foreground'>
          Loading conversations
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
        <div className='rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive'>
          Could not load conversations
        </div>
      </main>
    );
  }

  return (
    <main className='container mx-auto max-w-4xl p-4 sm:p-6'>
      <section className='mb-6 border-b pb-4'>
        <h1 className='text-3xl font-bold tracking-tight'>Conversations</h1>
        <p className='text-muted-foreground'>
          Your direct messages, active mission chats and mission history.
        </p>
      </section>

      {conversations.length === 0 ? (
        <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
          You have no conversations yet.
        </div>
      ) : (
        <div className='space-y-8'>
          {activeConversations.length > 0 && (
            <section
              className='grid gap-3'
              aria-labelledby='active-chats-title'
            >
              <h2 id='active-chats-title' className='text-lg font-semibold'>
                Active conversations
              </h2>
              {activeConversations.map((conversation) => (
                <ConversationCard
                  key={conversation.cid}
                  conversation={conversation}
                />
              ))}
            </section>
          )}

          {missionHistory.length > 0 && (
            <section
              className='grid gap-3'
              aria-labelledby='mission-history-title'
            >
              <h2 id='mission-history-title' className='text-lg font-semibold'>
                Mission history
              </h2>
              {missionHistory.map((conversation) => (
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
