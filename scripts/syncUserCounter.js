import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Counter from '../models/counterModel.js';
import User from '../models/usersModel.js';

dotenv.config();

async function syncUserCounter() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const latestUser = await User.findOne().sort({ userNumber: -1 });
    const nextSeq = latestUser ? latestUser.userNumber + 1 : 1;

    const result = await Counter.findOneAndUpdate(
      { name: 'userNumber' },
      { $set: { seq: nextSeq } },
      { upsert: true, new: true }
    );

    console.log(`Contador userNumber sincronizado. Próximo número: ${result.seq}`);
    await mongoose.disconnect();
  } catch (error) {
    console.error(' Error al sincronizar userNumber:', error);
    process.exit(1);
  }
}

syncUserCounter();
