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
import { ChevronDown } from 'lucide-react';

import { initialStateUseStateAction } from '../../consts/consts';
import { searchMissionByTitleAction } from '../../actions/MissionActions';
import { consts } from '@hermyx/shared';
import { useActionState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from './form/SearchBar';
import { AuthContext } from '../../contexts/AuthContext';
import { useContext } from 'react';

export function Navbar() {
  // Current user and logout function are obtained to display
  const { currentUser, logout } = useContext(AuthContext);

  // For search bar
  const navigate = useNavigate();
  const [state, searchMissionByTitleFormAction, isPending] = useActionState(
    searchMissionByTitleAction,
    initialStateUseStateAction,
  );

  useEffect(() => {
    if (state.success) {
      const destination = `/missions?title=${encodeURIComponent(state.data.searchMissionByTitle_input)}`;
      navigate(destination);
    }
  }, [state.success, state.data, navigate]);

  return (
    <>
      <header className='w-full bg-secondary py-2'>
        <nav
          aria-label='Main navigation'
          className='flex w-full items-center justify-between max-w-400 mx-auto px-8'
        >
          <div className='flex shrink-0'>
            <Link
              to='/'
              className='font-bold text-lg text-slate-900 hover:opacity-80 transition-opacity'
              aria-label='Go to Hermyx home page'
            >
              Hermyx
            </Link>
          </div>

          <div className='flex gap-10'>
            <section className='flex self-center'>
              <SearchBar
                id='searchMissionByTitle'
                action={searchMissionByTitleFormAction}
                legend='Search mission by title bar.'
                isPending={isPending}
                maxLength={consts.SEARCH_MISSION_TITLE_MAX_LENGTH}
              ></SearchBar>
            </section>
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className='flex'>
                    <Button
                      variant='outline'
                      className='border-none bg-transparent'
                      aria-label='Missions menu'
                    >
                      Missions
                    </Button>
                    <ChevronDown className='self-center px-1' />
                  </div>
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
            <LogButton currentUser={currentUser} logout={logout}></LogButton>
          </div>
        </nav>
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
