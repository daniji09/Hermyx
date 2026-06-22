import { useMutation } from '@tanstack/react-query';
import { signInWithGoogle } from '../services/AuthServices';
import {
  deleteUserByUid,
  syncUserWithGoogleAccount,
} from '../services/UsersServices';
import { getAdditionalUserInfo } from 'firebase/auth';
import { messages } from '@hermyx/shared';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const UseGoogleAuth = () => {
  const { logout, setIsSyncing, setCurrentUser } = useContext(AuthContext);
  const navigate = useNavigate();
  // Button action, Google sign up using mutation
  return useMutation({
    onMutate: () => {
      setIsSyncing(true);
    },
    mutationFn: async () => {
      let isNewUser, user, data;
      try {
        // Signs in with Google
        const result = await signInWithGoogle();
        user = result.user;

        // Gets additional info of the user signed in, used for knowing if it is a signup or a login
        const userDetails = getAdditionalUserInfo(result);
        isNewUser = userDetails.isNewUser;

        // Backend sync
        data = await syncUserWithGoogleAccount(
          user.email,
          user.email?.split('@')[0],
          user.uid,
          !!isNewUser,
        );

        const dbUser = data.user || data.checkedUser;
        setCurrentUser({
          firebaseUid: user.uid,
          email: user.email,
          id: dbUser.id || dbUser.uid,
          username: dbUser.username,
        });
        return data;
      } catch (error) {
        console.log(error);
        // First of all, rollback of Firebase action is made
        isNewUser ? await user.delete() : await logout();

        // Then, user is deleted from db if it was created
        if (isNewUser) await deleteUserByUid(data.uid);

        // Controlled errors thrown from backend
        if (
          [400, 401, 403, 499, 500].includes(error.response?.status) &&
          error.response.data?.errors
        )
          throw {
            errors: error.response.data.errors,
          };

        // Any other error
        const errorMessage =
          error.response?.data?.message ||
          error.errors?.general[0] ||
          messages.UNEXPECTED_ERROR;

        throw {
          errors: { general: [errorMessage] },
        };
      }
    },
    onSettled: () => {
      setIsSyncing(false);
    },
    onSuccess: () => {
      navigate('/');
    },
  });
};
