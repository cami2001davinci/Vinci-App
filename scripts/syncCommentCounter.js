import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Counter from '../models/counterModel.js';
import Comment from '../models/commentsModel.js';

dotenv.config();

async function syncCommentCounter() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Obtener el comentario con el número más alto
    const latestComment = await Comment.findOne().sort({ commentNumber: -1 });

    const nextSeq = latestComment ? latestComment.commentNumber + 1 : 1;

    const result = await Counter.findOneAndUpdate(
      { name: 'commentNumber' },
      { $set: { seq: nextSeq } },
      { upsert: true, new: true }
    );

    console.log(`Contador sincronizado. Próximo commentNumber será: ${result.seq}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error al sincronizar el contador:', error);
    process.exit(1);
  }
}

syncCommentCounter();
