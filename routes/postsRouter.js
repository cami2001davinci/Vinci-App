import express from 'express';
import multer from 'multer';
import path from 'path';
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
  flagPost,
  finalizeCollabTeam,
  acceptCollaborationAndChat,
  getReceivedRequests, 
  getSentRequests,
  closeTeam,   
  getMyOpenCollabs   
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

// 1. Rutas específicas (Prioridad Alta - SIN ID al inicio)
// FASE 3: REQUEST HUB
router.get('/requests/received', protect, getReceivedRequests);
router.get('/requests/sent', protect, getSentRequests);
router.get('/requests/my-active', protect, getMyOpenCollabs);

// Listados Generales
router.get('/', getAllPosts);
router.get('/my-posts', protect, getPostsByUser);
router.post('/', protect, uploads.array('files', 5), createPost);

// Estadísticas y Filtros
router.get('/degree/:slug/category-stats', getCategoryStatsByDegree);
router.get('/degree/:slug/category-activity', getCategoryActivityByDegree);
router.get('/degree/:slug', getPostsByDegree);

// 2. Rutas con parámetros ID (Estandarizado a :id)
// FASE 2: Atomicidad
router.post("/:id/collab/:userId/accept-chat", protect, acceptCollaborationAndChat);

// Acciones específicas
router.post('/:id/collab/finalize-team', protect, finalizeCollabTeam);
router.put('/flag/:id', protect, flagPost);
router.put('/:id/like', protect, toggleLike);
router.put('/:id/interes', protect, toggleInterest); 
router.put('/:id/collab/:userId', protect, manageCollabRequest);
router.put("/:postId/close-team", protect, closeTeam);

// 3. CRUD Genérico (SIEMPRE AL FINAL)
// Si pones esto antes, taparía las rutas de arriba
router.get('/:id', getPostById);
router.put('/:id', protect, updatePost);
router.delete('/:id', protect, deletePostById);

export default router;