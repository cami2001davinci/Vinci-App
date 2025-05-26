import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Counter from '../models/counterModel.js';
import Post from '../models/postsModel.js';

dotenv.config();

async function syncPostCounter() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Buscar el post con el número más alto
    const latestPost = await Post.findOne().sort({ postNumber: -1 });

    const nextSeq = latestPost ? latestPost.postNumber + 1 : 1;

    const result = await Counter.findOneAndUpdate(
      { name: 'postNumber' },
      { $set: { seq: nextSeq } },
      { upsert: true, new: true }
    );

    console.log(`✅ Contador postNumber sincronizado. Próximo número será: ${result.seq}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error al sincronizar el contador postNumber:', error);
    process.exit(1);
  }
}

syncPostCounter();
