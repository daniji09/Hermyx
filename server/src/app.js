// To load environment variables
require('dotenv').config();

// External modules
const express = require('express');
const cors = require('cors');
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

const paymentRouter = require('./routes/payment.router');

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

app.use('/stripe', paymentRouter);

// Application routers
const testRouter = require('./routes/test.router');
const usersRouter = require('./routes/users.router');

// Application routes
app.use('/test', testRouter);
app.use('/api/users', usersRouter);

module.exports = app;
