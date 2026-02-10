import mongoose from "mongoose";
import bcrypt from 'bcryptjs';
const Schema = mongoose.Schema;

const userSchema = new Schema({
 
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  degrees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Degree',
    required: true
  }],
  studiesMultipleDegrees: {
    type: Boolean,
    default: false
  },
  birthDate: {
    type: Date,
    required: true
  },
  interests: {
    type: [String],
    default: []
  },
  bio: {
    type: String,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  },
  coverPicture: {
    type: String,
    default: ''
  },
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  lookingForCollab: {
    type: Boolean,
    default: false
  },
  matches: [{ 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  email: {
    type: String,
    required: true,
    unique: true,
    match: [/^\S+@\S+\.\S+$/, 'Email inválido']
  },
  password: { 
    type: String,
    required: true
  },
  
  notifications: [{
    type: {
      type: String, 
      required: true
      // enum: [ ... ] <-- COMENTADO PARA PERMITIR DATOS SUCIOS Y EVITAR VALIDATION ERROR
    },
    message: {
      type: String,
      required: true
    },
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    fromUserAvatar: { 
      type: String, 
      default: '' 
    },
    entity: { // Opcional: Para guardar ID genérico si hace falta
      kind: String,
      id: mongoose.Schema.Types.ObjectId
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  }
}, {
  timestamps: true
});

// Hashear contraseña antes de guardar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next(); 
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// Método para comparar contraseñas
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;