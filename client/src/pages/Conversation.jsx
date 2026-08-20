import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  MessageCircleDashed,
  PlusIcon,
  Users,
  X,
} from 'lucide-react';
import { consts, messages as messagesShared } from '@hermyx/shared';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Bubble, BubbleContent, BubbleGroup } from '@/components/ui/bubble';
import {
  Message,
  MessageAvatar,
  MessageContent,
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
  markConversationAsRead,
  sendMessage,
} from '../services/ConversationsServices';
import {
  getConversationMessagesInfiniteQueryOptions,
  getConversationQueryOptions,
} from '../queries/ConversationsQueries';
import { getImageUrl } from '../utils/media';
import { cn } from '@/lib/utils';
import { PAGINATION_LIMIT } from '../consts/consts';
import { messages as frontendMessages } from './../messages/messages';

const groupConsecutiveMessages = (messages) =>
  messages.reduce((groups, message) => {
    const currentGroup = groups.at(-1);

    if (currentGroup?.senderId === message.sender_id) {
      currentGroup.messages.push(message);
      return groups;
    }

    groups.push({
      senderId: message.sender_id,
      messages: [message],
    });

    return groups;
  }, []);

const getInitials = (username) =>
  username
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?';

const MessageBubbleContent = ({ message }) => (
  <BubbleContent className='space-y-2 whitespace-pre-line'>
    {message.attachment_type === 'image' && message.attachment_url && (
      <img
        src={getImageUrl(message.attachment_url)}
        alt='Message attachment'
        className='max-h-64 w-full rounded-lg object-cover'
      />
    )}
    {message.content && <p>{message.content}</p>}
  </BubbleContent>
);

const formatMessageTimestamp = (timestamp) =>
  new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));

const DisputeMessageCard = ({ message, isOwnMessage }) => (
  <article className='overflow-hidden rounded-xl border bg-card shadow-xs'>
    <header className='flex items-center justify-between gap-4 border-b bg-muted/30 px-4 py-3 sm:px-5'>
      <div className='flex min-w-0 items-center gap-3'>
        <Avatar className='size-9 shrink-0 border bg-background'>
          <AvatarImage
            src={getImageUrl(message.sender_avatar)}
            alt={`@${message.sender_username}`}
          />
          <AvatarFallback>
            {getInitials(message.sender_username)}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0'>
          <p className='truncate text-sm font-semibold'>
            {message.sender_username}
            {isOwnMessage && (
              <span className='ml-1 font-normal text-muted-foreground'>
                (You)
              </span>
            )}
          </p>
        </div>
      </div>
      <time
        dateTime={message.created_at}
        className='shrink-0 text-xs text-muted-foreground'
      >
        {formatMessageTimestamp(message.created_at)}
      </time>
    </header>
    <div className='space-y-4 px-4 py-4 text-sm leading-7 whitespace-pre-line sm:px-5'>
      {message.attachment_type === 'image' && message.attachment_url && (
        <img
          src={getImageUrl(message.attachment_url)}
          alt='Message attachment'
          className='max-h-96 max-w-full rounded-lg border object-contain'
        />
      )}
      {message.content && <p>{message.content}</p>}
    </div>
  </article>
);

