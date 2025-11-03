// realtime/socket.js
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// Guarda referencia global del io
let io;

/**
 * Inicializa Socket.IO sobre un HTTP server ya creado.
 * @param {http.Server} httpServer
 * @param {object} opts { jwtSecret, corsOrigin }
 */
export function initSocket(httpServer, { jwtSecret, corsOrigin }) {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin, // ej: ['http://localhost:5173']
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Autenticación simple por query.token (o por header, si preferís)
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Missing token'));

      const payload = jwt.verify(token, jwtSecret);
      socket.userId = payload.id || payload._id || payload.userId;
      if (!socket.userId) return next(new Error('Invalid token payload'));

      return next();
    } catch (e) {
      return next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId?.toString();
    if (!userId) return socket.disconnect(true);

    // Room por usuario: notificaciones directas
    const userRoom = `user:${userId}`;
    socket.join(userRoom);

    // (Opcional) Rooms por conversación (cuando abras una): socket.join(`conv:${conversationId}`)

    // Handshake OK
    socket.emit('connected', { ok: true });

    socket.on('disconnect', () => {
      // cleanup si necesitas
    });
  });

  return io;
}

/** Devuelve la instancia io para emitir desde controllers */
export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
