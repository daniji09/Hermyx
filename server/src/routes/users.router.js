// External modules
import { Router } from 'express';
const router = Router();
import { getUsers, signUp } from '../controllers/users.controller.js';

// Get users
router.get('/', getUsers);

// Sign up a new user
router.post('/', signUp);

export default router;
