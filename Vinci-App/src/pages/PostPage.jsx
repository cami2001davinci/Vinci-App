import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import axios from "../api/axiosInstance";
import PostCard from "../components/PostCard";
import CommentsList from "../components/CommentsList";
import socket from "../services/socket.js"; // si tu export es distinto, ajustá

export default function PostPage() {
  const { id } = useParams();                     // /posts/:id
  const [qp] = useSearchParams();
  const highlightId = qp.get("comment");          // ?comment=<commentId>

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // 1) Fetch del post
  useEffect(() => {
    let ignore = false;

    (async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        // con baseURL '/api', esto pega a GET /api/posts/:postId
        const { data } = await axios.get(`/posts/${id}`);
        if (!ignore) setPost(data);
      } catch (e) {
        console.error("Error cargando post:", e);
        if (!ignore) setErrorMsg("No se pudo cargar el post.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => { ignore = true; };
  }, [id]);

  // 2) Unirse al "room" del post para tiempo real
  useEffect(() => {
    if (!id) return;
    try {
      socket?.emit("post:join", id);
      return () => socket?.emit("post:leave", id);
    } catch {
      /* si no hay socket, no rompe */
    }
  }, [id]);

  // 3) Cuando hay ?comment=... y ya cargó el DOM, scrollear y resaltar
  useEffect(() => {
    if (!highlightId || !post) return;

    // pequeño delay para asegurar render de CommentsList
    const t = setTimeout(() => {
      const el = document.querySelector(
        `[data-comment-id="${highlightId}"]`
      );
      if (el) {
        // scroll al centro
        el.scrollIntoView({ behavior: "smooth", block: "center" });

        // highlight suave (funciona con Tailwind o Bootstrap "bg-warning-subtle")
        el.classList.add("bg-warning-subtle");
        // fallback visual si no tenés esa clase
        const prevBg = el.style.backgroundColor;
        el.style.transition = "background-color 0.3s ease";
        el.style.backgroundColor = el.style.backgroundColor || "#fff3cd"; // amarillo suave

        setTimeout(() => {
          el.classList.remove("bg-warning-subtle");
          el.style.backgroundColor = prevBg || "";
        }, 1800);
      }
    }, 80);

    return () => clearTimeout(t);
  }, [post, highlightId]);

  if (loading) return <div className="p-4">Cargando…</div>;
  if (errorMsg) return <div className="p-4 text-danger">{errorMsg}</div>;
  if (!post) return <div className="p-4">Post no encontrado.</div>;

  return (
    <div className="container mx-auto px-4 py-4">
      {/* Tu card de post. Si tenés soporte de "readOnly", podés pasarla */}
      <PostCard post={post} readOnly />

      <div className="mt-4">
        {/* MUY IMPORTANTE: CommentsList debe marcar cada comentario con data-comment-id={comment._id} */}
        <CommentsList postId={post._id} highlightId={highlightId} />
      </div>
    </div>
  );
}
