import * as React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Mail,
  X,
  Menu,
  User,
} from 'lucide-react';
import { consts } from '@hermyx/shared';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from './form/SearchBar';
import { AuthContext } from '../../contexts/AuthContext';
import { useContext, useState } from 'react';
import { getMyNotificationsQueryOptions } from '../../queries/NotificationsQueries';
import { getUnreadMessageCountQueryOptions } from '../../queries/ConversationsQueries';

export function Navbar() {
  // Current user and logout function are obtained to display
  const { currentUser, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: unreadMessageCount = 0 } = useQuery(
    getUnreadMessageCountQueryOptions({
      enabled: !!currentUser,
      staleTime: 30000,
    }),
  );
  return (
    <>
      <header className='sticky top-0 z-[10000] w-full bg-secondary py-3'>
        <nav
          aria-label='Main navigation'
          className='flex w-full items-center justify-between max-w-7xl mx-auto px-3 sm:px-6 lg:px-8'
        >
          <div className='flex shrink-0'>
            <Link
              to='/'
              className='font-bold text-xl text-slate-900 hover:opacity-80 transition-opacity'
              aria-label='Go to Hermyx home page'
            >
              Hermyx
            </Link>
          </div>

          <div className='hidden md:flex items-center justify-end gap-3 lg:gap-6'>
            <section className='flex items-center'>
              <SearchBar
                id='searchMissionByTitle'
                legend='Search mission by title bar.'
                maxLength={consts.SEARCH_MISSION_TITLE_MAX_LENGTH}
              />
            </section>

            {currentUser && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='outline'
                      className='border-none bg-transparent gap-1.5 px-2 hover:bg-slate-200/50'
                      aria-label='Missions menu'
                    >
                      Missions
                      <ChevronDown
                        className='h-4 w-4 opacity-50'
                        aria-hidden='true'
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='z-[10000] w-48'>
                    <DropdownMenuItem asChild className='cursor-pointer'>
                      <Link to='/missions/new'>Create mission</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className='cursor-pointer'>
                      <Link to='/missions/mine'>My missions</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <MessagesLink unreadMessageCount={unreadMessageCount} />
                <NotificationsButton />
                <ProfileLink currentUser={currentUser} />
              </>
            )}

            <LogButton currentUser={currentUser} logout={logout} />
          </div>

          <div className='flex md:hidden'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label='Toggle menu'
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? (
                <X className='h-6 w-6' aria-hidden='true' />
              ) : (
                <Menu className='h-6 w-6' aria-hidden='true' />
              )}
            </Button>
          </div>
        </nav>

        {isMobileMenuOpen && (
          <div className='md:hidden border-t border-slate-200 mt-3 px-3 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200'>
            <SearchBar
              id='searchMissionByTitleMobile'
              legend='Search mission by title bar.'
              maxLength={consts.SEARCH_MISSION_TITLE_MAX_LENGTH}
            />

            {currentUser && (
              <div className='flex flex-col gap-1'>
                <Link
                  to='/profile'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='flex items-center gap-2 px-2 pt-2 pb-6 rounded-md hover:bg-slate-200/50 text-sm font-medium transition-colors'
                >
                  <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                    <User className='h-4 w-4' aria-hidden='true' />
                  </span>
                  {currentUser.username}
                </Link>
                <span className='text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 px-2'>
                  Missions
                </span>
                <Link
                  to='/missions/new'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='px-2 py-2 rounded-md hover:bg-slate-200/50 text-sm font-medium transition-colors'
                >
                  Create mission
                </Link>
                <Link
                  to='/missions/mine'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='px-2 py-2 rounded-md hover:bg-slate-200/50 text-sm font-medium transition-colors'
                >
                  My missions
                </Link>
                <Link
                  to='/notifications'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-200/50 text-sm font-medium transition-colors text-left'
                >
                  <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700'>
                    <Bell className='h-4 w-4' aria-hidden='true' />
                  </span>
                  Notifications
                </Link>
                <Link
                  to='/conversations'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-200/50 text-sm font-medium transition-colors text-left'
                >
                  <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700'>
                    <Mail className='h-4 w-4' aria-hidden='true' />
                  </span>
                  Messages
                  {unreadMessageCount > 0 && (
                    <span className='ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground'>
                      {unreadMessageCount}
                    </span>
                  )}
                </Link>
              </div>
            )}

            <div className='pt-2 border-t border-slate-200'>
              <LogButton currentUser={currentUser} logout={logout} fullWidth />
            </div>
          </div>
        )}
      </header>
      <Separator />
    </>
  );
}

const LogButton = ({ currentUser, logout }) => {
  const navigate = useNavigate();
  let onClick;
  if (currentUser) {
    onClick = async () => {
      await logout();
      navigate('/login');
    };
  } else {
    onClick = () => {
      navigate('/login');
    };
  }
  return (
    <Button className='self-center' onClick={onClick}>
      {currentUser ? 'Log out' : 'Log in'}
    </Button>
  );
};

const MessagesLink = ({ unreadMessageCount }) => {
  return (
    <Button
      asChild
      variant='ghost'
      size='icon'
      className='rounded-full hover:bg-slate-200/50'
    >
      <Link
        to='/conversations'
        aria-label={`Go to my conversations${
          unreadMessageCount > 0
            ? `, ${unreadMessageCount} unread message${
                unreadMessageCount === 1 ? '' : 's'
              }`
            : ''
        }`}
        className='relative'
      >
        <Mail className='h-5 w-5' aria-hidden='true' />
        {unreadMessageCount > 0 && (
          <span className='absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground'>
            {unreadMessageCount}
          </span>
        )}
      </Link>
    </Button>
  );
};

