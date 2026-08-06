// To load environment variables
import 'dotenv/config';

// External modules
import express from 'express';
import path from 'path';
import cors from 'cors';
export const corsOptions = {
  // Cors configuration for accepting only allowed urls
  origin: [
    'http://localhost:5173',
    'https://hermyx-git-dev-deploy-daniji09s-projects.vercel.app',
    'https://hermyx-git-main-daniji09s-projects.vercel.app',
  ],
};

// Application initialization
const app = express();
const staticFiles = path.join(process.cwd(), 'public');

// Application middlewares
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(staticFiles));

// Application routers
import usersRouter from './routes/user.route.js';
import paymentRouter from './routes/payment.route.js';
import missionsRouter from './routes/mission.route.js';
import notificationRouter from './routes/notification.route.js';
import reviewsRouter from './routes/review.route.js';
import reportsRouter from './routes/report.route.js';
import { verifyToken } from './middlewares/auth.middleware.js';
import conversationsRouter from './routes/conversation.route.js';

// Application routes
app.use('/api/stripe', verifyToken, paymentRouter);
app.use('/api/users', usersRouter);
app.use('/api/missions', verifyToken, missionsRouter);
app.use('/api/notifications', verifyToken, notificationRouter);
app.use('/api/reviews', verifyToken, reviewsRouter);
app.use('/api/conversations', verifyToken, conversationsRouter);
app.use('/api/reports', verifyToken, reportsRouter);

export default app;
