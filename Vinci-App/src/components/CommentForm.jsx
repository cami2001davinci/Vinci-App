import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axiosInstance";

const CommentForm = ({ postId, parentComment = null, onNewComment }) => {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!postId) {
      console.error("Falta postId en CommentForm");
      setError("Error interno: falta ID del post");
      return;
    }

    if (!user) {
      setError("Tenés que iniciar sesión para comentar.");
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      setError("El comentario no puede estar vacío.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const payload = {
        content: trimmed,
        postId,
      };
      if (parentComment) {
        payload.parentComment = parentComment;
      }

      // ✅ ahora guardamos la respuesta
      const { data: newComment } = await axios.post("/comments", payload);

      // limpiamos el textarea
      setContent("");

      // callback local (PostPage / PostCard)
      if (typeof onNewComment === "function") {
        onNewComment(newComment);
      }

      // ✅ evento global para que cualquier PostCard actualice el contador
      window.dispatchEvent(
        new CustomEvent("vinci:post-comment", {
          detail: {
            postId,
            newComment, // 👈 acá va el comentario completo, NO solo el id
          },
        })
      );
    } catch (err) {
      console.error("Error al enviar comentario:", err);
      const msg =
        err?.response?.data?.message ||
        "No se pudo publicar el comentario. Intentá de nuevo.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Avatar del usuario como en Facebook
  const avatarSrc = user?.profilePicture
    ? `${import.meta.env.VITE_SERVER_URL || "http://localhost:3000"}${
        user.profilePicture
      }`
    : "/default-avatar.png";

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      {error && <p className="text-danger small mb-1">{error}</p>}

      <div className="d-flex align-items-start gap-2">
        {/* Avatar del usuario logueado */}
        <img
          src={avatarSrc}
          alt={user?.username || "Usuario"}
          className="rounded-circle"
          style={{
            width: "32px",
            height: "32px",
            objectFit: "cover",
          }}
        />

        <div className="flex-grow-1">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              parentComment
                ? "Responder a este comentario..."
                : "Escribe un comentario..."
            }
            className="w-100 border p-2 rounded mb-1 form-control"
            disabled={isSubmitting}
          />

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={isSubmitting || !content.trim()}
          >
            {isSubmitting ? "Publicando..." : "Comentar"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default CommentForm;
