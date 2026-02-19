import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axiosInstance";
import UserAvatar from "./UserAvatar"; // 👈 1. Importamos el componente
import "../styles/Comments.css";

const CommentForm = ({ postId, parentComment = null, onNewComment }) => {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 👇 Aquí obtenemos 'user', no 'author'
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!postId) return;
    if (!user) {
      setError("Inicia sesión para comentar.");
      return;
    }
    
    const trimmed = content.trim();
    if (!trimmed) return;

    // 🚀 OPTIMISTIC UI: Guardamos el texto y limpiamos el input YA MISMO
    const contentToSend = trimmed;
    setContent(""); 
    setError("");
    setIsSubmitting(true);

    try {
      const payload = { content: contentToSend, postId };
      if (parentComment) payload.parentComment = parentComment;

      const { data: newComment } = await axios.post("/comments", payload);
      
      // El input ya está limpio, así que solo notificamos
      if (onNewComment) onNewComment(newComment);

      // Disparamos evento global para que Socket/UI se enteren
      window.dispatchEvent(
        new CustomEvent("vinci:post-comment", {
          detail: { postId, newComment },
        })
      );

    } catch (err) {
      console.error(err);
      // ⚠️ ROLLBACK: Si falló, devolvemos el texto al input
      setContent(contentToSend);
      setError("Error al comentar. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="neo-comment-form">
      {/* 👇 CORRECCIÓN AQUÍ: 
          Usamos la variable 'user' que viene del useAuth(), no 'author'.
      */}
      <UserAvatar 
        user={user} 
        className="neo-comment-avatar" 
      />
      
      <div style={{ flexGrow: 1 }}>
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={parentComment ? "Escribe una respuesta..." : "Deja tu comentario..."}
          className="neo-comment-input"
          disabled={isSubmitting}
        />
        {error && <p className="text-danger small mt-1 fw-bold">{error}</p>}
      </div>

      <button
        type="submit"
        className="neo-comment-submit-btn"
        disabled={isSubmitting || (!content.trim() && !isSubmitting)}
      >
        {isSubmitting ? "..." : "ENVIAR"}
      </button>
    </form>
  );
};

export default CommentForm;