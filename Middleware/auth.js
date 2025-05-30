import jwt from 'jsonwebtoken';
import User from '../models/usersModel.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Token inválido' });
    }
  } else {
    return res.status(401).json({ message: 'No autorizado, token faltante' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Acceso denegado: solo administradores' });
};
