// src/components/UserAvatar.jsx
import { useMemo } from "react";

function stringToColor(string) {
  if (!string) return "#CCCCCC";
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ("00" + value.toString(16)).substr(-2);
  }
  return color;
}

export default function UserAvatar({ user, className = "" }) {
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

  const avatarSrc = useMemo(() => {
    if (!user?.profilePicture) return null;
    if (user.profilePicture.startsWith("http")) return user.profilePicture;
    return `${serverUrl}${user.profilePicture}`;
  }, [user?.profilePicture, serverUrl]);

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : "?";

  const uniqueColor = useMemo(() => {
    const seed = user?._id || user?.username || "default";
    return stringToColor(seed.toString());
  }, [user?._id, user?.username]);

  // CLASE BASE (Tamaño y forma)
  // Esta clase viene desde PostCard (neo-post-card__avatar) o Comments (neo-comment-avatar)
  const baseClass = className;

  // CASO 1: TIENE FOTO (Renderizamos IMG)
  if (avatarSrc) {
    return (
      <img
        src={avatarSrc}
        alt={user?.username || "Avatar"}
        className={`${baseClass} neo-avatar-photo`} // Clase extra opcional
        onError={(e) => {
           // Si falla la carga, ocultamos la img y mostramos el div hermano (fallback)
           // O mejor aún, forzamos un re-render (pero por simplicidad css:)
           e.target.style.display = 'none';
           if(e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
        }}
      />
    );
  }

  // CASO 2: NO TIENE FOTO (Renderizamos DIV con iniciales)
  // Agregamos la clase "neo-avatar-initials" para aplicar flex y centrado SOLO aquí
  return (
    <div 
      className={`${baseClass} neo-avatar-initials`} 
      style={{ backgroundColor: uniqueColor }}
    >
      {initial}
    </div>
  );
}