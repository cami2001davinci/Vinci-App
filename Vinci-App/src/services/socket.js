// src/services/socket.js
import { io } from "socket.io-client";
import { CommentCountStore } from "../store/commentCountStore.js";

export const socket = io("http://localhost:3000", {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelayMax: 5000,
  auth: {
    token:
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      undefined,
  },
});

export const reconnectSocket = (token) => {
  const currentToken = socket.auth?.token;
  if (!token) {
    socket.auth = {};
    if (socket.connected) socket.disconnect();
    return;
  }
  if (token === currentToken && socket.connected) return;
  socket.auth = { token };
  if (socket.connected) socket.disconnect();
  socket.connect();
};

socket.on("connect", () => {
  console.log("[WS] connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("[WS] disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.log("[WS] connect_error:", err?.message);
});

socket.on("error", (err) => {
  console.log("[WS] error:", err);
});

// 💥 EVENTOS GLOBALES PARA TODA LA APP
socket.on("notification", (notif) => {
  window.dispatchEvent(
    new CustomEvent("vinci:notification", { detail: notif })
  );
});

socket.on("notification:new", (notif) => {
  window.dispatchEvent(
    new CustomEvent("vinci:notification", { detail: notif })
  );
});

socket.on("notifications:count", (payload) => {
  window.dispatchEvent(
    new CustomEvent("vinci:notifications-count", { detail: payload })
  );
});

socket.on("post:created", (payload) => {
  window.dispatchEvent(
    new CustomEvent("vinci:post-created", { detail: payload })
  );
});

socket.on("post:like", (payload) => {
  window.dispatchEvent(
    new CustomEvent("vinci:post-like", { detail: payload })
  );
});

socket.on("post:updated", (payload) => {
  window.dispatchEvent(
    new CustomEvent("vinci:post-updated", { detail: payload })
  );
});

socket.on("post:deleted", (payload) => {
  window.dispatchEvent(
    new CustomEvent("vinci:post-deleted", { detail: payload })
  );
});

socket.on("post:comment", (payload) => {
  // payload viene del backend: { postId, newComment }
  const { postId, newComment } = payload || {};

  // Si es comentario raíz (no es reply) → incrementamos el contador global
  if (postId && newComment && !newComment.parentComment) {
    CommentCountStore.increment(postId);
  }

  // Seguimos disparando el evento global para la app (carteles, etc.)
  window.dispatchEvent(
    new CustomEvent("vinci:post-comment", { detail: payload })
  );
});

socket.on("comment:like", (payload) => {
  window.dispatchEvent(
    new CustomEvent("vinci:comment-like", { detail: payload })
  );
});

socket.on("comment:update", (payload) => {
  window.dispatchEvent(
    new CustomEvent("vinci:comment-update", { detail: payload })
  );
});

socket.on("comment:delete", (payload) => {
  const { postId, isRoot } = payload || {};

  if (postId && isRoot) {
    CommentCountStore.decrement(postId);
  }

  window.dispatchEvent(
    new CustomEvent("vinci:comment-delete", { detail: payload })
  );
});

socket.on("chat:message", (payload) => {
  window.dispatchEvent(
    new CustomEvent("vinci:chat-message", { detail: payload })
  );
});

socket.on("collab:request", (payload) => {
  window.dispatchEvent(
    new CustomEvent("vinci:collab-request", { detail: payload })
  );
});

socket.on("collab:ignored", (payload) => {
  window.dispatchEvent(
    new CustomEvent("vinci:collab-ignored", { detail: payload })
  );
});

socket.on("project:match", (payload) => {
  window.dispatchEvent(
    new CustomEvent("vinci:project-match", { detail: payload })
  );
});

export default socket;
