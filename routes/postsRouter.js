import express from 'express';
import { createPostSchema } from '../validations/postAndCommentValidation.js';
import { validateBody } from '../Middleware/validate.js';
import multer from 'multer';
import path from 'path';
import {
  createPost,
  updatePost,
  getAllPosts,
  getPostById,
  getPostsByDegree,
  getPostsByUser, // ✅ Agregado
  deletePostById,
  toggleLike,
  toggleInterest,
  flagPost 

} from '../controllers/postsController.js';
import { protect } from '../Middleware/auth.js'

const router = express.Router();


/// Configuración del almacenamiento: dependiendo del tipo de archivo guardamos en diferentes carpetas
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Definir carpeta según tipo MIME
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
      // Opción: rechazar o guardar en otra carpeta
      cb(new Error('Tipo de archivo no permitido'), false);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueName}${ext}`);
  }
});

// Filtro de tipos permitidos
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

// Middleware multer con límites
const uploads = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // máximo 5MB por archivo (puedes ajustar)
  },
  fileFilter
});

// Rutas

router.post(
  '/',
  protect,
  uploads.array('files', 5), // el nombre 'files' debe coincidir con el input del frontend
  validateBody(createPostSchema),
  createPost
);


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

router.put('/flag/:postId', protect, flagPost);


export default router;
