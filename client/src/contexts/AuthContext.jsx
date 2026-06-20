import { createContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { getUserByFirebaseUid } from '../services/UsersServices';
import { useQueryClient } from '@tanstack/react-query';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // States for current user and loading state that happens when this component is mounted
  const [currentUser, setCurrentUser] = useState();
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false); // Detects sync operation not finished, blocking automatic redirects
  const queryClient = useQueryClient();

  // The state changed flag is only activated once per mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      // User Firebase information is added to user Hermyx information
      if (firebaseUser) {
        let hermyxUser;
        try {
          hermyxUser = await getUserByFirebaseUid(firebaseUser.uid);
          setCurrentUser({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            id: hermyxUser.uid,
            username: hermyxUser.username,
          });
        } catch (e) {
          console.log(e);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Function to logout
  const logout = async () => {
    try {
      await signOut(auth);
      queryClient.clear();
    } catch (error) {
      console.error('Could not logout: ', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{ currentUser, loading, logout, isSyncing, setIsSyncing }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
