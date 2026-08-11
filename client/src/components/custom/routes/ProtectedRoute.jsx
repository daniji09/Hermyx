import { useContext } from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';

export const ProtectedRoute = ({
  children,
  reverseLogic = false,
  requireAdmin = false,
}) => {
  // IsSyncing is needed in each if conditional, it must never be something like if(!isSyncing) return null;
  const { currentUser, isAdmin, isSyncing } = useContext(AuthContext);
  const location = useLocation();

  // If user is not logged in and is needed, it routes to login
  if (!currentUser && !reverseLogic && !isSyncing) {
    return <Navigate to='/login' state={{ location }} />;
  }

  // If user is logged in and is needed to not be logged in, it routes to home
  if (currentUser && reverseLogic && !isSyncing) {
    return <Navigate to='/' state={{ location }} />;
  }

  // If user needs to be admin and is not, it routes to home
  if (requireAdmin && !isAdmin && !isSyncing) {
    return <Navigate to='/' state={{ location }} />;
  }

  return children ? children : <Outlet />;
};
