import mongoose from 'mongoose';
import {
  validateContentOnSave,
  validateContentOnUpdate
} from '../Middleware/profanityFilter.js';

const Schema = mongoose.Schema;

const categories = [
  'dudas_tecnicas',
  'feedback_proyectos',
  'inspiracion_referencias',
  'buscar_colaboradores',
  'comunidad_general'
];

const postSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  degree: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Degree',
  required: true
},
  category: {
    type: String,
    enum: categories,
    required: true
  },
  isOfficial: {
    type: Boolean,
    default: false
  },
  lookingForCollab: {
    type: Boolean,
    default: false
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  interestedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  flagged: {
    type: Boolean,
    default: false
  },
  postNumber: {
  type: Number,
  unique: true,
  required: true
},

}, {
  timestamps: true
});

// 🚨 Middleware de validación de lenguaje ofensivo
postSchema.pre('save', validateContentOnSave);
postSchema.pre('findOneAndUpdate', validateContentOnUpdate);
postSchema.pre('updateOne', validateContentOnUpdate);

const Post = mongoose.model('Post', postSchema);
export default Post;
