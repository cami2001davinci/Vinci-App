import jwt from 'jsonwebtoken';
import User from '../models/usersModel.js';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return res.status(401).json({ message: 'No autorizado, token faltante' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id,
      _id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error('Error en middleware protect:', error.message);
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: 'Acceso denegado: solo administradores' });
};
