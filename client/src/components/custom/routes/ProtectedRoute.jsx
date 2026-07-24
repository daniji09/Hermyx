import { useContext } from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';

export const ProtectedRoute = ({
  children,
  reverseLogic = false,
  requireAdmin = false,
}) => {
  const { currentUser, isAdmin, isSyncing } = useContext(AuthContext);
  const location = useLocation();

  // If some operation is syncing data with backend, it waits so the web does not flash
  if (isSyncing) return null;

  // If user is not logged in and is needed, it routes to login
  if (!currentUser && !reverseLogic) {
    return <Navigate to='/login' state={{ location }} />;
  }

  // If user is logged in and is needed to not be logged in, it routes to home
  if (currentUser && reverseLogic) {
    return <Navigate to='/' state={{ location }} />;
  }

  // If user needs to be admin and is not, it routes to home
  if (requireAdmin && !isAdmin) {
    return <Navigate to='/' state={{ location }} />;
  }

  return children ? children : <Outlet />;
};
