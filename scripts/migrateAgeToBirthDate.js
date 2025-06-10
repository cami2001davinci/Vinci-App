import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/usersModel.js';

dotenv.config();

const migrateAgeToBirthDate = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a la base de datos');

    const today = new Date();
    const usersWithAge = await User.find({ age: { $exists: true } });

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of usersWithAge) {
      if (typeof user.age !== 'number' || isNaN(user.age) || user.age < 0 || user.age > 120) {
        console.warn(`⚠️ Usuario ${user.username} tiene una edad inválida: ${user.age}, se omite`);
        skippedCount++;
        continue;
      }

      const estimatedBirthYear = today.getFullYear() - user.age;
      const estimatedBirthDate = new Date(estimatedBirthYear, 0, 1);

      if (isNaN(estimatedBirthDate.getTime())) {
        console.warn(`⚠️ Fecha inválida para ${user.username}, se omite`);
        skippedCount++;
        continue;
      }

      user.birthDate = estimatedBirthDate;
      user.age = undefined;

      await user.save();
      console.log(`✅ Usuario ${user.username} migrado con birthDate: ${estimatedBirthDate.toISOString().split('T')[0]}`);
      migratedCount++;
    }

    console.log(`\n✅ Migración completada:`);
    console.log(`Usuarios migrados: ${migratedCount}`);
    console.log(`Usuarios omitidos: ${skippedCount}`);
    process.exit();
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
};

migrateAgeToBirthDate();
