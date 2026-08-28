import * as React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useContext, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeProvider';
import { SearchBar } from './form/SearchBar';
import { getImageUrl } from '@/utils/media';
import { getDisplayName, getInitials } from '@/utils/avatar';

// Icons
import {
  Bell,
  X,
  Menu,
  MessageSquareWarning,
  User,
  Moon,
  Sun,
  LogOut,
  ChevronDown,
  Plus,
  ChevronRight,
  MessageCircle,
  Map,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Constants & Queries
import { consts } from '@hermyx/shared';
import { getMyNotificationsQueryOptions } from '../../queries/NotificationsQueries';
import { getUnreadMessageCountQueryOptions } from '../../queries/ConversationsQueries';
import { getDisputeUnreadCountQueryOptions } from '../../queries/DisputesQueries';
import { PAGINATION_LIMIT } from '../../consts/consts';

export function Navbar() {
  const { currentUser, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { setTheme } = useTheme();

  // Queries
  const { data: unreadMessageCount = 0 } = useQuery(
    getUnreadMessageCountQueryOptions({
      enabled: !!currentUser && !currentUser.isAdmin,
      staleTime: 30000,
    }),
  );

  const { data: unreadDisputeCount = 0 } = useQuery(
    getDisputeUnreadCountQueryOptions({
      enabled: !!currentUser,
      staleTime: 30000,
    }),
  );

  return (
    <>
      <header className='sticky top-0 z-50 w-full border-b bg-secondary '>
        <nav
          aria-label='Main navigation'
          className='flex w-full items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 h-16'
        >
          <div className='flex shrink-0 items-center gap-4'>
            <Link
              to='/'
              className='flex items-center gap-2 text-foreground hover:opacity-80 transition-opacity'
            >
              <img
                src='/images/logo.svg'
                alt='Hermyx'
                className='h-9 w-auto max-w-36'
              />
              <span className='font-extrabold text-2xl tracking-tight'>
                Hermyx
              </span>
            </Link>
          </div>

          <div className='hidden md:flex items-center justify-end gap-8 flex-1 ml-10'>
            <div className='flex-1 max-w-5xl mr-auto'>
              <SearchBar
                id='searchMissionByTitle'
                legend='Search service by title bar.'
                maxLength={consts.SEARCH_MISSION_TITLE_MAX_LENGTH}
              />
            </div>

            {currentUser ? (
              currentUser.isAdmin ? (
                <UserDropdown
                  currentUser={currentUser}
                  logout={logout}
                  unreadDisputeCount={unreadDisputeCount}
                />
              ) : (
                <>
                  <Button asChild size='sm'>
                    <Link to='/missions/new'>
                      <Plus
                        className='mr-0 lg:mr-2 h-4 w-4'
                        aria-hidden='true'
                        aria-label='Create service'
                      />
                      <span className='hidden lg:flex'>Create Service</span>
                    </Link>
                  </Button>
                  <NotificationsButton />
                  <UserDropdown
                    currentUser={currentUser}
                    logout={logout}
                    unreadMessageCount={unreadMessageCount}
                    unreadDisputeCount={unreadDisputeCount}
                  />
                </>
              )
            ) : (
              <LogButton currentUser={currentUser} logout={logout} />
            )}

            <ThemeToggle setTheme={setTheme} />
          </div>

          <div className='flex md:hidden items-center gap-2'>
            <Button
              variant='ghost'
              size='icon'
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className='h-6 w-6' aria-hidden='true' />
              ) : (
                <Menu className='h-6 w-6' aria-hidden='true' />
              )}
            </Button>
            <ThemeToggle setTheme={setTheme} />
          </div>
        </nav>
        {isMobileMenuOpen && (
          <div className='md:hidden border-t bg-background px-4 py-4 space-y-4 shadow-lg'>
            <SearchBar
              id='searchMissionByTitleMobile'
              legend='Search service by title bar.'
              maxLength={consts.SEARCH_MISSION_TITLE_MAX_LENGTH}
            />

            {currentUser ? (
              <div className='flex flex-col gap-1'>
                <Link
                  to='/profile'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='flex items-center gap-3 px-2 py-3 mb-2 rounded-md bg-muted/50 text-sm font-semibold'
                >
                  <Avatar className='h-10 w-10 border border-primary/10'>
                    <AvatarImage src={getImageUrl(currentUser.avatar)} />
                    <AvatarFallback>
                      <User className='h-5 w-5' aria-hidden='true' />
                    </AvatarFallback>
                  </Avatar>
                  <div className='flex flex-col'>
                    <span>{currentUser.username}</span>
                    <span className='text-xs font-normal text-muted-foreground'>
                      View profile
                    </span>
                  </div>
                </Link>

                <MobileNavLink
                  to='/missions/new'
                  icon={Plus}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Create service
                </MobileNavLink>
                <MobileNavLink
                  to='/missions/mine'
                  icon={Map}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  My services
                </MobileNavLink>
                <MobileNavLink
                  to='/notifications'
                  icon={Bell}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Notifications
                </MobileNavLink>
                <MobileNavLink
                  to='/conversations'
                  icon={MessageCircle}
                  badge={unreadMessageCount}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Messages
                </MobileNavLink>
                <MobileNavLink
                  to={currentUser.isAdmin ? '/reports' : '/disputes'}
                  icon={MessageSquareWarning}
                  badge={unreadDisputeCount}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {currentUser.isAdmin ? 'Reports' : 'Disputes'}
                </MobileNavLink>

                <div className='pt-4 pb-2 border-t mt-2'>
                  <Button
                    variant='destructive'
                    className='w-full'
                    onClick={logout}
                  >
                    <LogOut className='mr-2 h-4 w-4' aria-hidden='true' /> Log
                    out
                  </Button>
                </div>
              </div>
            ) : (
              <div className='pt-2 pb-2'>
                <LogButton
                  currentUser={currentUser}
                  logout={logout}
                  fullWidth
                />
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}

const UserDropdown = ({
  currentUser,
  logout,
  unreadMessageCount = 0,
  unreadDisputeCount = 0,
}) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const totalUnread = unreadMessageCount + unreadDisputeCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='gap-2 rounded-full pl-1 pr-3 hover:bg-accent relative'
        >
          <div className='relative'>
            <Avatar className='h-8 w-8 border border-primary/20'>
              <AvatarImage
                src={getImageUrl(currentUser.avatar)}
                alt={currentUser.username}
              />
              <AvatarFallback>
                {getInitials(getDisplayName(currentUser))}
              </AvatarFallback>
            </Avatar>

            {totalUnread > 0 && (
              <span className='absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background'>
                <span className='sr-only'>
                  You have {totalUnread} unread items
                </span>
                <span aria-hidden='true'>{totalUnread}</span>
              </span>
            )}
          </div>

          <span className='max-w-25 truncate font-semibold text-sm'>
            {currentUser.username}
          </span>
          <ChevronDown className='h-4 w-4 opacity-50' aria-hidden='true' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-60'>
        <DropdownMenuLabel className='font-normal'>
          <div className='flex flex-col space-y-1'>
            <p className='text-sm font-medium leading-none'>
              {currentUser.username}
            </p>
            <p className='text-xs leading-none text-muted-foreground'>
              {currentUser.email || 'Collaborator account'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {!currentUser.isAdmin && (
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link to='/profile' className='cursor-pointer'>
                <User className='mr-2 h-4 w-4' aria-hidden='true' /> My profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to='/missions/mine' className='cursor-pointer'>
                <Map className='mr-2 h-4 w-4' aria-hidden='true' /> My services
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {!currentUser.isAdmin && (
            <DropdownMenuItem asChild>
              <Link
                to='/conversations'
                className='cursor-pointer flex w-full justify-between items-center'
              >
                <div className='flex items-center'>
                  <MessageCircle
                    className='mr-3.5 h-4 w-4'
                    aria-hidden='true'
                  />{' '}
                  Conversations
                </div>
                {unreadMessageCount > 0 && (
                  <span className='flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground'>
                    <span className='sr-only'>
                      {unreadMessageCount} unread messages
                    </span>
                    <span aria-hidden='true'>{unreadMessageCount}</span>
                  </span>
                )}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link
              to={currentUser.isAdmin ? '/reports' : '/disputes'}
              className='cursor-pointer flex w-full justify-between items-center'
            >
              <div className='flex items-center'>
                <MessageSquareWarning
                  className='mr-3.5 h-4 w-4'
                  aria-hidden='true'
                />
                {currentUser.isAdmin ? 'Platform reports' : 'Disputes'}
              </div>
              {unreadDisputeCount > 0 && (
                <span className='flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground'>
                  <span className='sr-only'>
                    {unreadDisputeCount} unread disputes
                  </span>
                  <span aria-hidden='true'>{unreadDisputeCount}</span>
                </span>
              )}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className='text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer'
        >
          <LogOut className='mr-2 h-4 w-4' aria-hidden='true' /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ThemeToggle = ({ setTheme }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant='ghost' size='icon' className='rounded-full'>
        <Sun
          className='h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0'
          aria-hidden='true'
        />
        <Moon
          className='absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100'
          aria-hidden='true'
        />
        <span className='sr-only'>Toggle theme</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align='end'>
      <DropdownMenuItem onClick={() => setTheme('light')}>
        Light
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme('dark')}>Dark</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const MobileNavLink = ({ to, icon: Icon, badge, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className='flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent text-sm font-medium transition-colors text-foreground'
  >
    {Icon && (
      <Icon className='h-5 w-5 text-muted-foreground' aria-hidden='true' />
    )}
    {children}
    {badge > 0 && (
      <span className='ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground'>
        <span className='sr-only'>{badge} unread items</span>
        <span aria-hidden='true'>{badge}</span>
      </span>
    )}
  </Link>
);

const LogButton = ({ currentUser, logout, fullWidth }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const onClick = async () => {
    if (currentUser) {
      await logout();
      navigate('/login');
      return;
    }

    if (location.pathname === '/login') {
      navigate('/signup');
    } else {
      navigate('/login');
    }
  };

  let buttonText = 'Log in';
  if (currentUser) {
    buttonText = 'Log out';
  } else if (location.pathname === '/login') {
    buttonText = 'Sign up';
  }

  return (
    <Button
      variant={currentUser ? 'secondary' : 'default'}
      className={fullWidth ? 'w-full' : ''}
      onClick={onClick}
    >
      {buttonText}
    </Button>
  );
};

const NotificationsButton = () => {
  const { latestNotification } = useContext(AuthContext);
  const { data } = useQuery(
    getMyNotificationsQueryOptions(PAGINATION_LIMIT.NOTIFICATIONS, {
      staleTime: 30000,
    }),
  );

  const notifications = data?.notifications || [];
  const unseenNotifications = notifications.filter((n) => !n.seen);
  const unseenCount = data?.totalUnseen ?? unseenNotifications.length;

  const previewNotifications = [...unseenNotifications]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const hasMissionCompletion = latestNotification?.type === 'mission';
  const isTransient =
    !!latestNotification &&
    !notifications.some((n) => n.nid === latestNotification.notificationId);

  const ariaLabelText =
    unseenCount > 0
      ? `${unseenCount} unread notifications`
      : 'Open notifications';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='lg'
          className='relative rounded-full '
          aria-label={ariaLabelText}
        >
          <Bell className='h-5 w-5' aria-hidden='true' />
          {(unseenCount > 0 || (hasMissionCompletion && isTransient)) && (
            <span
              aria-hidden='true'
              className='absolute 0 right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background'
            >
              {unseenCount > 0 ? unseenCount : 1}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' sideOffset={8} className='w-80 p-2'>
        <DropdownMenuLabel className='px-2 pt-1 pb-2 text-sm font-bold text-muted-foreground'>
          Notifications
        </DropdownMenuLabel>
        {previewNotifications.length > 0 || isTransient ? (
          <div className='space-y-1'>
            {isTransient && hasMissionCompletion && (
              <DropdownMenuItem className='cursor-default rounded-xl bg-muted/50 p-3 text-sm'>
                Service {latestNotification.missionTitle} was completed by{' '}
                {latestNotification.adventurerUsername}
              </DropdownMenuItem>
            )}
            {previewNotifications.map((notification) => (
              <DropdownMenuItem key={notification.nid} asChild className='p-0'>
                <Link
                  to='/notifications'
                  className='flex w-full items-center gap-3 rounded-xl p-2 hover:bg-accent'
                >
                  <span className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
                    <MessageCircle className='h-4 w-4' aria-hidden='true' />
                  </span>
                  <span className='flex-1 truncate text-sm font-medium'>
                    Message from {notification.sender_username}
                  </span>
                  <ChevronRight
                    className='h-4 w-4 text-muted-foreground'
                    aria-hidden='true'
                  />
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        ) : (
          <div className='p-4 text-center text-sm text-muted-foreground'>
            No new notifications.
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className='justify-center font-medium'>
          <Link to='/notifications'>View all</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
