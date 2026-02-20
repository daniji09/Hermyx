import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  console.log(user);
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div>
      Home {user.email}
      {user && <button onClick={handleLogout}>Cerrar Sesión</button>}
    </div>
  );
};
