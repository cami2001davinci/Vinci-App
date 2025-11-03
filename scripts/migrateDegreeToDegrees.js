// scripts/migrateDegreeToDegrees.js
import 'dotenv/config.js';
import mongoose from 'mongoose';
import User from '../models/usersModel.js';

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Buscar documentos que todavía tengan el campo viejo "degree"
    const cursor = User.find({ degree: { $exists: true } }).cursor();

    let count = 0;
    for (let user = await cursor.next(); user != null; user = await cursor.next()) {
      const old = user.degree;
      const nextDegrees = Array.isArray(user.degrees) && user.degrees.length ? user.degrees : [];
      if (old) nextDegrees.unshift(old);

      user.degrees = nextDegrees;
      user.studiesMultipleDegrees = user.degrees.length > 1;

      // eliminar el campo antiguo
      user.set('degree', undefined, { strict: false });
      await user.save();
      count++;
      console.log(`Migrado: ${user._id}`);
    }

    console.log(`✅ Migración completa. Usuarios actualizados: ${count}`);
    process.exit(0);
  } catch (e) {
    console.error('❌ Error en migración:', e);
    process.exit(1);
  }
})();
