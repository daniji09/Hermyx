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
import { getMyInvitationsQueryOptions } from '../../queries/InvitationsQueries';

export function Navbar() {
  // Current user and logout function are obtained to display
  const { currentUser, logout } = useContext(AuthContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  return (
    <>
      <header className='sticky top-0 w-full bg-secondary py-3'>
        <nav
          aria-label='Main navigation'
          className='flex w-full items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'
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

          <div className='hidden md:flex items-center gap-6 lg:gap-10'>
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
                      Missions{' '}
                      <ChevronDown
                        className='h-4 w-4 opacity-50'
                        aria-hidden='true'
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-48'>
                    <DropdownMenuItem asChild className='cursor-pointer'>
                      <Link to='/missions/new'>Create mission</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className='cursor-pointer'>
                      <Link to='/missions/mine'>My missions</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

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
          <div className='md:hidden border-t border-slate-200 mt-3 px-4 py-4 space-y-4 animate-in slide-in-from-top-2 duration-200'>
            <SearchBar
              id='searchMissionByTitleMobile'
              legend='Search mission by title bar.'
              maxLength={consts.SEARCH_MISSION_TITLE_MAX_LENGTH}
            />

            {currentUser && (
              <div className='flex flex-col gap-1 pt-2'>
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
                  to='/profile'
                  onClick={() => setIsMobileMenuOpen(false)}
                  className='flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-200/50 text-sm font-medium transition-colors'
                >
                  <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground'>
                    <User className='h-4 w-4' aria-hidden='true' />
                  </span>
                  {currentUser.username}
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
        <span className='max-w-28 truncate'>{currentUser.username}</span>
      </Link>
    </Button>
  );
};

const NotificationsButton = () => {
  const { latestNotification } = useContext(AuthContext);
  const { data } = useQuery(
    getMyInvitationsQueryOptions({
      staleTime: 30000,
    }),
  );
  const invitations = data?.invitations || [];
  const unseenInvitations = invitations.filter(
    (invitation) => !invitation.seen,
  );
  const previewInvitation = unseenInvitations[0];

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
          {unseenInvitations.length > 0 && (
            <span className='absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground'>
              {unseenInvitations.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' sideOffset={8} className='w-80 p-2'>
        {previewInvitation ? (
          <>
            <DropdownMenuLabel className='px-2 pt-1 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400'>
              Messages
            </DropdownMenuLabel>

            <DropdownMenuItem asChild className='p-0 focus:bg-transparent'>
              <Link
                to={`/notifications?invitation=${previewInvitation.iid}`}
                className='flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors hover:border-slate-300 hover:bg-white'
              >
                <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white'>
                  <Mail className='h-3.5 w-3.5' aria-hidden='true' />
                </span>
                <span className='flex min-w-0 flex-1 items-center'>
                  <span className='block text-sm font-semibold text-slate-900'>
                    Tienes un mensaje de {previewInvitation.sender_username}
                  </span>
                </span>
                <ChevronRight
                  className='h-4 w-4 shrink-0 text-slate-400'
                  aria-hidden='true'
                />
              </Link>
            </DropdownMenuItem>
            {latestNotification?.senderUsername &&
              latestNotification.senderUsername !==
                previewInvitation.sender_username && (
                <DropdownMenuItem
                  asChild
                  className='mt-2 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-sm font-medium text-slate-700'
                >
                  <Link
                    to={`/notifications?invitation=${latestNotification.invitationId}`}
                  >
                    Tienes un mensaje de {latestNotification.senderUsername}
                  </Link>
                </DropdownMenuItem>
              )}
            <DropdownMenuSeparator className='mx-0 my-2' />
            <DropdownMenuItem
              asChild
              className='rounded-xl px-3 py-2 text-sm font-semibold text-slate-700'
            >
              <Link to='/notifications'>Open messages</Link>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuLabel className='px-2 pt-1 pb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400'>
              Messages
            </DropdownMenuLabel>
            <DropdownMenuItem className='cursor-default rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500 focus:bg-slate-50 focus:text-slate-500'>
              No messages yet
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
