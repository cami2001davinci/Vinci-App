import express from 'express';
import { validateBody } from '../Middleware/validate.js'; 
import { userLoginSchema } from '../validations/usersValidation.js';
import { userRegisterSchema } from '../validations/usersValidation.js'; // ✅ esquema Joi
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

router.post('/register', validateBody(userRegisterSchema), registerUser);

router.post('/login', validateBody(userLoginSchema), loginUser);

router.get('/', protect, isAdmin, getAllUsers);

router.get('/:id', protect, isAdmin, getUserById);

router.put('/:id', protect, updateUser);

router.delete('/:id', protect, isAdmin, deleteUser);

export default router;
