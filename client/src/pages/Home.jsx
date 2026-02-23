import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  console.log(currentUser);
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div>
      Home {(currentUser && currentUser.email) || 'Invitado'}
      {currentUser && <button onClick={handleLogout}>Cerrar Sesión</button>}
    </div>
  );
};
