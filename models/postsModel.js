import mongoose from "mongoose";
import {
  validateContentOnSave,
  validateContentOnUpdate,
} from "../Middleware/profanityFilter.js";
import categoriesList from "../src/config/categories.js";

const Schema = mongoose.Schema;
const CATEGORY_KEYS = categoriesList.map((c) => c.key);

// Subdocumento para links con preview
const LinkSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    provider: { type: String, default: "" },
    preview: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      image: { type: String, default: "" },
    },
  },
  { _id: false },
);

const InterestSchema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  },
  date: { type: Date, default: Date.now }
}, { _id: false });

const postSchema = new Schema(
  {
    // ✅ Título del post
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    degree: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Degree",
      required: true,
    },

    category: {
      type: String,
      enum: CATEGORY_KEYS,
      required: true,
      default: "comunidad",
    },

    // ✅ Estados y Flags
    isOfficial: { type: Boolean, default: false },
    lookingForCollab: { type: Boolean, default: false },
    flagged: { type: Boolean, default: false },
    
    // Nuevo: estado de colaboracion (abierto o equipo elegido)
    collabStatus: {
      type: String,
      enum: ["open", "team_chosen"],
      default: "open",
    },

    // ✅ Listas de Interacción (Arrays)
    likedBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    comments: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: [] },
    ],

    // ✅ Listas de Colaboración
    interestedUsers: { 
    type: [InterestSchema], 
    default: [] 
  },
    // Usuarios aceptados por el dueño del post (MATCH CONFIRMADO)
    selectedCollaborators: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    // (Legacy/Backup) Usuarios que hicieron match en versiones anteriores
    matchedUsers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],

    // ✅ Multimedia y Adjuntos
    images: { type: [String], default: [] },
    documents: { type: [String], default: [] },

    // Links con preview (opcional)
    links: { type: [LinkSchema], default: [] },

    // ✅ Programas usados
    toolsUsed: {
      type: [String],
      default: [],
      enum: [
        "Photoshop",
        "Illustrator",
        "Figma",
        "Blender",
        "Maya",
        "AfterEffects",
        "Premiere",
        "Procreate",
        "ClipStudio",
        "Unity",
        "Unreal",
      ],
    },
  },
  { timestamps: true },
);

// Middleware de validación de lenguaje ofensivo
postSchema.pre("save", validateContentOnSave);
postSchema.pre("findOneAndUpdate", validateContentOnUpdate);
postSchema.pre("updateOne", validateContentOnUpdate);

// Índices para búsqueda rápida
postSchema.index({ title: 1, content: 1 });

const Post = mongoose.model("Post", postSchema);
export default Post;