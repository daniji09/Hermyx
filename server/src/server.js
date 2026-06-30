// Local variables
const PORT = process.env.PORT || 3000;

// External modules
import { createServer } from 'node:http';
import app from './app.js';
import { initializeSocketServer } from './services/socket.service.js';

const httpServer = createServer(app);

initializeSocketServer(httpServer);

httpServer.listen(PORT, function (err) {
  if (err) console.error(`Error listening on port ${PORT}: ${err}`);
  else console.log(`Server listening on port ${PORT}`);
});
