import { io } from 'socket.io-client';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const socketServerUrl = apiUrl.replace(/\/api$/, '');

export const createSocketConnection = (token) => {
  return io(socketServerUrl, {
    auth: {
      token,
    },
  });
};
