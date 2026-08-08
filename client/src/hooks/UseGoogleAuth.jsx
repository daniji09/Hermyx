import { useMutation } from '@tanstack/react-query';
import { signInWithGoogle } from '../services/AuthServices';
import { syncUserWithGoogleAccount } from '../services/AuthServices';
import { messages } from '@hermyx/shared';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UseGoogleAuth = () => {
  const { logout, setIsSyncing, setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();

  return useMutation({
    onMutate: () => setIsSyncing(true),

    mutationFn: async () => {
      try {
        // Sign in with Google
        const result = await signInWithGoogle();
        const user = result.user;

        // Sync with backend
        const data = await syncUserWithGoogleAccount(
          user.email,
          user.email?.split('@')[0],
          user.uid,
        );

        // State is saved in React
        const dbUser = data.user || data.checkedUser;
        setCurrentUser({
          firebaseUid: user.uid,
          email: user.email,
          id: dbUser.id || dbUser.uid,
          username: dbUser.username,
          avatar: dbUser.avatar,
        });

        return data;
      } catch (error) {
        // If there is problem, a logout is made. A delete must not be done, due to reasons: in any case backend will
        // Handle errors and having a delete endpoint is very dangerous
        await logout();

        if (
          [400, 401, 403, 404, 409, 500].includes(error.response?.status) &&
          error.response.data?.errors
        ) {
          throw { errors: error.response.data.errors };
        }

        // Error inesperado
        const errorMessage =
          error.response?.data?.message || messages.UNEXPECTED_ERROR;
        throw { errors: { general: [errorMessage] } };
      }
    },
    onSettled: () => setIsSyncing(false),
    onSuccess: () => navigate('/'),
  });
};
