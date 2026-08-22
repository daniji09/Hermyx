import { Server } from 'socket.io';
import { corsOptions } from '../app.js';
import { findByFirebaseUid } from '../models/user.model.js';
import { findById as findConversationById } from '../models/conversation.model.js';
import { verifyIdToken } from './auth.provider.js';
import { canSendMessageToConversation } from '../models/conversation-participant.model.js';

let io;

const getSocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const authorization = socket.handshake.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) return null;

  return authorization.split(' ')[1];
};

export const initializeSocketServer = (httpServer) => {
  io = new Server(httpServer, {
    cors: corsOptions,
  });

  io.use(async (socket, next) => {
    try {
      const token = getSocketToken(socket);

      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const decodedToken = await verifyIdToken(token);
      const user = await findByFirebaseUid(decodedToken.uid);

      if (!user) {
        return next(new Error('Unauthorized'));
      }

      socket.user = user;
      return next();
    } catch (error) {
      console.error('Error authenticating socket:', error);
      return next(new Error('Forbidden'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.uid}`);
    if (socket.user.role === 'ADMIN') socket.join('admins');

    socket.on('disconnect', () => {
      socket.leave(`user:${socket.user.uid}`);
    });

    socket.on('conversation:join', async (conversationId) => {
      try {
        const conversation = await findConversationById(conversationId);
        const isAdminDisputePreview =
          socket.user.role === 'ADMIN' && conversation?.type === 'dispute';
        const canReceiveLiveMessages = await canSendMessageToConversation(
          conversationId,
          socket.user.uid,
        );

        if (!canReceiveLiveMessages && !isAdminDisputePreview) return;

        socket.join(`conversation:${conversationId}`);
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    });

    socket.on('conversation:leave', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
    });
  });

  return io;
};

export const getSocketServer = () => io;

export const emitToUser = (userId, eventName, payload) => {
  if (!io) return;

  io.to(`user:${userId}`).emit(eventName, payload);
};

export const emitToConversation = (conversationId, eventName, payload) => {
  if (!io) return;

  io.to(`conversation:${conversationId}`).emit(eventName, payload);
};

export const emitToAdmins = (eventName, payload) => {
  if (!io) return;

  io.to('admins').emit(eventName, payload);
};
