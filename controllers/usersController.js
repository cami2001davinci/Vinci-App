import User from '../models/usersModel.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // <-- necesario para login
import { getNotificationCounts } from '../src/utils/notificationCounts.js';



// Generar token JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};


// Registrar un nuevo usuario
// Registrar un nuevo usuario
export const registerUser = async (req, res) => {
  try {
    const {
      username, firstName, lastName, degrees, birthDate,
      email, password, interests, bio, profilePicture, lookingForCollab, role
    } = req.body;

    if (!username || !email || !password || !firstName || !lastName || !birthDate || !degrees || degrees.length === 0) {
  return res.status(400).json({ message: 'Faltan campos obligatorios' });
}

    const parsedBirthDate = new Date(birthDate);
    if (isNaN(parsedBirthDate.getTime())) {
      return res.status(400).json({ message: 'Fecha de nacimiento inválida' });
    }

    if (parsedBirthDate > new Date()) {
      return res.status(400).json({ message: 'La fecha de nacimiento no puede ser futura' });
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'El usuario o email ya existe' });
    }

    let userRole = 'user';

    if (role === 'admin') {
      try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
          return res.status(401).json({ message: 'No autorizado para crear admin, falta token' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const requestingUser = await User.findById(decoded.id);

        if (!requestingUser || requestingUser.role !== 'admin') {
          return res.status(403).json({ message: 'Acceso denegado: solo admins pueden crear admins' });
        }

        userRole = 'admin';
      } catch (error) {
        return res.status(401).json({ message: 'Token inválido o expirado' });
      }
    }

    const newUser = new User({
      username,
      firstName,
      lastName,
      degrees,
      studiesMultipleDegrees: degrees.length > 1,
      birthDate: parsedBirthDate,
      email,
      password,
      interests,
      bio,
      profilePicture,
      lookingForCollab,
      role: userRole
    });

    await newUser.save();

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      },
      token: generateToken(newUser._id, newUser.role)
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);

    if (error.code === 11000) {
      const campoDuplicado = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ message: `El ${campoDuplicado} ya está registrado` });
    }

    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Iniciar sesión
export const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    if (!user.password) {
      return res.status(500).json({ message: 'Error interno al procesar la contraseña' });
    }

    try {
      const passwordIsValid = await bcrypt.compare(password, user.password);

      if (!passwordIsValid) {
        return res.status(401).json({ message: 'Contraseña incorrecta' });
      }

      res.json({
        id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } catch (err) {
      console.error('Error al verificar contraseña:', err);
      res.status(500).json({ message: 'Error al verificar la contraseña' });
    }
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ message: 'Error en el servidor', error: err.message });
  }
};

export const getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id)
      .select("username firstName lastName bio profilePicture coverPicture degrees")
      .populate("degrees", "name slug");

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.json(user);
  } catch (err) {
    console.error("Error al obtener perfil publico:", err);
    res.status(500).json({ message: "Error al obtener el perfil" });
  }
};



 
// export const loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
//     }

//     const user = await User.findOne({ email });

//     if (user && (await bcrypt.compare(password, user.password))) {
//       res.json({
//   id: user._id,
//   username: user.username,
//   role: user.role,
//   token: generateToken(user._id, user.role) // ← aquí también
// });

//     } else {
//       res.status(401).json({ message: 'Email o contraseña incorrectos' });
//     }
//   } catch (err) {
//     res.status(500).json({ message: 'Error en el servidor', error: err.message });
//   }
// }; 

// Obtener todos los usuarios
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').exec();
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};


// Obtener un usuario por ID (con posts y comentarios)
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-password')
      .populate({
        path: 'posts',
        select: 'title content createdAt author',
        options: { sort: { createdAt: -1 } },
        populate: {
          path: 'author',
          select: 'username profilePicture'
        }
      })
      .populate({
        path: 'comments',
        select: 'content post createdAt author',
        options: { sort: { createdAt: -1 } },
        populate: {
          path: 'author',
          select: 'username profilePicture'
        }
      })
      .exec();

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (req.user._id.toString() !== user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para ver este perfil' });
    }

    // Calcular edad
    let age = null;
    if (user.birthDate) {
      const today = new Date();
      const birth = new Date(user.birthDate);
      age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
    }

    res.json({ ...user.toObject(), age });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};




// Actualizar usuario
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (req.user._id.toString() !== user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para actualizar este usuario' });
    }

    // Si llega degrees, validamos que sea array con al menos 1 id
    if (req.body.degrees !== undefined) {
  user.degrees = req.body.degrees; // ya es array válido gracias a Joi
  user.studiesMultipleDegrees = req.body.degrees.length > 1;
  delete req.body.degrees;
}

    Object.assign(user, req.body);
    await user.save();

    res.json({ message: 'Usuario actualizado correctamente', user });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};



// Eliminar usuario
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar el usuario por userId
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Validar que el usuario sea el mismo o un admin
    if (req.user._id.toString() !== user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para eliminar este usuario' });
    }

    // Eliminar
    await user.deleteOne();

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('notifications notificationsLastOpenedAt')
      .populate('notifications.post', 'content')
      .populate('notifications.fromUser', 'username');

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const notifications = user.notifications.slice().reverse(); // mas recientes primero
    const counts = getNotificationCounts(user);

    res.json({
      notifications,
      ...counts,
      lastOpenedAt: user.notificationsLastOpenedAt || null,
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const markNotificationsAsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    user.notifications.forEach((notif) => {
      notif.read = true;
    });
    user.notificationsLastOpenedAt = new Date();

    await user.save();

    const counts = getNotificationCounts(user);

    try {
      const { emitToUser } = await import('../src/utils/realtime.js');
      emitToUser(user._id, 'notifications:count', counts);
    } catch (err) {
      console.error('Error emitiendo notifications:count:', err);
    }

    res.json({
      message: 'Notificaciones marcadas como leidas',
      ...counts,
      lastOpenedAt: user.notificationsLastOpenedAt,
    });
  } catch (error) {
    console.error('Error al marcar notificaciones:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

export const acknowledgeNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'notifications notificationsLastOpenedAt'
    );
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    user.notificationsLastOpenedAt = new Date();
    await user.save();

    const counts = getNotificationCounts(user);

    try {
      const { emitToUser } = await import('../src/utils/realtime.js');
      emitToUser(user._id, 'notifications:count', counts);
    } catch (err) {
      console.error('Error emitiendo notifications:count:', err);
    }

    res.json({
      message: 'Notificaciones vistas',
      ...counts,
      lastOpenedAt: user.notificationsLastOpenedAt,
    });
  } catch (error) {
    console.error('Error al registrar apertura de notificaciones:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};

/**
 * Marca una notificacion individual como leida y devuelve el contador actualizado.
 *
 * @param {import('express').Request} req - Request con params.notificationId.
 * @param {import('express').Response} res - Response HTTP.
 * @returns {Promise<void>} Respuesta JSON con la notificacion actualizada.
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const user = await User.findById(req.user._id).select('notifications notificationsLastOpenedAt');
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const notification = user.notifications.id(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notificacion no encontrada' });
    }

    if (!notification.read) {
      notification.read = true;
    }

    await user.save();

    const counts = getNotificationCounts(user);

    try {
      const { emitToUser } = await import('../src/utils/realtime.js');
      emitToUser(user._id, 'notifications:count', counts);
    } catch (err) {
      console.error('Error emitiendo notifications:count:', err);
    }

    res.json({
      message: 'Notificacion marcada como leida',
      notification,
      ...counts,
    });
  } catch (error) {
    console.error('Error al marcar la notificacion como leida:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};




