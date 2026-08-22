import { useContext } from 'react';
import { useLocation, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../../contexts/AuthContext';
import { getProtectedRouteRedirect } from './protectedRoute.utils';

export const ProtectedRoute = ({
  children,
  reverseLogic = false,
  requireAdmin = false,
  requireRegularUser = false,
}) => {
  // IsSyncing is needed in each if conditional, it must never be something like if(!isSyncing) return null;
  const { currentUser, isAdmin, isSyncing } = useContext(AuthContext);
  const location = useLocation();
  const redirectTo = getProtectedRouteRedirect({
    currentUser,
    isAdmin,
    isSyncing,
    reverseLogic,
    requireAdmin,
    requireRegularUser,
  });

  if (redirectTo)
    return (
      <Navigate
        to={redirectTo}
        state={{ location }}
        replace={redirectTo === '/reports'}
      />
    );

  return children ? children : <Outlet />;
};
