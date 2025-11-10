// src/services/socket.js
import { io } from 'socket.io-client';

export const socket = io('http://localhost:3000', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelayMax: 5000,
  auth: {
    token: localStorage.getItem('token') || undefined,
  },
});


socket.on('connect', () => console.log('[WS] connected:', socket.id));
socket.on('disconnect', (reason) => console.log('[WS] disconnected:', reason));
socket.on('connect_error', (err) => console.log('[WS] connect_error:', err?.message));
socket.on('error', (err) => console.log('[WS] error:', err));

export default socket;
