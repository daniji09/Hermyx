const express = require("express");
const router = express.Router();

const invitationController = require("../controllers/invitation.controller");

//crete invitation
router.post("/invitation", invitationController.createInvitation);

//respond to invitation
router.post("/:invitationId/respond", invitationController.respondToInvitation);
