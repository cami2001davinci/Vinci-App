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
  flagComment
} from '../controllers/commentsController.js';
import { protect } from '../Middleware/auth.js';

const router = express.Router();

// Crear comentario (requiere login)
router.post('/', protect, validateBody(createCommentSchema), createComment);

// Obtener comentarios del usuario autenticado
router.get('/mine', protect, getCommentsByUser);

// Obtener comentarios por post (opcional)
  router.get('/post/:postId', getCommentsByPost);

// Editar comentario por id (requiere login)
router.put('/:commentId', protect, updateComment);


// Eliminar comentario propio
router.delete('/:commentId', protect, deleteComment);

router.put('/:commentId/like', protect, toggleLikeOnComment);

router.put('/flag/:commentId', protect, flagComment);
export default router;
