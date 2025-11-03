// // index.js
// import express from 'express';
// import dotenv from 'dotenv';
// import routerAPI from './routes/index.js';
// import mongoose from "mongoose";
// import cors from 'cors';
// import path from 'path';

// dotenv.config();

// const app = express();
// const port = process.env.PORT;
// const dburi = process.env.MONGODB_URI;

// console.log("NODE_EXTRA_CA_CERTS =", process.env.NODE_EXTRA_CA_CERTS || "(no-set)");

// // CORS para las rutas de API
// app.use(cors({
//   origin: 'http://localhost:5173',
//   credentials: true,
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// app.use(express.json());

// // Middleware para agregar headers CORS a los archivos estáticos (PDFs, imágenes)
// app.use('/uploads', (req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//   next();
// });

// //  Servir archivos estáticos
// app.use(express.static(path.join(process.cwd(), 'public')));

// // Servir explícitamente /uploads (PDFs, imágenes, etc.)
// app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

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
import dotenv from "dotenv";
import routerAPI from "./routes/index.js";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import http from "http"; // 👈 agregado
import { Server } from "socket.io"; // 👈 agregado
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const dburi = process.env.MONGODB_URI;

console.log(
  "NODE_EXTRA_CA_CERTS =",
  process.env.NODE_EXTRA_CA_CERTS || "(no-set)"
);

// CORS para las rutas de API
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Middleware para agregar headers CORS a los archivos estáticos (PDFs, imágenes)
app.use("/uploads", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

//  Servir archivos estáticos
app.use(express.static(path.join(process.cwd(), "public")));

// Servir explícitamente /uploads (PDFs, imágenes, etc.)
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "public", "uploads"))
);

// Rutas de la API
routerAPI(app);

// Conexión a la base de datos
mongoose.connect(dburi);
const db = mongoose.connection;
db.on("error", (err) => console.error({ err }));
db.once("open", () => console.log("Conexión con la DB correcta"));

// Middleware de manejo de errores de multer
app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({
        message:
          "Una de las imágenes es demasiado grande. Máximo 2MB por imagen.",
      });
  }
  if (err.message === "Solo se permiten imágenes (jpg, png, webp)") {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

// 🔸 Crear servidor HTTP base y montar Socket.IO
const server = http.createServer(app);

// Configurar WebSockets
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// Middleware antes del io.on('connection')
// 🔧 AUTH PERMISIVO PARA PROBAR
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    console.log("[WS] handshake SIN token. Se permite conectar sin room.");
    socket.userId = null;
    return next(); // permitimos la conexión (solo para debug)
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // ajustá esta línea si tu payload usa otro campo (ej: payload.user.id)
    socket.userId = payload.id || payload._id || payload.userId;
    console.log("[WS] handshake OK. userId =", socket.userId);
    return next();
  } catch (e) {
    console.log("[WS] handshake token inválido:", e.message);
    socket.userId = null;
    return next(); // permitimos conectar igual, sin room (solo debug)
  }
});

io.on("connection", (socket) => {
  console.log("🔌 Cliente conectado:", socket.id);

  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
    console.log(`🧩 unido a room user:${socket.userId}`);
  } else {
    console.log("🟨 conectado sin userId (no se unió a room de usuario)");
  }
  socket.on("post:join", (postId) => {
    if (!postId) return;
    socket.join(`post:${postId}`);
    // console.log(`👥 socket ${socket.id} se unió a post:${postId}`);
  });

  socket.on("post:leave", (postId) => {
    if (!postId) return;
    socket.leave(`post:${postId}`);
  });

  // envío un ping para verificar que el front reciba algo
  socket.emit("connected", { ok: true, sid: socket.id, userId: socket.userId });

  socket.on("disconnect", (reason) => {
    console.log("❌ Cliente desconectado:", socket.id, "| reason:", reason);
  });
});

// Arrancar el servidor HTTP + WS
server.listen(port, () => {
  console.log(`Servidor y WebSocket corriendo en http://localhost:${port}`);
});

export { io }; // 👈 exportamos si querés usarlo desde otros controladores
