// To load environment variables
import 'dotenv/config';

// External modules
import express from 'express';
import cors from 'cors';
const corsOptions = {
  // Cors configuration for accepting only allowed urls
  origin: ['http://localhost:5173', 'https://hermyx-lbcecfldx-daniji09s-projects.vercel.app'],
};

// Application initialization
const app = express();

// Application middlewares
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Application routers
import testRouter from './routes/test.router.js';
import usersRouter from './routes/users.router.js';
import paymentRouter from './routes/payment.router.js';

app.use((req, res, next) => {
  // Payment test

  const CURRENT_ROLE = 'customer';

  if (CURRENT_ROLE === 'customer') {
    req.user = {
      uid: 1,
      email: 'customer@gmail.com',
      name: 'Customer',
    };
  } else if (CURRENT_ROLE === 'adventurer') {
    req.user = {
      uid: 2,
      email: 'adventurer@gmail.com',
      name: 'Adventurer',
    };
  } else if (CURRENT_ROLE === 'adventurer2') {
    req.user = {
      uid: 3,
      email: 'adventurer2@gmail.com',
      name: 'Adventurer2',
    };
  } else if (CURRENT_ROLE === 'wen') {
    req.user = {
      uid: 8,
      email: 'wen@gmail.com',
      name: 'wen',
    };
  }

  console.log(
    `> [MOCK] Petición de: ${req.user.name} (ID: ${req.user.uid}) a ${req.path}`,
  );
  next();
});

// Application routes
app.use('/test', testRouter);
app.use('/stripe', paymentRouter);
app.use('/api/users', usersRouter);

export default app;
