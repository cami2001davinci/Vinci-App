// models/messageModel.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // FASE 2: Contexto para anclajes y renderizado especial
    context: {
      type: {
        type: String,
        enum: ['NONE', 'PROJECT_MATCH', 'COLLAB_REQUEST', 'SYSTEM'],
        default: 'NONE',
      },
      projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post',
      },
      projectTitle: String,
      status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'canceled'],
      },
      additionalData: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);
export default Message;