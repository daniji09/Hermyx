import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { getMe } from '../services/UsersServices';
import { useQueryClient } from '@tanstack/react-query';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // States for current user and loading state that happens when this component is mounted
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // Detects sync operation not finished, blocking automatic redirects
  const isSyncingRef = useRef(false);
  const queryClient = useQueryClient();

  const updateIsSyncing = (value) => {
    setIsSyncing(value);
    isSyncingRef.current = value;
  };

  // Loads the Firebase role and Hermyx account into the shared user state.
  const loadCurrentUser = useCallback(
    async (firebaseUser = auth.currentUser) => {
      if (!firebaseUser) return null;

      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        const userIsAdmin = !!tokenResult.claims.admin;
        const hermyxUser = await getMe();

        // Ignore the response if the authenticated user changed while loading.
        if (auth.currentUser?.uid !== firebaseUser.uid) return null;

        const nextUser = {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          id: hermyxUser.uid ?? hermyxUser.id,
          username: hermyxUser.username,
          name: hermyxUser.name,
          surnames: hermyxUser.surnames,
          avatar: hermyxUser.avatar,
          isAdmin: userIsAdmin,
        };

        setIsAdmin(userIsAdmin);
        setCurrentUser(nextUser);
        return nextUser;
      } catch (error) {
        if (auth.currentUser?.uid === firebaseUser.uid) {
          console.error('Could not load the authenticated user:', error);
          setCurrentUser(null);
          setIsAdmin(false);
        }

        throw error;
      } finally {
        if (auth.currentUser?.uid === firebaseUser.uid) {
          setLoading(false);
        }
      }
    },
    [],
  );

  // The state changed flag is only activated once per mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Google sign-in must finish its backend sync before /users/me is called.
      if (isSyncingRef.current) return;

      loadCurrentUser(firebaseUser).catch(() => {});
    });

    return unsubscribe;
  }, [loadCurrentUser]);

  // Function to logout
  const logout = async () => {
    try {
      await signOut(auth);
      setIsAdmin(false);
      queryClient.clear();
    } catch (error) {
      console.error('Could not logout: ', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        isAdmin,
        loading,
        loadCurrentUser,
        logout,
        isSyncing,
        setIsSyncing: updateIsSyncing,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