const ProfileLink = ({ currentUser }) => {
  return (
    <Button
      asChild
      variant='ghost'
      className='gap-2 rounded-full px-2 hover:bg-slate-200/50'
    >
      <Link to='/profile' aria-label='Go to my profile'>
        <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
          <User className='h-4 w-4' aria-hidden='true' />
        </span>
        <span className='max-w-20 lg:max-w-28 truncate'>
          {currentUser.username}
        </span>
      </Link>
    </Button>
  );
};

const NotificationsButton = () => {
  const { latestNotification } = useContext(AuthContext);
  const { data } = useQuery(
    getMyNotificationsQueryOptions({
      staleTime: 30000,
    }),
  );
  const notifications = data?.notifications || [];
  const unseenNotifications = notifications.filter(
    (notification) => !notification.seen,
  );
  const previewNotifications = [...unseenNotifications]
    .sort((left, right) => {
      if (left.status === 'pending' && right.status !== 'pending') return -1;
      if (left.status !== 'pending' && right.status === 'pending') return 1;
      return new Date(right.date) - new Date(left.date);
    })
    .slice(0, 5);
  const hasMissionCompletionNotification =
    latestNotification?.type === 'mission';
  const latestNotificationAlreadyPersisted = notifications.some(
    (notification) => notification.nid === latestNotification?.notificationId,
  );
  const hasTransientLatestNotification =
    !!latestNotification && !latestNotificationAlreadyPersisted;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='relative rounded-full hover:bg-slate-200/50'
          aria-label='Open notifications'
        >
          <Bell className='h-5 w-5' aria-hidden='true' />
          {(unseenNotifications.length > 0 ||
            (hasMissionCompletionNotification &&
              !latestNotificationAlreadyPersisted)) && (
            <span className='absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground'>
              {unseenNotifications.length > 0 ? unseenNotifications.length : 1}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        sideOffset={8}
        className='z-[1000000] w-80 p-2'
      >
        <DropdownMenuLabel className='px-2 pt-1 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-900'>
          Notifications
        </DropdownMenuLabel>

        {previewNotifications.length > 0 || hasTransientLatestNotification ? (
          <>
            {latestNotification?.senderUsername &&
              hasTransientLatestNotification && (
                <DropdownMenuItem asChild className='p-0 focus:bg-transparent'>
                  <Link
                    to='/notifications'
                    className='flex w-full items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-white'
                  >
                    <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white'>
                      <Mail className='h-3.5 w-3.5' aria-hidden='true' />
                    </span>
                    <span className='flex min-w-0 flex-1 items-center'>
                      <span className='block text-sm font-medium text-slate-700'>
                        New message from {latestNotification.senderUsername}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              )}
            {hasMissionCompletionNotification &&
              hasTransientLatestNotification && (
                <DropdownMenuItem className='cursor-default rounded-xl border border-dashed border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 focus:bg-transparent focus:text-slate-700'>
                  The mission {latestNotification.missionTitle} was completed by{' '}
                  {latestNotification.adventurerUsername}
                </DropdownMenuItem>
              )}
            {previewNotifications.map((notification, index) => (
              <DropdownMenuItem
                key={notification.nid}
                asChild
                className={`${hasTransientLatestNotification || index > 0 ? 'mt-2' : ''} p-0 focus:bg-transparent`}
              >
                <Link
                  to='/notifications'
                  className='flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-white'
                >
                  <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white'>
                    <Mail className='h-3.5 w-3.5' aria-hidden='true' />
                  </span>
                  <span className='flex min-w-0 flex-1 items-center'>
                    <span className='block text-sm font-medium text-slate-700'>
                      {`Message from ${notification.sender_username}`}
                    </span>
                  </span>
                  <ChevronRight
                    className='h-4 w-4 shrink-0 text-slate-400'
                    aria-hidden='true'
                  />
                </Link>
              </DropdownMenuItem>
            ))}
            {unseenNotifications.length > previewNotifications.length && (
              <DropdownMenuItem
                asChild
                className='mt-2 p-0 focus:bg-transparent'
              >
                <Link
                  to='/notifications'
                  className='block w-full rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50'
                >
                  {unseenNotifications.length - previewNotifications.length}{' '}
                  more notification
                  {unseenNotifications.length - previewNotifications.length > 1
                    ? 's'
                    : ''}
                </Link>
              </DropdownMenuItem>
            )}
          </>
        ) : (
          <>
            {hasMissionCompletionNotification &&
            hasTransientLatestNotification ? (
              <DropdownMenuItem className='cursor-default rounded-xl px-3 py-3 text-sm text-slate-900 focus:bg-transparent focus:text-slate-900'>
                The mission {latestNotification.missionTitle} was completed by{' '}
                {latestNotification.adventurerUsername}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className='cursor-default rounded-xl px-3 py-3 text-sm text-slate-900 focus:bg-transparent focus:text-slate-900'>
                No notifications yet.
              </DropdownMenuItem>
            )}
          </>
        )}

        <DropdownMenuSeparator className='mx-0 my-2' />
        <DropdownMenuItem
          asChild
          className='rounded-xl px-3 py-2 text-sm font-medium text-slate-900'
        >
          <Link to='/notifications'>All messages</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
