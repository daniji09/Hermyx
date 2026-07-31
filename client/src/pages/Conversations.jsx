import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageCircle, User, Users } from 'lucide-react';
import { getMyConversationsQueryOptions } from '../queries/ConversationsQueries';

export const Conversations = () => {
  const {
    data: conversations = [],
    isLoading,
    isError,
  } = useQuery(getMyConversationsQueryOptions());

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
          Your direct messages and mission chats.
        </p>
      </section>

      {conversations.length === 0 ? (
        <div className='rounded-lg border border-dashed p-8 text-center text-muted-foreground'>
          You have no conversations yet.
        </div>
      ) : (
        <section className='grid gap-3'>
          {conversations.map((conversation) => {
            const isMissionConversation = conversation.type === 'mission';
            const conversationTitle = isMissionConversation
              ? conversation.mission_title
              : conversation.other_username;

            return (
              <Link
                key={conversation.cid}
                to={`/conversations/${conversation.cid}`}
                state={{ from: '/conversations' }}
                className='flex items-center gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40'
              >
                <div className='flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted'>
                  {isMissionConversation ? (
                    <Users className='h-5 w-5 text-muted-foreground' />
                  ) : conversation.other_avatar ? (
                    <img
                      src={conversation.other_avatar}
                      alt={`${conversation.other_username} avatar`}
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    <User className='h-5 w-5 text-muted-foreground' />
                  )}
                </div>

                <div className='min-w-0 flex-1'>
                  <div className='flex items-center justify-between gap-3'>
                    <h2 className='truncate font-semibold'>
                      {conversationTitle || 'Conversation'}
                    </h2>
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
                      Mission chat · {conversation.participant_count}{' '}
                      {conversation.participant_count === 1
                        ? 'participant'
                        : 'participants'}
                      {conversation.closed_at ? ' · Closed' : ''}
                    </p>
                  )}

                  <p className='mt-1 truncate text-sm text-muted-foreground'>
                    {conversation.last_message_content || 'No messages yet.'}
                  </p>
                </div>

                <MessageCircle
                  className='h-5 w-5 shrink-0 text-muted-foreground'
                  aria-hidden='true'
                />
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
};
