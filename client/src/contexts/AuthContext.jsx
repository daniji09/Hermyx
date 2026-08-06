import { createContext, useEffect, useRef, useState } from 'react';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { getUserByFirebaseUid } from '../services/UsersServices';
import { useQueryClient } from '@tanstack/react-query';

import { createSocketConnection } from '../services/SocketService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // States for current user and loading state that happens when this component is mounted
  const [currentUser, setCurrentUser] = useState();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // Detects sync operation not finished, blocking automatic redirects
  const [latestNotification, setLatestNotification] = useState(null);
  const isSyncingRef = useRef(false);
  const queryClient = useQueryClient();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  const updateIsSyncing = (value) => {
    setIsSyncing(value);
    isSyncingRef.current = value;
  };

  // The state changed flag is only activated once per mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      // User Firebase information is added to user Hermyx information
      if (firebaseUser) {
        if (isSyncingRef.current) {
          setLoading(false);
          return;
        }
        let hermyxUser;
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          const userIsAdmin = !!tokenResult.claims.admin;
          setIsAdmin(userIsAdmin);
          hermyxUser = await getUserByFirebaseUid(firebaseUser.uid);

          setCurrentUser({
            firebaseUid: firebaseUser.uid,
            email: firebaseUser.email,
            id: hermyxUser.uid,
            username: hermyxUser.username,
            avatar: hermyxUser.avatar,
            isAdmin: userIsAdmin,
          });
        } catch (e) {
          console.log(e.message);
          setCurrentUser(null);
          setIsAdmin(false);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const connectSocket = async () => {
      if (!auth.currentUser || !currentUser) {
        socketRef.current?.disconnect();
        socketRef.current = null;
        setSocket(null);
        return;
      }

      if (socketRef.current) {
        return;
      }

      try {
        const token = await auth.currentUser.getIdToken();

        socketRef.current = createSocketConnection(token);
        setSocket(socketRef.current);

        socketRef.current.on('connect', () => {
          console.log('Socket connected:', socketRef.current.id);
        });

        socketRef.current.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
        });

        socketRef.current.on('notification:created', (payload) => {
          console.log('New notification:', payload);
          setLatestNotification(payload);
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMyConversations'] });
        });

        socketRef.current.on('conversation:message-received', () => {
          queryClient.invalidateQueries({
            queryKey: ['getUnreadMessageCount'],
          });
          queryClient.invalidateQueries({ queryKey: ['getMyConversations'] });
        });

        socketRef.current.on('conversation:closed', (payload) => {
          queryClient.invalidateQueries({
            queryKey: ['getConversation', String(payload.conversationId)],
          });
          queryClient.invalidateQueries({ queryKey: ['getMyConversations'] });
        });

        socketRef.current.on('mission:participation-submitted', (payload) => {
          console.log('Participation submitted notification:', payload);
          setLatestNotification(payload);
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({
            queryKey: ['getMission', String(payload.missionId)],
          });
          queryClient.invalidateQueries({ queryKey: ['getMission'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
        });

        socketRef.current.on('mission:participation-approved', (payload) => {
          console.log('Participation approved notification:', payload);
          setLatestNotification(payload);
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({
            queryKey: ['getMission', String(payload.missionId)],
          });
          queryClient.invalidateQueries({ queryKey: ['getMission'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getConversation'] });
          queryClient.invalidateQueries({ queryKey: ['getMyConversations'] });
        });

        socketRef.current.on('mission:participation-revision', (payload) => {
          console.log('Participation revision notification:', payload);
          setLatestNotification(payload);
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({
            queryKey: ['getMission', String(payload.missionId)],
          });
          queryClient.invalidateQueries({ queryKey: ['getMission'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
        });

        socketRef.current.on('mission:participation-disputed', (payload) => {
          console.log('Participation disputed notification:', payload);
          setLatestNotification(payload);
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({
            queryKey: ['getMission', String(payload.missionId)],
          });
          queryClient.invalidateQueries({ queryKey: ['getMission'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
        });

        socketRef.current.on('mission:unjoined', () => {
          queryClient.invalidateQueries({ queryKey: ['getConversation'] });
          queryClient.invalidateQueries({ queryKey: ['getMyConversations'] });
          queryClient.invalidateQueries({
            queryKey: ['getUnreadMessageCount'],
          });
        });
      } catch (error) {
        console.error('Could not connect socket:', error);
      }
    };

    connectSocket();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [currentUser, queryClient]);

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
        logout,
        isSyncing,
        setIsSyncing: updateIsSyncing,
        latestNotification,
        setLatestNotification,
        socket,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
