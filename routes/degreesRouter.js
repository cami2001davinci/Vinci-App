import express from 'express';
import { getAllDegrees, createDegree } from '../controllers/degreesController.js';
import { protect, isAdmin } from '../Middleware/auth.js';

const router = express.Router();

router.get('/', getAllDegrees);
router.post('/', protect, isAdmin, createDegree);

export default router;
