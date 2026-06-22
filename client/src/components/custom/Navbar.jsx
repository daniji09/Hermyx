import * as React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, X, Menu } from 'lucide-react';
import { consts } from '@hermyx/shared';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from './form/SearchBar';
import { AuthContext } from '../../contexts/AuthContext';
import { useContext, useState } from 'react';

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
