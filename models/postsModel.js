// import mongoose from 'mongoose';
// import {
//   validateContentOnSave,
//   validateContentOnUpdate
// } from '../Middleware/profanityFilter.js';
// import categoriesList from '../src/config/categories.js';
// const Schema = mongoose.Schema;
// const CATEGORY_KEYS = categoriesList.map(c => c.key);


// const postSchema = new Schema({
//   // title: {
//   //   type: String,
//   //   required: true,
//   //   trim: true
//   // },
//   content: {
//     type: String,
//     required: true,
//     trim: true
//   },
//   author: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   degree: {
//   type: mongoose.Schema.Types.ObjectId,
//   ref: 'Degree',
//   required: true
// },
//   category: {
//     type: String,
//     enum: CATEGORY_KEYS,
//     required: true,
//     default: 'comunidad'
//   },
//   isOfficial: {
//     type: Boolean,
//     default: false
//   },
//   lookingForCollab: {
//     type: Boolean,
//     default: false
//   },
//   likedBy: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   }],
//   interestedUsers: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   }],
//   comments: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Comment'
//   }],
//   flagged: {
//     type: Boolean,
//     default: false
//   },
//   images: {
//   type: [String],
//   default: []
// }, 
// documents: [String],
  

// }, {
//   timestamps: true
// });

// // 🚨 Middleware de validación de lenguaje ofensivo
// postSchema.pre('save', validateContentOnSave);
// postSchema.pre('findOneAndUpdate', validateContentOnUpdate);
// postSchema.pre('updateOne', validateContentOnUpdate);

// const Post = mongoose.model('Post', postSchema);
// export default Post;
import mongoose from 'mongoose';
import {
  validateContentOnSave,
  validateContentOnUpdate
} from '../Middleware/profanityFilter.js';
import categoriesList from '../src/config/categories.js';

const Schema = mongoose.Schema;
const CATEGORY_KEYS = categoriesList.map(c => c.key);

// Subdocumento para links con preview
const LinkSchema = new Schema({
  url: { type: String, required: true, trim: true },
  provider: { type: String, default: '' },
  preview: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    image: { type: String, default: '' }
  }
}, { _id: false });

const postSchema = new Schema({
  // ✅ título del post (el que escribe la persona)
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 100
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
    enum: CATEGORY_KEYS,
    required: true,
    default: 'comunidad'
  },

  isOfficial: { type: Boolean, default: false },
  lookingForCollab: { type: Boolean, default: false },

  // ✅ arrays con default
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  interestedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', default: [] }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: [] }],

  flagged: { type: Boolean, default: false },

  // ✅ imágenes y documentos con default
  images: { type: [String], default: [] },
  documents: { type: [String], default: [] },

  // ✅ nuevo: links con preview (opcional)
  links: { type: [LinkSchema], default: [] },

  // ✅ nuevo: programas usados (opcional)
  toolsUsed: {
    type: [String],
    default: [],
    enum: [
      'Photoshop','Illustrator','Figma','Blender','Maya',
      'AfterEffects','Premiere','Procreate','ClipStudio',
      'Unity','Unreal'
    ]
  }
}, { timestamps: true });

// Profanity filter
postSchema.pre('save', validateContentOnSave);
postSchema.pre('findOneAndUpdate', validateContentOnUpdate);
postSchema.pre('updateOne', validateContentOnUpdate);

const Post = mongoose.model('Post', postSchema);
export default Post;