export const ConversationThread = ({
  conversationId: providedConversationId,
  showBack = true,
  title,
  description,
}) => {
  const { conversationId: routeConversationId } = useParams();
  const conversationId = providedConversationId || routeConversationId;
  const { currentUser, socket } = useContext(AuthContext);
  const [content, setContent] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [liveMessages, setLiveMessages] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const formRef = useRef(null);
  const photoInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const shouldRestoreInputFocusRef = useRef(false);
  const queryClient = useQueryClient();

  const {
    data: conversationData,
    isLoading: isConversationLoading,
    isError: isConversationError,
  } = useQuery(getConversationQueryOptions(conversationId));
  console.log('Conversation data: ', conversationData);
  const otherParticipant = conversationData?.participants?.find(
    (participant) => participant.uid !== currentUser?.id,
  );
  const currentParticipant = conversationData?.participants?.find(
    (participant) => participant.uid === currentUser?.id,
  );
  const conversation = conversationData?.conversation;
  const isMissionConversation = conversation?.type === 'mission';
  const isDisputeConversation = conversation?.type === 'dispute';
  const isHistoryOnly = Boolean(currentParticipant?.history_until);
  const isHistoryView = isHistoryOnly || Boolean(conversation?.closed_at);
  const conversationTitle =
    title ||
    (isMissionConversation
      ? conversation?.mission_title
      : otherParticipant?.username);
  const canSendMessages =
    !conversation?.closed_at && currentParticipant?.can_send !== false;
  const backTo = isDisputeConversation ? '/disputes' : '/conversations';

  const {
    data: messagePages,
    fetchNextPage: fetchOlderMessages,
    hasNextPage: hasOlderMessages,
    isFetchingNextPage: isFetchingOlderMessages,
    isLoading,
    isError,
  } = useInfiniteQuery(
    getConversationMessagesInfiniteQueryOptions(
      conversationId,
      PAGINATION_LIMIT.MESSAGES,
    ),
  );

  const pagedMessages = useMemo(
    () =>
      [...(messagePages?.pages || [])]
        .reverse()
        .flatMap((page) => page.messages),
    [messagePages],
  );

  const messages = useMemo(() => {
    const currentLiveMessages = liveMessages.filter(
      (message) => String(message.conversation_id) === String(conversationId),
    );
    const messagesById = new Map(
      [...pagedMessages, ...currentLiveMessages].map((message) => [
        message.mid,
        message,
      ]),
    );
    return [...messagesById.values()].sort(
      (left, right) => left.mid - right.mid,
    );
  }, [conversationId, liveMessages, pagedMessages]);
  const messageGroups = groupConsecutiveMessages(messages);

  const selectedPhotoPreview = useMemo(
    () => (selectedPhoto ? URL.createObjectURL(selectedPhoto) : ''),
    [selectedPhoto],
  );

  useEffect(() => {
    return () => {
      if (selectedPhotoPreview) URL.revokeObjectURL(selectedPhotoPreview);
    };
  }, [selectedPhotoPreview]);

  useEffect(() => {
    if (!conversationData || !conversationId || !currentParticipant) return;

    const markCurrentConversationAsRead = async () => {
      try {
        await markConversationAsRead(conversationId);
        await queryClient.invalidateQueries({
          queryKey: ['getUnreadMessageCount'],
        });
        await queryClient.invalidateQueries({
          queryKey: ['getDisputeUnreadCount'],
        });
        await queryClient.invalidateQueries({ queryKey: ['getMyDisputes'] });
        await queryClient.invalidateQueries({ queryKey: ['getReports'] });
      } catch (error) {
        console.error('Could not mark conversation as read:', error);
      }
    };

    markCurrentConversationAsRead();
  }, [conversationData, conversationId, currentParticipant, queryClient]);

  useEffect(() => {
    if (!socket || !conversationId || !canSendMessages) return;

    socket.emit('conversation:join', conversationId);

    const handleMessageCreated = async (message) => {
      if (String(message.conversation_id) !== String(conversationId)) return;

      setLiveMessages((currentMessages) => {
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
          await queryClient.invalidateQueries({
            queryKey: ['getDisputeUnreadCount'],
          });
          await queryClient.invalidateQueries({
            queryKey: ['getMyDisputes'],
          });
          await queryClient.invalidateQueries({ queryKey: ['getReports'] });
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
  }, [
    socket,
    conversationId,
    currentUser?.id,
    currentParticipant,
    queryClient,
    canSendMessages,
  ]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => sendMessage(conversationId, content, selectedPhoto),
    onSuccess: (message) => {
      setLiveMessages((currentMessages) =>
        currentMessages.some(
          (currentMessage) => currentMessage.mid === message.mid,
        )
          ? currentMessages
          : [...currentMessages, message],
      );
      setContent('');
      setSelectedPhoto(null);
      setErrorMessage('');
      void queryClient.invalidateQueries({
        queryKey: ['getConversation'],
      });
      void queryClient.invalidateQueries({ queryKey: ['getReports'] });
      void queryClient.invalidateQueries({ queryKey: ['getReport'] });
    },
    onError: (error) => {
      setErrorMessage(
        error?.response?.data?.errors?.general?.[0] ||
          'Could not send message.',
      );
    },
    onSettled: () => {
      window.requestAnimationFrame(() => {
        messageInputRef.current?.focus();
      });
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    shouldRestoreInputFocusRef.current = event.currentTarget.contains(
      document.activeElement,
    );

    if (!content.trim() && !selectedPhoto) {
      shouldRestoreInputFocusRef.current = false;
      messageInputRef.current?.focus();
      return;
    }

    mutate();
  };

  const handlePhotoChange = (event) => {
    const [photo] = event.target.files || [];
    event.target.value = '';

    if (!photo) return;

    if (!consts.MISSION.PHOTOS.ACCEPTED_IMAGE_TYPES.includes(photo.type)) {
      setSelectedPhoto(null);
      setErrorMessage(messagesShared.GENERAL.IMAGE_INVALID_TYPE);
      return;
    }

    if (photo.size > consts.MISSION.PHOTOS.MAX_FILE_SIZE) {
      setSelectedPhoto(null);
      setErrorMessage(messagesShared.GENERAL.IMAGE_TOO_BIG);
      return;
    }

    setSelectedPhoto(photo);
    setErrorMessage('');
    messageInputRef.current?.focus();
  };

  const removeSelectedPhoto = () => {
    setSelectedPhoto(null);
    messageInputRef.current?.focus();
  };

  const handleMessageKeyDown = (event) => {
    if (
      event.key !== 'Enter' ||
      event.shiftKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();

    if (!isPending) {
      formRef.current?.requestSubmit();
    }
  };

  if (isConversationLoading) {
    return (
      <section className='container mx-auto max-w-3xl p-4 sm:p-6'>
        <div className='p-8 text-center text-muted-foreground'>
          Loading conversation
        </div>
      </section>
    );
  }

  if (isConversationError || !conversationData) {
    return (
      <section className='container mx-auto max-w-3xl p-4 sm:p-6'>
        <div className='rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive'>
          Conversation not found
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        'container mx-auto flex flex-col gap-4 p-4 sm:p-6',
        isDisputeConversation ? 'max-w-5xl' : 'max-w-3xl',
      )}
    >
      <MessageScrollerProvider autoScroll defaultScrollPosition='end'>
        <Card
          className={cn(
            'mx-auto w-full gap-0 py-0 flex flex-col',
            'h-[calc(100dvh-8rem)]',
            isDisputeConversation ? 'max-w-5xl' : 'max-w-3xl',
          )}
        >
          <CardHeader className='border-b py-3 flex flex-row justify-between items-center gap-4'>
            <div className='flex items-center gap-3 min-w-0'>
              {!isDisputeConversation && (
                <Avatar className='size-10 shrink-0'>
                  {!isMissionConversation && (
                    <AvatarImage
                      src={getImageUrl(otherParticipant?.avatar)}
                      alt={`@${otherParticipant?.username}`}
                    />
                  )}
                  <AvatarFallback>
                    {isMissionConversation ? (
                      <Users className='h-4 w-4 text-muted-foreground' />
                    ) : (
                      getInitials(otherParticipant?.username)
                    )}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className='flex flex-col min-w-0'>
                <CardTitle asChild className='truncate text-base'>
                  {isDisputeConversation ? (
                    <h1> {conversationTitle || 'Conversation'}</h1>
                  ) : (
                    <h1>
                      <Link
                        to={
                          isMissionConversation
                            ? `/missions/${conversationData?.conversation?.mission_id}`
                            : `/users/${conversationTitle}`
                        }
                        className='hover:underline'
                      >
                        {conversationTitle || 'Conversation'}
                      </Link>
                    </h1>
                  )}
                </CardTitle>

                {(description || isMissionConversation) && (
                  <CardDescription className='truncate text-xs'>
                    {description ||
                      (isHistoryView ? (
                        <>
                          Mission history:{' '}
                          {isHistoryOnly
                            ? 'messages up to the end of your participation'
                            : 'mission finished'}
                        </>
                      ) : (
                        <>
                          Mission group · {conversationData.participants.length}{' '}
                          {conversationData.participants.length === 1
                            ? 'participant'
                            : 'participants'}
                        </>
                      ))}
                  </CardDescription>
                )}
              </div>
            </div>

            {showBack && (
              <Button asChild variant='ghost' className='shrink-0 gap-2 px-2'>
                <Link to={backTo}>
                  <ArrowLeft className='h-4 w-4' aria-hidden='true' />
                  {isDisputeConversation ? `To disputes` : `To conversations`}
                </Link>
              </Button>
            )}
          </CardHeader>

          <CardContent
            className='min-h-0 flex-1 overflow-hidden p-0'
            aria-label='Conversation messages'
          >
            {isLoading ? (
              <div className='flex h-full items-center justify-center'>
                <p className='text-muted-foreground'>Loading messages</p>
              </div>
            ) : isError ? (
              <div className='flex h-full items-center justify-center'>
                <p className='text-destructive'>Could not load messages.</p>
              </div>
            ) : messages.length === 0 ? (
              <div className='flex h-full items-center justify-center'>
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
              </div>
            ) : (
              <MessageScroller>
                <MessageScrollerViewport>
                  <MessageScrollerContent
                    aria-busy={isPending}
                    className={cn('p-5 flex flex-col min-h-full')}
                  >
                    <div
                      className={cn(
                        'mt-auto flex flex-col w-full',
                        isDisputeConversation ? 'gap-4 bg-muted/10' : 'gap-4',
                      )}
                    >
                      {hasOlderMessages && (
                        <div className='flex justify-center pb-4'>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={() => fetchOlderMessages()}
                            disabled={isFetchingOlderMessages}
                          >
                            {isFetchingOlderMessages
                              ? 'Loading older messages'
                              : 'Load older messages'}
                          </Button>
                        </div>
                      )}
                      {isDisputeConversation
                        ? messages.map((message) => (
                            <MessageScrollerItem
                              key={message.mid}
                              messageId={String(message.mid)}
                              scrollAnchor={
                                message.sender_id === currentUser?.id
                              }
                            >
                              <DisputeMessageCard
                                message={message}
                                isOwnMessage={
                                  message.sender_id === currentUser?.id
                                }
                              />
                            </MessageScrollerItem>
                          ))
                        : messageGroups.map((group) => {
                            const firstMessage = group.messages[0];
                            const isOwnMessage =
                              group.senderId === currentUser?.id;

                            return (
                              <MessageScrollerItem
                                key={firstMessage.mid}
                                messageId={String(firstMessage.mid)}
                                scrollAnchor={true}
                              >
                                <Message align={isOwnMessage ? 'end' : 'start'}>
                                  <MessageAvatar>
                                    <Avatar className='size-8'>
                                      <AvatarImage
                                        src={getImageUrl(
                                          firstMessage.sender_avatar,
                                        )}
                                        alt={`@${firstMessage.sender_username}`}
                                      />
                                      <AvatarFallback>
                                        {getInitials(
                                          firstMessage.sender_username,
                                        )}
                                      </AvatarFallback>
                                    </Avatar>
                                  </MessageAvatar>
                                  <MessageContent>
                                    {group.messages.length === 1 ? (
                                      <Bubble
                                        variant={
                                          isOwnMessage ? 'default' : 'muted'
                                        }
                                      >
                                        <MessageBubbleContent
                                          message={firstMessage}
                                        />
                                      </Bubble>
                                    ) : (
                                      <BubbleGroup className='w-full'>
                                        {group.messages.map((message) => (
                                          <Bubble
                                            key={message.mid}
                                            variant={
                                              isOwnMessage ? 'default' : 'muted'
                                            }
                                          >
                                            <MessageBubbleContent
                                              message={message}
                                            />
                                          </Bubble>
                                        ))}
                                      </BubbleGroup>
                                    )}
                                  </MessageContent>
                                </Message>
                              </MessageScrollerItem>
                            );
                          })}
                    </div>
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton className='absolute bottom-4 left-1/2 -translate-x-1/2' />
              </MessageScroller>
            )}
          </CardContent>

          <CardFooter className='flex-col gap-2 border-t-0 bg-card'>
            {canSendMessages ? (
              <form
                ref={formRef}
                onSubmit={handleSubmit}
                className='w-full space-y-2'
              >
                {selectedPhotoPreview && (
                  <div className='flex items-center gap-3 rounded-xl border bg-muted/30 p-2'>
                    <img
                      src={selectedPhotoPreview}
                      alt='Selected attachment preview'
                      className='size-14 rounded-lg object-cover'
                    />
                    <span className='min-w-0 flex-1 truncate text-sm text-muted-foreground'>
                      {selectedPhoto?.name}
                    </span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      onClick={removeSelectedPhoto}
                      disabled={isPending}
                      aria-label='Remove selected photo'
                    >
                      <X className='h-4 w-4' aria-hidden='true' />
                    </Button>
                  </div>
                )}
                <InputGroup
                  className={cn(
                    'h-auto bg-input/50',
                    isDisputeConversation
                      ? 'rounded-lg border-input bg-background'
                      : 'rounded-2xl border-transparent',
                  )}
                >
                  <input
                    ref={photoInputRef}
                    type='file'
                    accept={consts.MISSION.PHOTOS.ACCEPTED_IMAGE_TYPES.join(
                      ',',
                    )}
                    className='sr-only'
                    onChange={handlePhotoChange}
                    disabled={isPending}
                  />
                  <InputGroupTextarea
                    ref={messageInputRef}
                    value={content}
                    onChange={(event) => {
                      setContent(event.target.value);
                      setErrorMessage('');
                    }}
                    onKeyDown={handleMessageKeyDown}
                    placeholder='Write a message'
                    maxLength={1000}
                    className='min-h-14 max-h-32 px-3 py-2.5'
                  />
                  <InputGroupAddon align='block-end' className='pt-1'>
                    <InputGroupButton
                      type='button'
                      variant='outline'
                      size='icon-sm'
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isPending}
                      aria-label='Add photo'
                    >
                      <PlusIcon className='h-4 w-4' aria-hidden='true' />
                    </InputGroupButton>
                    <InputGroupButton
                      type='submit'
                      variant='default'
                      size='icon-sm'
                      className={cn(
                        'ml-auto',
                        isDisputeConversation ? 'rounded-lg' : 'rounded-2xl',
                      )}
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
                {isMissionConversation
                  ? isHistoryOnly
                    ? frontendMessages.CONVERSATION.HISTORY_ONLY
                        .PARTICIPATION_FINISHED
                    : frontendMessages.CONVERSATION.HISTORY_ONLY.MISSION_ENDED
                  : frontendMessages.CONVERSATION.HISTORY_ONLY.NO_EXISTING_USER}
              </p>
            )}
          </CardFooter>
        </Card>
      </MessageScrollerProvider>
    </section>
  );
};

export const Conversation = () => <ConversationThread />;
