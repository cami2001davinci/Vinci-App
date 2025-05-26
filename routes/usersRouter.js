import express from 'express';
import { protect, isAdmin } from '../Middleware/auth.js'
import {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} from '../controllers/usersController.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

router.get('/', protect, isAdmin, getAllUsers);

router.get('/:id', protect, isAdmin, getUserById);

router.put('/:id', protect, updateUser);

router.delete('/:id', protect, isAdmin, deleteUser);

export default router;
