// utils/realtime.js
import { io } from '../../index.js';

/**
 * Envía un evento de Socket.IO a un usuario específico
 * @param {string|ObjectId} userId - ID del usuario (Mongo)
 * @param {string} event - Nombre del evento (ej. 'notification')
 * @param {object} payload - Datos a enviar
 */
export function emitToUser(userId, event, payload) {
  if (!userId) return;
  try {
    io.to(`user:${userId}`).emit(event, payload);
    console.log(`🔔 Emitido evento "${event}" a user:${userId}`);
  } catch (err) {
    console.error('Error al emitir evento:', err.message);
  }
}
export function emitToPost(postId, event, payload) {
  if (!postId) return;
  try {
    io.to(`post:${postId}`).emit(event, payload);
    console.log(`📣 Emitido evento "${event}" a room post:${postId}`);
  } catch (err) {
    console.error('Error al emitir evento a post:', err.message);
  }
}