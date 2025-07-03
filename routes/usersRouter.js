import express from 'express';
import { validateBody } from '../Middleware/validate.js';
import { userLoginSchema, userRegisterSchema } from '../validations/usersValidation.js';
import { protect, isAdmin } from '../Middleware/auth.js';
import User from '../models/usersModel.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs'; // 

import {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getMyNotifications,
  markNotificationsAsRead
} from '../controllers/usersController.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'public/uploads/profile'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes.'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Eliminar archivo anterior (si existe y no es por defecto)
const deletePreviousImage = (imagePath) => {
  if (imagePath && imagePath.startsWith('/uploads/profile')) {
    const absolutePath = path.join(process.cwd(), 'public', imagePath);
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }
};

// Rutas

router.post('/register', validateBody(userRegisterSchema), registerUser);
router.post('/login', validateBody(userLoginSchema), loginUser);
router.get('/', protect, isAdmin, getAllUsers);
router.get('/me/notifications', protect, getMyNotifications);

router.put('/me/update-profile', protect, async (req, res) => {
  try {
    const { firstName, lastName, username, bio } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Actualiza solo si los campos vienen en el body
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (username) user.username = username;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({ message: 'Perfil actualizado correctamente', user });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error al actualizar el perfil' });
  }
});


router.put('/me/upload-cover', protect, upload.single('coverPicture'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Eliminar imagen anterior
    deletePreviousImage(user.coverPicture);

    user.coverPicture = `/uploads/profile/${req.file.filename}`;
    await user.save();
    res.json({ message: 'Foto de portada actualizada correctamente', coverPicture: user.coverPicture });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al subir la foto de portada' });
  }
});

router.put('/me/upload-profile', protect, upload.single('profilePicture'), async (req, res) => {
  console.log('req.file:', req.file);
  console.log('req.body:', req.body);
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    deletePreviousImage(user.profilePicture);

    user.profilePicture = `/uploads/profile/${req.file.filename}`;
    await user.save();
    res.json({ message: 'Foto de perfil actualizada correctamente', profilePicture: user.profilePicture });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al subir la foto de perfil' });
  }
});



router.get('/me/full-profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('degree', 'name slug')
      .populate({
        path: 'posts',
        populate: [
          { path: 'comments', populate: { path: 'author', select: 'firstName lastName profilePicture username' } },
          { path: 'author', select: 'firstName lastName profilePicture username' }
        ]
      })
      .populate({
        path: 'comments',
        populate: [
          { path: 'author', select: 'firstName lastName profilePicture username' },
          { path: 'post', populate: { path: 'author', select: 'firstName lastName profilePicture username' } }
        ]
      });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error en /me/full-profile:', error);
    res.status(500).json({ message: 'Error al obtener el perfil completo' });
  }
});

router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('degree', 'name slug');

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({ message: 'Error al obtener el usuario' });
  }
});

router.get('/:id', protect, isAdmin, getUserById);
router.put('/:id', protect, updateUser);
router.put('/me/notifications/mark-as-read', protect, markNotificationsAsRead);
router.delete('/:id', protect, isAdmin, deleteUser);

export default router;
