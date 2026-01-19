// src/components/CommentsList.jsx
import { useCallback, useEffect, useState, useRef } from "react";
import axios from "../api/axiosInstance";
import CommentForm from "./CommentForm";
import { useAuth } from "../context/AuthContext";
import { CommentCountStore } from "../store/commentCountStore.js";

/* ========================================================================
   COMMENT ITEM (comentario individual + replies)
   ======================================================================== */
function CommentItem({
  comment,
  postId,
  depth = 0,
  highlightCommentId = null,
  expandPath = [],
  forceExpandAll = false,
  onCommentChanged,
}) {
  const { user } = useAuth();

  const [commentData, setCommentData] = useState(comment);
  const commentId = commentData?._id;
  const parentCommentId =
    typeof commentData?.parentComment === "object"
      ? commentData.parentComment?._id ||
        commentData.parentComment?.toString?.()
      : commentData?.parentComment || null;

  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [likes, setLikes] = useState(comment.likedBy?.length || 0);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content || "");
  const [showMenu, setShowMenu] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [showNewBadge, setShowNewBadge] = useState(
    highlightCommentId === commentId
  );

  const containerRef = useRef(null);

  useEffect(() => {
    setCommentData(comment);
    setLikes(comment.likedBy?.length || 0);
    setEditedContent(comment.content || "");
  }, [comment]);

  // Datos del autor
  const handle = commentData?.author?.username || "usuario";
  const displayName = `${commentData?.author?.firstName || ""} ${
    commentData?.author?.lastName || ""
  }`
    .trim()
    .replace(/\s+/g, " ");

  const authorDegrees = Array.isArray(commentData?.author?.degrees)
    ? commentData.author.degrees
    : [];
  const degreeNames = authorDegrees.map((deg) => deg?.name).filter(Boolean);
  const visibleDegrees = degreeNames.slice(0, 2);
  const extraDegreesCount = Math.max(
    degreeNames.length - visibleDegrees.length,
    0
  );

  const isHighlighted = highlightCommentId === commentId;
  const shouldExpand = commentId
    ? expandPath.includes(commentId)
    : false;

  const rawAuthor = commentData?.author;
  const authorId =
    typeof rawAuthor === "object" && rawAuthor?._id
      ? rawAuthor._id
      : rawAuthor;

  const currentUserId = user?._id || user?.id;
  const isAuthor =
    currentUserId &&
    authorId &&
    authorId.toString() === currentUserId.toString();

  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  const avatarUrl = commentData?.author?.profilePicture
    ? `${serverUrl}${commentData.author.profilePicture}`
    : "/default-avatar.png";

  /* ---------------------------- Acciones ---------------------------- */

  const toggleLike = async () => {
    if (!commentId) return;
    try {
      setErrorMsg("");
      const res = await axios.put(`/comments/${commentId}/like`);
      setLikes(res.data.likesCount);

      window.dispatchEvent(
        new CustomEvent("vinci:comment-like", {
          detail: {
            postId,
            commentId,
            likesCount: res.data.likesCount,
          },
        })
      );
    } catch (error) {
      console.error("Error al dar like al comentario:", error);
      const msg =
        error.response?.data?.message || "No se pudo dar like al comentario.";
      setErrorMsg(msg);
    }
  };

  const fetchReplies = useCallback(async () => {
    if (!commentId) return;
    try {
      const res = await axios.get(`/comments/replies/${commentId}`);
      setReplies(res.data || []);
    } catch (err) {
      console.error("Error al obtener respuestas:", err);
      setErrorMsg("No se pudieron cargar las respuestas.");
    }
  }, [commentId]);

  const handleToggleReplies = () => {
    if (!showReplies) {
      fetchReplies();
    }
    setShowReplies((prev) => !prev);
  };

  const handleUpdate = async () => {
    if (!commentId) return;
    try {
      setErrorMsg("");
      const { data } = await axios.put(`/comments/${commentId}`, {
        content: editedContent,
      });
      setIsEditing(false);
      setEditedContent(data.content ?? editedContent);
      setCommentData((prev) => ({ ...(prev || {}), ...data }));
      onCommentChanged?.();

      window.dispatchEvent(
        new CustomEvent("vinci:comment-update", {
          detail: {
            postId,
            commentId,
            parentComment: parentCommentId,
            comment: data,
          },
        })
      );
    } catch (err) {
      console.error("Error al editar comentario:", err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        "No se pudo editar el comentario.";
      setErrorMsg(msg);
    }
  };

  const handleDelete = async () => {
    if (!commentId) return;
    try {
      setErrorMsg("");
      await axios.delete(`/comments/${commentId}`);
      setConfirmingDelete(false);

      // Refrescar lista en este post
      onCommentChanged?.();

      // Avisar globalmente para otras vistas (Home, DegreePage, etc.)
      window.dispatchEvent(
        new CustomEvent("vinci:comment-delete", {
          detail: {
            postId,
            commentId,
            parentComment: parentCommentId,
          },
        })
      );
    } catch (err) {
      console.error("Error al eliminar comentario:", err);
      let msg =
        err.response?.data?.message || "No se pudo eliminar el comentario.";
      if (err.response?.status === 403) {
        msg = "Solo podés eliminar tus propios comentarios.";
      }
      setErrorMsg(msg);
    }
  };

  const handleReport = async () => {
    if (!commentId) return;
    try {
      setErrorMsg("");
      setSuccessMsg("");
      await axios.put(`/comments/flag/${commentId}`);
      setSuccessMsg("Comentario reportado. Gracias por avisar 💬");
    } catch (err) {
      console.error("Error al reportar comentario:", err);
      const msg =
        err.response?.data?.message ||
        "No se pudo reportar el comentario. Intentalo más tarde.";
      setErrorMsg(msg);
    }
  };

  const handleNewReply = () => {
    fetchReplies();
    setShowReplyForm(false);
    setShowReplies(true);
    onCommentChanged?.();
  };

  /* ------------------------ Efectos visuales ------------------------ */

  // Scroll suave al comentario destacado
  useEffect(() => {
    if (isHighlighted && containerRef.current) {
      containerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isHighlighted]);

  // Expandir/colapsar respuestas según "Todos" o path
  useEffect(() => {
    if (forceExpandAll) {
      if (!showReplies) {
        setShowReplies(true);
        fetchReplies();
      }
    } else {
      if (shouldExpand) {
        if (!showReplies) {
          setShowReplies(true);
          fetchReplies();
        }
      } else {
        if (showReplies) {
          setShowReplies(false);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceExpandAll, shouldExpand]);

  // Badge "Nuevo comentario"
  useEffect(() => {
    if (isHighlighted) {
      setShowNewBadge(true);
      const t = setTimeout(() => setShowNewBadge(false), 4000);
      return () => clearTimeout(t);
    } else {
      setShowNewBadge(false);
    }
  }, [isHighlighted]);

  useEffect(() => {
    if (!commentId) return;

    const normalizeId = (value) => {
      if (!value) return null;
      if (typeof value === "string") return value;
      if (typeof value === "object") {
        if (value._id) return value._id.toString();
        if (typeof value.toString === "function") {
          return value.toString();
        }
      }
      return null;
    };

    const handleCommentLike = (e) => {
      const { commentId: payloadId, likesCount } = e.detail || {};
      if (!payloadId || typeof likesCount !== "number") return;
      if (payloadId === commentId) {
        setLikes(likesCount);
      }
    };

    const handleCommentUpdate = (e) => {
      const { commentId: payloadId, comment: updated, parentComment } =
        e.detail || {};
      if (!payloadId) return;

      if (payloadId === commentId) {
        if (updated) {
          setCommentData((prev) => ({ ...(prev || {}), ...updated }));
          if (Array.isArray(updated.likedBy)) {
            setLikes(updated.likedBy.length);
          }
          if (typeof updated.content === "string") {
            setEditedContent(updated.content);
          }
        } else if (typeof e.detail?.content === "string") {
          const newContent = e.detail.content;
          setCommentData((prev) => ({
            ...(prev || {}),
            content: newContent,
          }));
          setEditedContent(newContent);
        }
      } else {
        const normalizedParent = normalizeId(parentComment);
        if (normalizedParent && normalizedParent === commentId && showReplies) {
          fetchReplies();
        }
      }
    };

    const handleNewReply = (e) => {
      const { newComment } = e.detail || {};
      const replyParent = normalizeId(newComment?.parentComment);
      if (replyParent && replyParent === commentId && showReplies) {
        fetchReplies();
      }
    };

    const handleCommentDelete = (e) => {
      const { commentId: deletedId, parentComment } = e.detail || {};
      if (!deletedId) return;
      const normalizedParent = normalizeId(parentComment);
      if (normalizedParent && normalizedParent === commentId) {
        setReplies((prev) => prev.filter((reply) => reply._id !== deletedId));
      }
      if (deletedId === commentId) {
        setShowReplies(false);
        setReplies([]);
      }
    };

    window.addEventListener("vinci:comment-like", handleCommentLike);
    window.addEventListener("vinci:comment-update", handleCommentUpdate);
    window.addEventListener("vinci:post-comment", handleNewReply);
    window.addEventListener("vinci:comment-delete", handleCommentDelete);

    return () => {
      window.removeEventListener("vinci:comment-like", handleCommentLike);
      window.removeEventListener("vinci:comment-update", handleCommentUpdate);
      window.removeEventListener("vinci:post-comment", handleNewReply);
      window.removeEventListener("vinci:comment-delete", handleCommentDelete);
    };
  }, [commentId, showReplies, fetchReplies]);

  /* ---------------------------- Render ---------------------------- */

  return (
    <div
      ref={containerRef}
      className={`comment-item border rounded p-3 mb-2 ${
        isHighlighted ? "highlight-yellow" : "bg-white"
      }`}
      style={{ marginLeft: depth * 16 }}
      data-comment-id={commentId}
    >
      <div className="d-flex justify-content-between align-items-start">
        <div className="d-flex align-items-start">
          <img
            src={avatarUrl}
            alt="avatar"
            className="comment-avatar rounded-circle me-2"
            style={{ width: "40px", height: "40px", objectFit: "cover" }}
          />
          <div>
            <div className="fw-bold">
              {displayName || handle} @{handle}
            </div>

            {visibleDegrees.length > 0 && (
              <small className="text-muted meta-degree d-block">
                Estudia: {visibleDegrees.join(" · ")}
                {extraDegreesCount > 0 ? ` +${extraDegreesCount}` : ""}
              </small>
            )}

            {showNewBadge && (
              <span className="badge bg-warning text-dark me-2">
                Nuevo comentario
              </span>
            )}

            {isEditing ? (
              <input
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="form-control form-control-sm mt-1"
              />
            ) : (
              <p className="text-muted mb-1">{commentData?.content}</p>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="position-relative">
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="btn btn-sm btn-light"
            >
              <i className="bi bi-three-dots"></i>
            </button>

            {showMenu && (
              <div
                className="dropdown-menu show p-2"
                style={{ right: 0, zIndex: 1000, position: "absolute" }}
              >
                {isAuthor ? (
                  <>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="dropdown-item text-danger"
                      onClick={() => {
                        setConfirmingDelete(true);
                        setShowMenu(false);
                      }}
                    >
                      Eliminar
                    </button>
                  </>
                ) : (
                  <button
                    className="dropdown-item text-warning"
                    onClick={() => {
                      handleReport();
                      setShowMenu(false);
                    }}
                  >
                    Reportar comentario
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mensajes de error / éxito */}
      {errorMsg && (
        <div className="alert alert-danger py-1 px-2 mt-2 ms-5 small">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success py-1 px-2 mt-2 ms-5 small">
          {successMsg}
        </div>
      )}

      {/* Confirm de eliminación */}
      {confirmingDelete && (
        <div className="alert alert-warning py-2 px-3 d-flex justify-content-between align-items-center mt-2 ms-5">
          <span className="small">¿Eliminar este comentario?</span>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={handleDelete}
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="d-flex gap-2 mt-2 ms-5">
        {isEditing ? (
          <>
            <button onClick={handleUpdate} className="btn btn-success btn-sm">
              Guardar
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="btn btn-secondary btn-sm"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setShowReplyForm((prev) => !prev)}
              className="btn btn-light btn-sm"
            >
              <i className="bi bi-reply"></i> Responder
            </button>
            <button
              onClick={handleToggleReplies}
              className="btn btn-light btn-sm"
            >
              <i className="bi bi-chat-dots"></i>{" "}
              {showReplies ? "Ocultar respuestas" : "Ver respuestas"}
            </button>
            <button onClick={toggleLike} className="btn btn-light btn-sm">
              <i className="bi bi-heart"></i> {likes}
            </button>
          </>
        )}
      </div>

      {/* Formulario de respuesta */}
      {showReplyForm && (
        <CommentForm
          postId={postId}
          parentComment={commentId}
          onNewComment={handleNewReply}
        />
      )}

      {/* Subcomentarios */}
      {showReplies &&
        replies.map((reply) => (
          <CommentItem
            key={reply._id}
            comment={reply}
            postId={postId}
            depth={depth + 1}
            onCommentChanged={onCommentChanged}
            highlightCommentId={highlightCommentId}
            expandPath={expandPath}
            forceExpandAll={forceExpandAll}
          />
        ))}
    </div>
  );
}

/* ========================================================================
   COMMENTS LIST
   ======================================================================== */
function CommentsList({
  postId,
  highlightCommentId = null,
  forceExpandAll = false,
  onCommentsCountChange,
}) {
  const [comments, setComments] = useState([]);
  const [expandPath, setExpandPath] = useState([]);
  const [filterMode, setFilterMode] = useState("recent"); // "recent" | "all"

 const loadComments = async () => {
  try {
    const res = await axios.get(`/comments/post/${postId}`);
    const all = res.data || [];

    // solo comentarios raíz
    const rootComments = all.filter((c) => !c.parentComment);
    setComments(rootComments);

    // 🔥 actualizar el store global
    CommentCountStore.setCount(postId, rootComments.length);

    // manejo del highlight como ya tenías…
    if (highlightCommentId) {
      try {
        const resPath = await axios.get(`/comments/path/${highlightCommentId}`);
        const pathIds = Array.isArray(resPath.data) ? resPath.data : [];
        setExpandPath(pathIds);
      } catch (err) {
        if (err.response?.status === 404) {
          console.warn("[CommentsList] highlight 404");
          setExpandPath([]);
        }
      }
    } else {
      setExpandPath([]);
    }
  } catch (err) {
    console.error("Error al cargar comentarios:", err);
  }
};

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, highlightCommentId]);

  // Eventos globales de update/delete
  useEffect(() => {
    const handleUpdate = (e) => {
      const { postId: eventPostId } = e.detail || {};
      if (eventPostId !== postId) return;
      loadComments();
    };

    const handleDelete = (e) => {
      const { postId: eventPostId } = e.detail || {};
      if (eventPostId !== postId) return;
      loadComments();
    };

    window.addEventListener("vinci:comment-update", handleUpdate);
    window.addEventListener("vinci:comment-delete", handleDelete);

    return () => {
      window.removeEventListener("vinci:comment-update", handleUpdate);
      window.removeEventListener("vinci:comment-delete", handleDelete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const getSortedComments = () => {
    const withMeta = comments.map((c) => {
      const createdAt = c.createdAt ? new Date(c.createdAt).getTime() : 0;
      return { ...c, createdAt };
    });

    return withMeta
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt); // nuevos primero
  };

  const sortedComments = getSortedComments();
  const effectiveForceExpandAll = forceExpandAll || filterMode === "all";

  return (
    <div className="mt-2">
      {/* Controles: "Más recientes" y "Todos" */}
      <div className="d-flex align-items-center mb-2">
        <span className="me-2 text-muted small">Ordenar por:</span>
        <div className="btn-group btn-group-sm" role="group">
          <button
            type="button"
            className={`btn btn-light ${
              filterMode === "recent" ? "active fw-semibold" : ""
            }`}
            onClick={() => setFilterMode("recent")}
          >
            Más recientes
          </button>
          <button
            type="button"
            className={`btn btn-light ${
              filterMode === "all" ? "active fw-semibold" : ""
            }`}
            onClick={() => setFilterMode("all")}
          >
            Todos
          </button>
        </div>
      </div>

      {sortedComments.map((comment) => (
        <CommentItem
          key={comment._id}
          comment={comment}
          postId={postId}
          onCommentChanged={loadComments}
          highlightCommentId={highlightCommentId}
          expandPath={expandPath}
          forceExpandAll={effectiveForceExpandAll}
        />
      ))}
    </div>
  );
}

export default CommentsList;
