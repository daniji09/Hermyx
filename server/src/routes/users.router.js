// External modules
const express = require("express");
const router = express.Router();
const usersController = require("../controllers/users.controller");

// Get users
router.get("/", usersController.getUsers);

// Sign up a new user
router.post("/", usersController.signUp);

module.exports = router;
