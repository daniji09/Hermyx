import { useContext, useActionState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from './../components/custom/form/SearchBar';
import { initialStateUseStateAction } from '../consts/consts';
import { searchMissionByTitleAction } from '../actions/MissionActions';
import { consts } from '@hermyx/shared';

export const Home = () => {
  const navigate = useNavigate();

  // Current user and logout function are obtained to display
  const { currentUser, logout } = useContext(AuthContext);
  console.log(currentUser);

  // When logout is completed, it redirects to login
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // For search bar
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
    <main>
      <div>
        Home {(currentUser && currentUser.email) || 'Guest'}
        {currentUser && <button onClick={handleLogout}>Cerrar Sesión</button>}
      </div>
      <section className='flex'>
        <SearchBar
          id='searchMissionByTitle'
          action={searchMissionByTitleFormAction}
          legend='Search mission by title bar.'
          isPending={isPending}
          maxLength={consts.SEARCH_MISSION_TITLE_MAX_LENGTH}
        ></SearchBar>
      </section>
    </main>
  );
};
