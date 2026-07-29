import { useContext, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AuthContext } from '../contexts/AuthContext';
import {
  getConversationMessages,
  markConversationAsRead,
  sendMessage,
} from '../services/ConversationsServices';
import { getConversationQueryOptions } from '../queries/ConversationsQueries';

export const Conversation = () => {
  const { conversationId } = useParams();
  const location = useLocation();
  const { currentUser, socket } = useContext(AuthContext);
  const backTo = location.state?.from || '/conversations';
  const [content, setContent] = useState('');
  const [messages, setMessages] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  const {
    data: conversationData,
    isLoading: isConversationLoading,
    isError: isConversationError,
  } = useQuery(getConversationQueryOptions(conversationId));

  const otherParticipant = conversationData?.participants?.find(
    (participant) => participant.uid !== currentUser?.id,
  );
  const conversationTitle = otherParticipant?.username || 'Conversation';

  const {
    data: initialMessages = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['conversationMessages', conversationId],
    queryFn: () => getConversationMessages(conversationId),
    enabled: !!conversationId,
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!conversationData || !conversationId) return;

    const markCurrentConversationAsRead = async () => {
      try {
        await markConversationAsRead(conversationId);
        await queryClient.invalidateQueries({
          queryKey: ['getUnreadMessageCount'],
        });
      } catch (error) {
        console.error('Could not mark conversation as read:', error);
      }
    };

    markCurrentConversationAsRead();
  }, [conversationData, conversationId, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit('conversation:join', conversationId);

    const handleMessageCreated = async (message) => {
      if (String(message.conversation_id) !== String(conversationId)) return;

      setMessages((currentMessages) => {
        const alreadyExists = currentMessages.some(
          (currentMessage) => currentMessage.mid === message.mid,
        );

        if (alreadyExists) return currentMessages;

        return [...currentMessages, message];
      });

      if (message.sender_id !== currentUser?.id) {
        try {
          await markConversationAsRead(conversationId);
          await queryClient.invalidateQueries({
            queryKey: ['getUnreadMessageCount'],
          });
        } catch (error) {
          console.error('Could not mark conversation as read:', error);
        }
      }
    };

    socket.on('conversation:message-created', handleMessageCreated);

    return () => {
      socket.emit('conversation:leave', conversationId);
      socket.off('conversation:message-created', handleMessageCreated);
    };
  }, [socket, conversationId, currentUser?.id, queryClient]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => sendMessage(conversationId, content),
    onSuccess: () => {
      setContent('');
      setErrorMessage('');
    },
    onError: (error) => {
      setErrorMessage(
        error?.response?.data?.errors?.general?.[0] ||
          'Could not send message.',
      );
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!content.trim()) {
      setErrorMessage('Message cannot be empty.');
      return;
    }

    mutate();
  };

  if (isConversationLoading) {
    return (
      <main className='container mx-auto max-w-3xl p-4 sm:p-6'>
        <div className='p-8 text-center text-muted-foreground'>
          Loading conversation
        </div>
      </main>
    );
  }

  if (isConversationError || !conversationData) {
    return (
      <main className='container mx-auto max-w-3xl p-4 sm:p-6'>
        <div className='rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive'>
          Conversation not found
        </div>
      </main>
    );
  }

  return (
    <main className='container mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-6'>
      <div className='flex items-center justify-between gap-4 border-b pb-4'>
        <div>
          <Button asChild variant='ghost' className='mb-2 gap-2 px-0'>
            <Link to={backTo}>
              <ArrowLeft className='h-4 w-4' aria-hidden='true' />
              Back
            </Link>
          </Button>
          <h1 className='text-3xl font-bold tracking-tight'>
            {conversationTitle}
          </h1>
        </div>
      </div>

      <section className='h-[calc(100vh-22rem)] min-h-80 overflow-y-auto rounded-lg border bg-card p-4'>
        {isLoading ? (
          <p className='text-muted-foreground'>Loading messages</p>
        ) : isError ? (
          <p className='text-destructive'>Could not load messages.</p>
        ) : messages.length === 0 ? (
          <p className='text-muted-foreground'>No messages yet.</p>
        ) : (
          <div className='flex flex-col gap-3'>
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === currentUser?.id;

              return (
                <article
                  key={message.mid}
                  className={`max-w-[80%] rounded-lg border px-4 py-3 ${
                    isOwnMessage
                      ? 'ml-auto bg-primary text-primary-foreground'
                      : 'mr-auto bg-background'
                  }`}
                >
                  <p className='mb-1 text-xs font-medium opacity-80'>
                    {message.sender_username}
                  </p>
                  <p className='whitespace-pre-line text-sm leading-6'>
                    {message.content}
                  </p>
                </article>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
        <Textarea
          value={content}
          onChange={(event) => {
            setContent(event.target.value);
            setErrorMessage('');
          }}
          placeholder='Write a message'
          disabled={isPending}
          maxLength={1000}
        />
        {errorMessage && (
          <p className='text-sm text-destructive'>{errorMessage}</p>
        )}
        <div className='flex justify-end'>
          <Button type='submit' className='gap-2' disabled={isPending}>
            <Send className='h-4 w-4' aria-hidden='true' />
            {isPending ? 'Sending' : 'Send'}
          </Button>
        </div>
      </form>
    </main>
  );
};
