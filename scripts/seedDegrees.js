// scripts/seedDegrees.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Degree from '../models/degreesModel.js';

dotenv.config();

const degreesData = [
  { name: 'Diseño Multimedial', description: 'Carrera de diseño interactivo y multimedia' },
  { name: 'Diseño Gráfico', description: 'Carrera de diseño visual y comunicación gráfica' },
  { name: 'Diseño de Videojuegos', description: 'Diseño y desarrollo de videojuegos' },
  { name: 'Cine de Animación', description: 'Animación audiovisual y narrativa digital' },
  { name: 'Diseño Web', description: 'Diseño UX/UI y desarrollo web' },
  { name: 'Analista de Sistemas', description: 'Carrera técnica en análisis y desarrollo de sistemas' },
  { name: 'Cine y Nuevos Formatos', description: 'Carrera enfocada en cine, transmedia y nuevos medios' },
];

const seedDegrees = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await Degree.deleteMany(); // Limpia carreras anteriores (opcional)
    const inserted = await Degree.insertMany(
      degreesData.map(degree => ({
        ...degree,
        slug: degree.name.toLowerCase().replace(/\s+/g, '-')
      }))
    );

    console.log('Carreras insertadas correctamente:', inserted);
    process.exit();
  } catch (error) {
    console.error('Error al insertar carreras:', error);
    process.exit(1);
  }
};

seedDegrees();
