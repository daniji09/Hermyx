// To load environment variables
require("dotenv").config();

// External modules
const express = require("express");
const cors = require("cors");
const corsOptions = {
  // Cors configuration for accepting only allowed urls
  origin: ["http://localhost:5173"],
};

// Application initialization
const app = express();

// Application middlewares
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Application routers
const testRouter = require("./routes/test.router");

// Application routes
app.use("/test", testRouter);

module.exports = app;
