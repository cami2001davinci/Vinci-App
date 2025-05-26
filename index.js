import express from "express";
import dotenv from 'dotenv';
import routerAPI from './routes/index.js';
import mongoose from "mongoose";

dotenv.config();

const app = express();
const port = process.env.PORT;
const dburi = process.env.MONGODB_URI;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Ruta raíz
app.get('/', (req, res) => {
  console.log('Ruta Raiz');
  res.send('Home');
});

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

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Arranca el servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
