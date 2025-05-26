import express from 'express';
import { getUserActivityByDegree } from '../controllers/userActivityController.js';
import { protect } from '../Middleware/auth.js';

const router = express.Router();

// Ver actividad del usuario en una carrera
router.get('/degree/:slug', protect, getUserActivityByDegree);

export default router;
