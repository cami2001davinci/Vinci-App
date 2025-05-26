import User from '../models/usersModel.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // <-- necesario para login
import Counter from '../models/counterModel.js';

// Función para obtener el siguiente número único (contador)
const getNextSequence = async (name) => {
  const counter = await Counter.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
};

// Generar token JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Registrar un nuevo usuario
export const registerUser = async (req, res) => {
  try {
    const {
      username, firstName, lastName, degree, age,
      email, password, interests, bio, profilePicture, lookingForCollab, role
    } = req.body;

    if (!username || !email || !password || !firstName || !lastName || !degree || !age) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const userNumber = await getNextSequence('userId');

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
      degree,
      age,
      email,
      password,
      interests,
      bio,
      profilePicture,
      lookingForCollab,
      userNumber,
      role: userRole // CORREGIDO: era "rol"
    });

    await newUser.save();

    res.status(201).json({
      message: 'Usuario registrado correctamente',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        userNumber: newUser.userNumber,
        role: newUser.role
      },
      token: generateToken(newUser._id)
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);

    if (error.code === 11000) {
      const campoDuplicado = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        message: `El ${campoDuplicado} ya está registrado`
      });
    }

    res.status(500).json({ message: 'Error del servidor' });
  }
};

// Iniciar sesión
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Email o contraseña incorrectos' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Error en el servidor', error: err.message });
  }
}; 

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

// Obtener un usuario por ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ userNumber: parseInt(id) }).select('-password').exec();

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Validar que el usuario autenticado sea el mismo o un admin
    if (req.user._id.toString() !== user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para ver este perfil' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error del servidor' });
  }
};


// Actualizar usuario
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar por userNumber (no por _id)
    const user = await User.findOne({ userNumber: parseInt(id) });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar si quien hace la solicitud es el mismo usuario o un admin
    if (req.user._id.toString() !== user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'No autorizado para actualizar este usuario' });
    }

    // Aplicar cambios y guardar
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

    // Buscar el usuario por userNumber
    const user = await User.findOne({ userNumber: parseInt(id) });

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

