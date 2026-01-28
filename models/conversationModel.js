import mongoose from 'mongoose';

const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    participants: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      default: [],
    },
    post: { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    owner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Interesado en el post (para conversaciones 1 a 1 por proyecto)
    participant: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    // Vinculo directo al registro de interes
    projectInterest: {
      type: Schema.Types.ObjectId,
      ref: 'ProjectInterest',
      default: null,
    },

    // Nuevo: estado/solicitudes
    status: {
      type: String,
      enum: ['pending', 'active', 'ignored'],
      default: 'active',
      index: true,
    },
    requestType: {
      type: String,
      enum: ['dm', 'collab'],
      default: 'dm',
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    requestMessage: { type: String, default: '' },
    acceptedAt: { type: Date, default: null },
    ignoredAt: { type: Date, default: null },

    lastMessage: { type: String, default: '', trim: true },
    lastSender: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    lastMessageAt: { type: Date, default: Date.now },
    unreadBy: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
  },
  { timestamps: true }
);

conversationSchema.pre('validate', function ensureSortedParticipants(next) {
  try {
    if (Array.isArray(this.participants)) {
      this.participants = this.participants
        .map((val) => {
          const raw = val && val._id ? val._id : val;
          if (!raw) return null;
          const str = raw.toString();
          if (!mongoose.isValidObjectId(str)) return null;
          return str;
        })
        .filter(Boolean)
        .sort()
        .map((str) => new mongoose.Types.ObjectId(str));
    }
    next();
  } catch (err) {
    console.error('Error en ensureSortedParticipants, participants=', this.participants);
    next(err);
  }
});

// Índices (sin unique sobre participants para evitar E11000 con arrays)
conversationSchema.index({ updatedAt: -1 });
conversationSchema.index({ post: 1, owner: 1, participant: 1 });
// FIX: una sola conversacion por par de usuarios (independientemente del post)
conversationSchema.index({ participants: 1 }, { unique: true });

const Conversation = mongoose.model('Conversation', conversationSchema);
export default Conversation;
