import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { getMe } from '../services/UsersServices';
import { useQueryClient } from '@tanstack/react-query';

import { createSocketConnection } from '../services/SocketService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // States for current user and loading state that happens when this component is mounted
  const [currentUser, setCurrentUser] = useState(null);
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

        socketRef.current.on('notification:created', (payload) => {
          setLatestNotification(payload);
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMyConversations'] });

          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
            queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          }
        });

        socketRef.current.on('mission:delete', () => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.resetQueries({ queryKey: ['getMission'] });
        });

        socketRef.current.on('mission:cancel', (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
          }
        });

        socketRef.current.on('mission:closed', (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
          }
        });

        socketRef.current.on('mission:started', (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
          }
        });

        socketRef.current.on('mission:reopened', (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
          }
        });

        socketRef.current.on('mission:edited', (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          queryClient.invalidateQueries({
            queryKey: ['getMission', String(payload.missionId)],
          });
          queryClient.invalidateQueries({ queryKey: ['getMission'] });
        });

        const handleRewardOfferResponse = (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({
            queryKey: ['getMission', String(payload.missionId)],
          });
          queryClient.invalidateQueries({ queryKey: ['getMission'] });
        };

        socketRef.current.on(
          'mission:participation-negotiation-accepted',
          handleRewardOfferResponse,
        );
        socketRef.current.on(
          'mission:participation-negotiation-rejected',
          handleRewardOfferResponse,
        );

        socketRef.current.on('conversation:message-received', (payload) => {
          if (payload.conversationType === 'dispute') {
            queryClient.invalidateQueries({
              queryKey: ['getDisputeUnreadCount'],
            });
            queryClient.invalidateQueries({ queryKey: ['getMyDisputes'] });
            if (payload.reportId) {
              queryClient.invalidateQueries({
                queryKey: ['getDispute', String(payload.reportId)],
              });
            }
            queryClient.invalidateQueries({ queryKey: ['getReports'] });
          } else {
            queryClient.invalidateQueries({
              queryKey: ['getUnreadMessageCount'],
            });
            queryClient.invalidateQueries({
              queryKey: ['getMyConversations'],
            });
          }
        });

        socketRef.current.on('conversation:closed', () => {
          queryClient.invalidateQueries({
            queryKey: ['getConversation'],
          });
          queryClient.invalidateQueries({ queryKey: ['getMyConversations'] });
          queryClient.invalidateQueries({ queryKey: ['getMyDisputes'] });
          queryClient.invalidateQueries({
            queryKey: ['getDisputeUnreadCount'],
          });
          queryClient.invalidateQueries({ queryKey: ['getReports'] });
        });

        socketRef.current.on('report:created', () => {
          queryClient.invalidateQueries({ queryKey: ['getReports'] });
        });

        socketRef.current.on('report:updated', () => {
          queryClient.invalidateQueries({ queryKey: ['getReports'] });
          queryClient.invalidateQueries({ queryKey: ['getReport'] });
        });

        socketRef.current.on('mission:participation-submitted', (payload) => {
          setLatestNotification(payload);
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({
            queryKey: ['getMission', String(payload.missionId)],
          });
          queryClient.invalidateQueries({ queryKey: ['getMission'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
        });

        socketRef.current.on('mission:participation-approved', (payload) => {
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
          setLatestNotification(payload);
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({
            queryKey: ['getMission', String(payload.missionId)],
          });
          queryClient.invalidateQueries({ queryKey: ['getMission'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
        });

        socketRef.current.on('mission:participation-disputed', (payload) => {
          setLatestNotification(payload);
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({
            queryKey: ['getMission', String(payload.missionId)],
          });
          queryClient.invalidateQueries({ queryKey: ['getMission'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
        });

        socketRef.current.on('mission:unjoined', (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getConversation'] });
          queryClient.invalidateQueries({ queryKey: ['getMyConversations'] });
          queryClient.invalidateQueries({
            queryKey: ['getUnreadMessageCount'],
          });
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
          }
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
        loadCurrentUser,
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
