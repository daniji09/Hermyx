// Local variables
const PORT = process.env.PORT || 3000;

// External modules
import { createServer } from 'node:http';
import app from './app.js';
import { initializeSocketServer } from './providers/socket.provider.js';
// eslint-disable-next-line no-unused-vars
import { autoAcceptParticipation } from './jobs/notification.job.js';

const httpServer = createServer(app);

initializeSocketServer(httpServer);

httpServer.listen(PORT, function (err) {
  if (err) console.error(`Error listening on port ${PORT}: ${err}`);
  else console.log(`Server listening on port ${PORT}`);
});
