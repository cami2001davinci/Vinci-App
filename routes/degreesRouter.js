import express from 'express';
import { getAllDegrees, createDegree,  getDegreeOverview, getDegreeBySlug  } from '../controllers/degreesController.js';
import { protect, isAdmin } from '../Middleware/auth.js';

const router = express.Router();

router.get('/', getAllDegrees);
router.get('/:slug', getDegreeBySlug);
router.post('/', protect, isAdmin, createDegree);
router.get('/:slug/overview', getDegreeOverview);
export default router;
