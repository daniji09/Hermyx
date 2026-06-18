// To load environment variables
import 'dotenv/config';

// External modules
import express from 'express';
import cors from 'cors';
const corsOptions = {
  // Cors configuration for accepting only allowed urls
  origin: ['http://localhost:5173'],
};

// Application initialization
const app = express();

// Application middlewares
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Application routers
import usersRouter from './routes/users.router.js';
import paymentRouter from './routes/payment.router.js';
import missionsRouter from './routes/missions.router.js';
import { verifyToken } from './middlewares/auth.middleware.js';

// Application routes
app.use('/api/stripe', verifyToken, paymentRouter);
app.use('/api/users', usersRouter);
app.use('/api/missions', verifyToken, missionsRouter);

export default app;
