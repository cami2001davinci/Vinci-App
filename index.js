// import express from "express";
// import dotenv from 'dotenv';
// import routerAPI from './routes/index.js';
// import mongoose from "mongoose";
// import cors from 'cors';
// import path from 'path';


// dotenv.config();

// const app = express();
// const port = process.env.PORT;
// const dburi = process.env.MONGODB_URI;

// app.use(express.static(path.join(process.cwd(), 'public')));
// // Middleware
// app.use(express.json());

// app.use(cors());
// // Ruta raíz
// app.get('/', (req, res) => {
//   console.log('Ruta Raiz');
//   res.send('Home');
// });

// // Rutas de la API
// routerAPI(app);

// // Conexión a la base de datos
// mongoose.connect(dburi);
// const db = mongoose.connection;
// db.on('error', (err) => {
//   console.error({ err });
// });
// db.once('open', () => {
//   console.log('Conexión con la DB correcta');
// });

// // Middleware de manejo de errores de multer
// app.use((err, req, res, next) => {
//   if (err.code === 'LIMIT_FILE_SIZE') {
//     return res.status(400).json({ message: 'Una de las imágenes es demasiado grande. Máximo 2MB por imagen.' });
//   }
//   if (err.message === 'Solo se permiten imágenes (jpg, png, webp)') {
//     return res.status(400).json({ message: err.message });
//   }
//   next(err);
// });


// // Middleware para rutas no encontradas
// app.use((req, res) => {
//   res.status(404).json({ message: 'Ruta no encontrada' });
// });

// // Arranca el servidor
// app.listen(port, () => {
//   console.log(`Servidor corriendo en http://localhost:${port}`);
// });

// index.js
import express from "express";
import dotenv from 'dotenv';
import routerAPI from './routes/index.js';
import mongoose from "mongoose";
import cors from 'cors';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT;
const dburi = process.env.MONGODB_URI;

// ✅ CORS para las rutas de API
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ✅ Middleware para agregar headers CORS a los archivos estáticos (PDFs, imágenes)
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// ✅ Servir archivos estáticos
app.use(express.static(path.join(process.cwd(), 'public')));

// ✅ Servir explícitamente /uploads (PDFs, imágenes, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Rutas de la API
routerAPI(app);

// Conexión a la base de datos
mongoose.connect(dburi);
const db = mongoose.connection;
db.on('error', (err) => {
  console.error({ err });
});
db.once('open', () => {
  console.log('Conexión con la DB correcta');
});

// Middleware de manejo de errores de multer
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Una de las imágenes es demasiado grande. Máximo 2MB por imagen.' });
  }
  if (err.message === 'Solo se permiten imágenes (jpg, png, webp)') {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Arranca el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
