import { useContext, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUp, MessageCircleDashed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import {
  Message,
  MessageContent,
  MessageHeader,
} from '@/components/ui/message';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
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
  const queryClient = useQueryClient();

  const {
    data: conversationData,
    isLoading: isConversationLoading,
    isError: isConversationError,
  } = useQuery(getConversationQueryOptions(conversationId));

  const otherParticipant = conversationData?.participants?.find(
    (participant) => participant.uid !== currentUser?.id,
  );
  const currentParticipant = conversationData?.participants?.find(
    (participant) => participant.uid === currentUser?.id,
  );
  const conversation = conversationData?.conversation;
  const isMissionConversation = conversation?.type === 'mission';
  const conversationTitle = isMissionConversation
    ? conversation?.mission_title
    : otherParticipant?.username;
  const canSendMessages =
    !conversation?.closed_at && currentParticipant?.can_send !== false;

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
    <main className='container mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6'>
      <Button asChild variant='ghost' className='w-fit gap-2 px-0'>
        <Link to={backTo}>
          <ArrowLeft className='h-4 w-4' aria-hidden='true' />
          Back
        </Link>
      </Button>

      <Card className='mx-auto h-140 w-full max-w-3xl gap-0 py-0'>
        <CardHeader className='gap-1 border-b py-5'>
          <CardTitle asChild>
            <h1>{conversationTitle || 'Conversation'}</h1>
          </CardTitle>
          <CardDescription>
            {isMissionConversation
              ? `Mission group · ${conversationData.participants.length} ${
                  conversationData.participants.length === 1
                    ? 'participant'
                    : 'participants'
                }`
              : `Conversation with ${otherParticipant?.username || 'adventurer'}`}
          </CardDescription>
        </CardHeader>

        <CardContent
          className='min-h-0 flex-1 overflow-hidden p-0'
          aria-label='Conversation messages'
        >
          <MessageScrollerProvider autoScroll defaultScrollPosition='end'>
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent className='p-5'>
                  {isLoading ? (
                    <MessageScrollerItem
                      messageId='loading-messages'
                      className='flex flex-1 items-center justify-center'
                    >
                      <p className='text-muted-foreground'>Loading messages</p>
                    </MessageScrollerItem>
                  ) : isError ? (
                    <MessageScrollerItem
                      messageId='messages-error'
                      className='flex flex-1 items-center justify-center'
                    >
                      <p className='text-destructive'>
                        Could not load messages.
                      </p>
                    </MessageScrollerItem>
                  ) : messages.length === 0 ? (
                    <MessageScrollerItem
                      messageId='no-messages'
                      className='flex flex-1 items-center justify-center'
                    >
                      <div className='flex flex-col items-center gap-3 text-center'>
                        <div className='flex size-10 items-center justify-center rounded-xl bg-muted'>
                          <MessageCircleDashed
                            className='size-5'
                            aria-hidden='true'
                          />
                        </div>
                        <div>
                          <p className='font-medium'>No messages yet</p>
                          <p className='mt-1 text-sm text-muted-foreground'>
                            Send a message to start the conversation.
                          </p>
                        </div>
                      </div>
                    </MessageScrollerItem>
                  ) : (
                    messages.map((message) => {
                      const isOwnMessage =
                        message.sender_id === currentUser?.id;

                      return (
                        <MessageScrollerItem
                          key={message.mid}
                          messageId={String(message.mid)}
                        >
                          <Message align={isOwnMessage ? 'end' : 'start'}>
                            <MessageContent>
                              <MessageHeader>
                                {message.sender_username}
                              </MessageHeader>
                              <Bubble
                                variant={isOwnMessage ? 'default' : 'secondary'}
                              >
                                <BubbleContent className='whitespace-pre-line'>
                                  {message.content}
                                </BubbleContent>
                              </Bubble>
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      );
                    })
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton className='left-1/2' />
            </MessageScroller>
          </MessageScrollerProvider>
        </CardContent>

        <CardFooter className='flex-col gap-2 border-t-0 bg-card'>
          {canSendMessages ? (
            <form onSubmit={handleSubmit} className='w-full space-y-2'>
              <InputGroup className='h-auto rounded-2xl border-transparent bg-input/50'>
                <InputGroupTextarea
                  value={content}
                  onChange={(event) => {
                    setContent(event.target.value);
                    setErrorMessage('');
                  }}
                  placeholder='Write a message'
                  disabled={isPending}
                  maxLength={1000}
                  className='min-h-14 max-h-32 px-3 py-2.5'
                />
                <InputGroupAddon align='block-end' className='pt-1'>
                  <InputGroupButton
                    type='submit'
                    variant='default'
                    size='icon-sm'
                    className='ml-auto rounded-2xl'
                    disabled={isPending}
                  >
                    <ArrowUp className='h-4 w-4' aria-hidden='true' />
                    <span className='sr-only'>
                      {isPending ? 'Sending message' : 'Send message'}
                    </span>
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
              {errorMessage && (
                <p className='text-sm text-destructive'>{errorMessage}</p>
              )}
            </form>
          ) : (
            <p className='text-sm text-muted-foreground'>
              {conversation?.closed_at
                ? 'This mission conversation is closed. You can still read its history.'
                : 'Your mission participation is complete. This conversation is now read-only.'}
            </p>
          )}
        </CardFooter>
      </Card>
    </main>
  );
};
