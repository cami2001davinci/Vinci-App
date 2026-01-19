import { useEffect, useRef, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import axios from "../api/axiosInstance";
import CommentsList from "../components/CommentsList";
import CommentForm from "../components/CommentForm";
import { socket } from "../services/socket";
import { HIGHLIGHT_MS } from "../constants/ui.js";
import PostContent from "../components/PostContent";
import { CommentCountStore } from "../store/commentCountStore";
import CollabActions from "../components/CollabActions";

export default function PostPage() {
  const { id } = useParams();
  const [qp] = useSearchParams();
  const highlightKind = qp.get("highlight");
  const anchorId = qp.get("anchorId");

  const location = useLocation();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [commentsVersion, setCommentsVersion] = useState(0);

  const [likes, setLikes] = useState(0);
  const [showComments, setShowComments] = useState(true);
  const [highlightCommentId, setHighlightCommentId] = useState(
    anchorId || null
  );

  const [pendingNewComments, setPendingNewComments] = useState([]);
  const [commentsCount, setCommentsCount] = useState(
    CommentCountStore.getCount(id)
  ); // contador visible

  useEffect(() => {
    // suscribirse cuando se monta
    CommentCountStore.subscribe(id, setCommentsCount);

    return () => {
      CommentCountStore.unsubscribe(id, setCommentsCount);
    };
  }, [id]);

  const postContainerRef = useRef(null);
  const postHighlightTimer = useRef(null);
  const collabClosed = post?.collabStatus === "team_chosen";
  const selectedNames = (post?.selectedCollaborators || [])
    .map((u) => u?.username)
    .filter(Boolean);


  // Mantener highlightCommentId sincronizado con la URL
  useEffect(() => {
    setHighlightCommentId(anchorId || null);
  }, [anchorId]);

  // Cargar post
  useEffect(() => {
    let ignore = false;

    (async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`/posts/${id}`);
        if (!ignore) {
          setPost(data);
          setLikes(data.likedBy?.length || 0);
          // El número real lo define CommentsList cuando termine de cargar
          setCommentsCount(0);
        }
      } catch (e) {
        if (!ignore) setErrorMsg("No se pudo cargar el post.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [id]);

  // Unirse al room del post en socket.io
  useEffect(() => {
    if (!id) return;
    socket.emit("post:join", id);
    return () => socket.emit("post:leave", id);
  }, [id]);

  // NEW: refrescar el post en vivo cuando cambie (post:updated / project:teamFinalized)
  useEffect(() => {
    const handler = (payload) => {
      if (payload?.postId?.toString() === id?.toString() && payload?.post) {
        setPost(payload.post);
      }
    };
    socket.on("post:updated", handler);
    socket.on("project:teamFinalized", handler);
    return () => {
      socket.off("post:updated", handler);
      socket.off("project:teamFinalized", handler);
    };
  }, [id]);

  // ❤️ Likes en vivo
  useEffect(() => {
    const handler = (e) => {
      const { postId, likesCount } = e.detail || {};
      if (postId === id) setLikes(likesCount);
    };

    window.addEventListener("vinci:post-like", handler);
    return () => window.removeEventListener("vinci:post-like", handler);
  }, [id]);

  // 💬 Comentarios nuevos en vivo → solo manejamos el cartel de "Hay X nuevos"
  useEffect(() => {
    const handler = (e) => {
      const { postId, newComment } = e.detail || {};
      if (!newComment || postId !== id) return;

      // NO tocamos commentsCount acá, solo guardamos los nuevos para el cartel
      if (!newComment.parentComment) {
        setPendingNewComments((prev) => {
          if (prev.some((c) => c._id === newComment._id)) return prev;
          return [...prev, newComment];
        });
      }
    };

    window.addEventListener("vinci:post-comment", handler);
    return () => window.removeEventListener("vinci:post-comment", handler);
  }, [id]);

  // Highlight del post (cuando venís desde notificación)
  useEffect(() => {
    if (!post) return;

    const comingFromNotif = Boolean(location.state?.fromNotification);
    const wantPostHighlight =
      highlightKind === "post" || (!anchorId && comingFromNotif);

    if (!wantPostHighlight) return;

    const target = postContainerRef.current;
    if (!target) return;

    target.classList.add("highlight-yellow");
    postHighlightTimer.current = setTimeout(() => {
      target.classList.remove("highlight-yellow");
    }, HIGHLIGHT_MS);

    return () => {
      target.classList.remove("highlight-yellow");
    };
  }, [post, highlightKind, anchorId, location.state?.fromNotification]);

  // Limpiar timer en unmount
  useEffect(() => {
    return () => {
      if (postHighlightTimer.current) clearTimeout(postHighlightTimer.current);
    };
  }, []);

  // Like del post desde UI
  const toggleLike = async () => {
    if (!post?._id) return;
    try {
      const res = await axios.put(`/posts/${post._id}/like`);
      setLikes(res.data.likesCount);
    } catch {
      // opcional: mostrar error
    }
  };

  // Volver al foro correcto (o donde corresponda)
  const handleBack = () => {
    if (post?.degree?.slug) {
      navigate(`/degrees/${post.degree.slug}`);
    } else if (location.state?.fromNotification) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  // Cuando el usuario toca "Ver" en el cartel de comentarios nuevos
  const handleShowNewComments = () => {
    if (pendingNewComments.length === 0) return;
    const last = pendingNewComments[pendingNewComments.length - 1];

    // Vamos a ese comentario
    setHighlightCommentId(last._id);
    // Forzar recarga de CommentsList
    setCommentsVersion((v) => v + 1);
    setPendingNewComments([]);
  };

  if (loading) return <div className="p-4">Cargando…</div>;
  if (errorMsg) return <div className="p-4 text-danger">{errorMsg}</div>;
  if (!post) return <div className="p-4">Post no encontrado.</div>;

  return (
    <div className="container mx-auto px-4 py-4">
      <div ref={postContainerRef} className="card mb-3 shadow-sm">
        <div className="card-body">
          <PostContent post={post} />
          {collabClosed && selectedNames.length > 0 && (
            <div className="small text-success mt-2">
              <strong>Trabajando con:</strong> {selectedNames.join(" · ")}
            </div>
          )}
          <CollabActions post={post} onPostUpdate={setPost} />

          <div className="d-flex gap-2 mt-3">
            <button onClick={toggleLike} className="btn btn-light btn-sm">
              <i className="bi bi-hand-thumbs-up" /> Me gusta ({likes})
            </button>

            <button
              onClick={() => setShowComments((prev) => !prev)}
              className="btn btn-light btn-sm"
            >
              <i className="bi bi-chat" /> Comentarios ({commentsCount})
            </button>
          </div>
        </div>
      </div>

      {showComments && (
        <div className="mt-2">
          <CommentForm
            postId={post._id}
            onNewComment={() => setCommentsVersion((x) => x + 1)}
          />

          {/* Cartel de comentarios nuevos en vivo */}
          {pendingNewComments.length > 0 && (
            <div className="alert alert-info py-1 px-2 small d-flex justify-content-between align-items-center mt-2">
              <span>
                {pendingNewComments.length === 1
                  ? "Hay 1 comentario nuevo"
                  : `Hay ${pendingNewComments.length} comentarios nuevos`}
              </span>
              <button
                type="button"
                className="btn btn-link btn-sm p-0 ms-2"
                onClick={handleShowNewComments}
              >
                Ver
              </button>
            </div>
          )}

          <CommentsList
            key={`${post._id}-${commentsVersion}`}
            postId={post._id}
            highlightCommentId={highlightCommentId}
          />
        </div>
      )}

      {(location.state?.fromNotification || highlightKind) && (
        <button
          type="button"
          className="btn btn-primary fab-back"
          onClick={handleBack}
        >
          ←
        </button>
      )}
    </div>
  );
}
