import { useContext } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const user = useContext(AuthContext);
  const location = useLocation();

  if (!user) return <Navigate to='/login' state={{ location }} />;

  return children;
};
