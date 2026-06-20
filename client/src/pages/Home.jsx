import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const Home = () => {
  // Current user and logout function are obtained to display
  const { currentUser } = useContext(AuthContext);
  console.log(currentUser);

  return (
    <main>
      <h1 className='text-3xl p-3'>
        Welcome again, {(currentUser && currentUser.username) || 'Guest'}!
      </h1>
    </main>
  );
};
