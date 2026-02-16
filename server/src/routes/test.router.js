// External modules
import { Router } from 'express';
const router = Router();
import { getAll } from '../controllers/test.controller.js';

router.get('/', getAll);

export default router;
