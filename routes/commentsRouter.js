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
  getRepliesToComment,
  getCommentPath,
} from '../controllers/commentsController.js';
import { protect } from '../Middleware/auth.js';

const router = express.Router();

// Crear comentario
router.post('/', protect, validateBody(createCommentSchema), createComment);

// Comentarios del usuario logueado
router.get('/mine', protect, getCommentsByUser);

// Comentarios raíz de un post
router.get('/post/:postId', getCommentsByPost);

// Actualizar comentario
router.put('/:commentId', protect, updateComment);

// Eliminar comentario
router.delete('/:commentId', protect, deleteComment);

// Like/unlike comentario
router.put('/:commentId/like', protect, toggleLikeOnComment);

// Marcar comentario como inapropiado
router.put('/flag/:commentId', protect, flagComment);

// Camino completo raíz → hijo → subhijo (para expandir hilo desde notificación)
router.get('/path/:pathId', getCommentPath); // Cambio: ahora cubrimos /api/comments/path/:pathId que dispara el front

// Subcomentarios (respuestas)
router.get('/replies/:commentId', getRepliesToComment);

export default router;
