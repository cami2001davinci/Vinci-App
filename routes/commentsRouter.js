// routes/commentsRoutes.js
import express from 'express';
import {
  createComment,
  updateComment,
  getCommentsByUser,
  getCommentsByPost,
  deleteComment
} from '../controllers/commentsController.js';
import { protect } from '../Middleware/auth.js';

const router = express.Router();

// Crear comentario (requiere login)
router.post('/', protect, createComment);

// Obtener comentarios del usuario autenticado
router.get('/mine', protect, getCommentsByUser);

// Obtener comentarios por post (opcional)
  router.get('/post/:postId', getCommentsByPost);

// Editar comentario por id (requiere login)
router.put('/:commentNumber', protect, updateComment);


// Eliminar comentario propio
router.delete('/:commentNumber', protect, deleteComment);

export default router;
