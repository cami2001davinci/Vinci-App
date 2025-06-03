import express from 'express';
import {
  createPost,
  updatePost,
  getAllPosts,
  getPostById,
  getPostsByDegree,
  getPostsByUser, // ✅ Agregado
  deletePostById,
  toggleLike,
  toggleInterest

} from '../controllers/postsController.js';
import { protect } from '../Middleware/auth.js'

const router = express.Router();

// Crear un post
router.post('/', protect, createPost);

// Obtener todos los posts
router.get('/', getAllPosts);

// ✅ Obtener todos los posts de un usuario
router.get('/my-posts', protect, getPostsByUser);

router.get('/degree/:slug', getPostsByDegree)

// Obtener un post por ID
router.get('/:postId', getPostById);


// Actualizar un post (solo autor)
router.put('/:postId', protect, updatePost);

// Eliminar un post (solo autor)
router.delete('/:postId', protect, deletePostById);

router.put('/:postId/like', protect, toggleLike);
router.put('/:postId/interes', protect, toggleInterest);


export default router;
