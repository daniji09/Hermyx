import { Server } from 'socket.io';
import { corsOptions } from '../app.js';
import { getByFirebaseUid } from '../models/app_user.model.js';
import { verifyIdToken } from './auth.service.js';

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
      const user = await getByFirebaseUid(decodedToken.uid);

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

    socket.on('disconnect', () => {
      socket.leave(`user:${socket.user.uid}`);
    });
  });

  return io;
};

export const getSocketServer = () => io;

export const emitToUser = (userId, eventName, payload) => {
  if (!io) return;

  io.to(`user:${userId}`).emit(eventName, payload);
};
