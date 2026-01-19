// src/components/NotificationBridge.jsx
import { useEffect, useRef } from "react";
// 👇 importamos el mp3 desde src/assets
import notificationSound from "../assets/sounds/out-of-nowhere-message-tone.mp3";

/**
 * NotificationBridge
 * - Se monta una sola vez (en App.jsx).
 * - Escucha el evento global "vinci:notification".
 * - Reproduce el sonido cada vez que llega una notificación.
 */
export default function NotificationBridge() {
  const soundRef = useRef(null);

  // Cargar sonido y desbloquear audio
  useEffect(() => {
    const audio = new Audio(notificationSound);
    soundRef.current = audio;

    // Desbloqueo por primera interacción (Chrome / móviles)
    const unlock = () => {
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          document.removeEventListener("click", unlock);
        })
        .catch(() => {
          document.removeEventListener("click", unlock);
        });
    };

    document.addEventListener("click", unlock);

    return () => {
      document.removeEventListener("click", unlock);
    };
  }, []);

  // Escuchar evento global y reproducir sonido
  useEffect(() => {
    const handler = () => {
      const audio = soundRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    window.addEventListener("vinci:notification", handler);
    return () => window.removeEventListener("vinci:notification", handler);
  }, []);

  return null; // no dibuja nada
}
