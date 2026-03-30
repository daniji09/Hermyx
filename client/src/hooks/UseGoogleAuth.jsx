import { useMutation } from '@tanstack/react-query';
import { signInWithGoogle } from '../services/AuthServices';
import { syncUserWithGoogleAccount } from '../services/UsersServices';
import { getAdditionalUserInfo } from 'firebase/auth';
import { messages } from '@hermyx/shared';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export const UseGoogleAuth = () => {
  const { logout, setIsSyncing } = useContext(AuthContext);
  // Button action, Google sign up using mutation
  return useMutation({
    onMutate: () => {
      setIsSyncing(true);
    },
    mutationFn: async () => {
      let isNewUser, user;
      try {
        // Signs in with Google
        const result = await signInWithGoogle();
        user = result.user;

        // Gets additional info of the user signed in, used for knowing if it is a signup or a login
        const userDetails = getAdditionalUserInfo(result);
        isNewUser = userDetails.isNewUser;
        console.log(result, userDetails);
        // Backend sync
        const data = await syncUserWithGoogleAccount(
          user.email,
          user.email?.split('@')[0],
          user.uid,
          !!isNewUser,
        );
        return data;
      } catch (error) {
        console.log(error);
        // First of all, rollback of Firebase action is made
        isNewUser ? await user.delete() : await logout();

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
  });
};
