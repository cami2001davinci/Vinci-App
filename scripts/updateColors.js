import mongoose from 'mongoose';
import Degree from '../models/degreesModel.js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const COLORS = {
  'multimedial': '#FFD600',      // Amarillo
  'gráfico': '#FF6B6B',          // Rosa
  'videojuegos': '#4D96FF',      // Azul
  'animación': '#6BCB77',        // Verde
  'web': '#9D4EDD',              // Violeta
  'sistemas': '#FF4757',         // Rojo
  'cine': '#FF9F43'              // Naranja
};

const update = async () => {
  try {
    // 👇 AQUÍ ESTÁ LA CORRECCIÓN: Usamos MONGODB_URI (como en tu .env)
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("❌ No se encontró la variable MONGODB_URI en el archivo .env");
    }

    await mongoose.connect(uri);
    console.log('✅ Conectado a la Base de Datos...');

    const degrees = await Degree.find();
    console.log(`🔍 Se encontraron ${degrees.length} carreras.`);
    
    for (const degree of degrees) {
      let newColor = '#000000';
      const nameLower = degree.name.toLowerCase();

      // Buscamos qué color le corresponde
      for (const [key, hex] of Object.entries(COLORS)) {
        if (nameLower.includes(key)) {
          newColor = hex;
          break;
        }
      }
      
      degree.color = newColor;
      await degree.save();
      console.log(`🎨 ${degree.name} actualizado a ${newColor}`);
    }
    
    console.log('✨ ¡Proceso terminado exitosamente!');
    process.exit();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

update();