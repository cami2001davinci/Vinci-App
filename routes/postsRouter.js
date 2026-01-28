import express from 'express';
import multer from 'multer';
import path from 'path';

// 1. CORRECCIÓN: Eliminamos el import de 'validateToken.js' que no existe.
// Usaremos 'protect' de 'auth.js' para todo.
import { protect } from '../Middleware/auth.js';

import {
  createPost,
  updatePost,
  getAllPosts,
  getPostById,
  getPostsByDegree,
  getPostsByUser,
  getCategoryStatsByDegree,
  getCategoryActivityByDegree,
  deletePostById,
  toggleLike,
  toggleInterest,
  manageCollabRequest,
  // getInterestedUsers, // ELIMINADO: Ya no existe en el controlador (se usa getPostById)
  flagPost,
  finalizeCollabTeam,
  // acceptCollaborator, // ELIMINADO: Ya no existe (reemplazado por manageCollabRequest)
} from '../controllers/postsController.js';

const router = express.Router();

// Configuración de Multer (Se mantiene igual)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const imageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const docTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-word.document.macroEnabled.12'
    ];

    if (imageTypes.includes(file.mimetype)) {
      cb(null, path.join(process.cwd(), 'public/uploads/imgs'));
    } else if (docTypes.includes(file.mimetype)) {
      cb(null, path.join(process.cwd(), 'public/uploads/docs'));
    } else {
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/jpg', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-word.document.macroEnabled.12'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes y documentos (pdf, doc, docx)'), false);
  }
};

const uploads = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

// === RUTAS ===

// Rutas específicas primero para evitar colisiones con :postId
router.post('/:postId/collab/finalize-team', protect, finalizeCollabTeam);
router.post('/', protect, uploads.array('files', 5), createPost);

router.get('/', getAllPosts);
router.get('/my-posts', protect, getPostsByUser);

router.get('/degree/:slug/category-stats', getCategoryStatsByDegree);
router.get('/degree/:slug/category-activity', getCategoryActivityByDegree);
router.get('/degree/:slug', getPostsByDegree);

// Ruta para marcar inapropiado
router.put('/flag/:postId', protect, flagPost);

// Likes
router.put('/:postId/like', protect, toggleLike);

// === SISTEMA DE MATCH / COLABORACIÓN ===
// 2. CORRECCIÓN: Usamos 'protect' en lugar de 'authRequired'
router.put('/:postId/interes', protect, toggleInterest);

// 3. CORRECCIÓN: Ruta unificada para aceptar/rechazar (manageCollabRequest)
router.put('/:postId/collab/:userId', protect, manageCollabRequest);

// CRUD básico (:postId siempre al final para no tapar otras rutas)
// Nota: getInterestedUsers se eliminó porque el frontend ahora obtiene 
// los interesados dentro del objeto del post (getPostById)
router.get('/:postId', getPostById);
router.put('/:postId', protect, updatePost);
router.delete('/:postId', protect, deletePostById);

export default router;