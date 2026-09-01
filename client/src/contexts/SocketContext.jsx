import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '../config/firebase';
import { AuthContext } from './AuthContext';
import { createSocketConnection } from '../services/SocketService';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { currentUser } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const [latestNotification, setLatestNotification] = useState(null);
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

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
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          queryClient.resetQueries({ queryKey: ['getMission'] });
        });

        socketRef.current.on('mission:ban', (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
          }
        });

        socketRef.current.on('mission:adventurer-kicked-out', (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
          }
        });

        socketRef.current.on('mission:adventurer-ban', (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
          }
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

        socketRef.current.on('mission:finished', (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
          }
        });

        socketRef.current.on('review:created', (payload) => {
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

        socketRef.current.on('dispute:dismissed', (payload) => {
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
          }
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

        const handleDisputeResolution = (payload) => {
          setLatestNotification(payload);
          queryClient.invalidateQueries({ queryKey: ['getMyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['getMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getUserMissions'] });
          queryClient.invalidateQueries({ queryKey: ['getConversation'] });
          queryClient.invalidateQueries({ queryKey: ['getMyConversations'] });
          if (payload?.missionId) {
            queryClient.invalidateQueries({
              queryKey: ['getMission', String(payload.missionId)],
            });
          }
        };

        socketRef.current.on(
          'mission:participation-approved-dispute',
          handleDisputeResolution,
        );
        socketRef.current.on(
          'mission:participation-rejected-dispute',
          handleDisputeResolution,
        );

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
          if (payload?.notificationId) setLatestNotification(payload);
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

  return (
    <SocketContext.Provider
      value={{
        socket,
        latestNotification,
        setLatestNotification,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
