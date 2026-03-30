import { useContext } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, reverseLogic = false }) => {
  const { currentUser, isSyncing } = useContext(AuthContext);
  const location = useLocation();

  if (!currentUser && !reverseLogic && !isSyncing)
    return <Navigate to='/login' state={{ location }} />;
  else if (currentUser && reverseLogic && !isSyncing)
    return <Navigate to='/home' state={{ location }} />;

  return children;
};
