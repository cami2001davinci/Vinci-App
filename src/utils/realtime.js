// utils/realtime.js
import { io } from "../../index.js";

/**
 * Emitir a un usuario específico (room user:ID)
 */
export function emitToUser(userId, event, payload) {
  if (!userId) return;
  try {
    io.to(`user:${userId}`).emit(event, payload);
    console.log(`�Y"" [emitToUser] ${event} ��' user:${userId}`);
  } catch (err) {
    console.error("emitToUser ERROR:", err);
  }
}

/**
 * Emitir a un post específico (room post:ID)
 */
export function emitToPost(postId, event, payload) {
  if (!postId) return;
  try {
    io.to(`post:${postId}`).emit(event, payload);
    console.log(`�Y'� [emitToPost] ${event} ��' post:${postId}`);
  } catch (err) {
    console.error("emitToPost ERROR:", err);
  }
}

/**
 * Emitir a una conversación específica (room conv:ID)
 */
export function emitToConversation(conversationId, event, payload) {
  if (!conversationId) return;
  try {
    io.to(`conv:${conversationId}`).emit(event, payload);
    console.log(`�Y"" [emitToConversation] ${event} ��' conv:${conversationId}`);
  } catch (err) {
    console.error("emitToConversation ERROR:", err);
  }
}

/**
 * Emitir a TODOS los clientes conectados
 * (Esto es lo que faltaba para nuevos posts)
 */
export function emitToAll(event, payload) {
  try {
    io.emit(event, payload);
    console.log(`�YO? [emitToAll] ${event} ��' broadcast global`);
  } catch (err) {
    console.error("emitToAll ERROR:", err);
  }
}
