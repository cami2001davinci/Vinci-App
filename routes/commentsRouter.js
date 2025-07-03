// routes/commentsRoutes.js
import express from 'express';
import { createCommentSchema } from '../validations/postAndCommentValidation.js';
import { validateBody } from '../Middleware/validate.js';
import {
  createComment,
  updateComment,
  getCommentsByUser,
  getCommentsByPost,
  deleteComment,
  toggleLikeOnComment,
  flagComment,
  getRepliesToComment // asegurate de importar esto también
} from '../controllers/commentsController.js';
import { protect } from '../Middleware/auth.js';

const router = express.Router();

router.post('/', protect, validateBody(createCommentSchema), createComment);
router.get('/mine', protect, getCommentsByUser);
router.get('/post/:postId', getCommentsByPost);
router.put('/:commentId', protect, updateComment);
router.delete('/:commentId', protect, deleteComment);
router.put('/:commentId/like', protect, toggleLikeOnComment);
router.put('/flag/:commentId', protect, flagComment);

// ✅ Ruta para subcomentarios (respuestas)
router.get('/replies/:commentId', getRepliesToComment);

export default router;
