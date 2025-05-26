import express from 'express';
import {
  createPost,
  updatePost,
  getAllPosts,
  getPostByNumber,
  getPostsByDegree,
  getPostsByUser, // ✅ Agregado
  deletePostByNumber
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
router.get('/:postNumber', getPostByNumber);


// Actualizar un post (solo autor)
router.put('/:postNumber', protect, updatePost);

// Eliminar un post (solo autor)
router.delete('/:postNumber', protect, deletePostByNumber);

export default router;
