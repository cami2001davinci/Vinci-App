import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";
import CommentForm from "./CommentForm";
import { useAuth } from "../context/AuthContext";
import UserAvatar from "./UserAvatar";
import { socket } from "../services/socket";
import { useConfirm } from "../context/ConfirmContext";
import "../styles/Comments.css";

function timeAgoShort(date) {
  if (!date) return "";
  const diff = Math.floor((new Date() - new Date(date)) / 1000);
  if (diff < 60) return "ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} d`;
}

function CommentItem({ comment, postId, depth = 0 }) {
  const { user } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [commentData, setCommentData] = useState(comment);

  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [hasLoadedReplies, setHasLoadedReplies] = useState(false);

  const [likes, setLikes] = useState(comment.likedBy?.length || 0);
  const [hasLiked, setHasLiked] = useState(
    comment.likedBy?.includes(user?._id),
  );
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isDeleted, setIsDeleted] = useState(false);

  const isAuthor = user?._id === commentData.author?._id;
  const authorName = commentData.author?.username || "Usuario";
  const commentId = commentData._id;
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target))
        setShowMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- SOCKETS PARA ESTE COMENTARIO ---
  useEffect(() => {
    const handleNewReply = (payload) => {
      const newComment = payload.newComment || payload;

      const myId = user?._id?.toString();
      let authorId = null;
      if (newComment?.author?._id) authorId = newComment.author._id.toString();
      else if (newComment?.author) authorId = newComment.author.toString();

      if (myId && authorId === myId) return; // Ignoramos si soy yo

      if (newComment.parentComment?.toString() === commentId?.toString()) {
        setReplies((prev) => {
          if (prev.some((r) => r._id === newComment._id)) return prev;
          return [newComment, ...prev];
        });
        setCommentData((prev) => ({
          ...prev,
          replies: [...(prev.replies || []), newComment._id],
        }));
        if (!showReplies) setShowReplies(true);
      }
    };

    const handleUpdate = (payload) => {
      if (payload.commentId === commentId) {
        setCommentData((prev) => ({ ...prev, content: payload.content }));
      }
    };

    const handleDelete = (payload) => {
      if (payload.commentId === commentId) {
        if (payload.hardDeleted) {
          setIsDeleted(true); // Desaparece por completo
        } else {
          // Lápida: Se queda, pero cambia su estado visual
          setCommentData((prev) => ({
            ...prev,
            isDeleted: true,
            content: "[Comentario eliminado]",
          }));
        }
      }
      // Solo limpiamos el array de respuestas si el hijo fue borrado físicamente
      if (payload.parentComment === commentId && payload.hardDeleted) {
        setReplies((prev) => prev.filter((r) => r._id !== payload.commentId));
        setCommentData((prev) => ({
          ...prev,
          replies: (prev.replies || []).filter(
            (id) => id !== payload.commentId,
          ),
        }));
      }
    };

    const handleLike = (payload) => {
      const cId = payload.commentId || payload.comment?._id;
      if (
        cId?.toString() === commentId?.toString() &&
        payload.likesCount !== undefined
      ) {
        setLikes(payload.likesCount);
      }
    };

    socket.on("post:comment", handleNewReply);
    socket.on("comment:update", handleUpdate);
    socket.on("comment:delete", handleDelete);
    socket.on("comment:like", handleLike);

    return () => {
      socket.off("post:comment", handleNewReply);
      socket.off("comment:update", handleUpdate);
      socket.off("comment:delete", handleDelete);
      socket.off("comment:like", handleLike);
    };
  }, [commentId, showReplies, user]);

  const fetchReplies = async () => {
    try {
      const { data } = await axios.get(`/comments/${commentId}/replies`);
      setReplies(data);
      setHasLoadedReplies(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleReplies = async () => {
    if (!showReplies && !hasLoadedReplies && commentData.replies?.length > 0) {
      await fetchReplies();
    }
    setShowReplies(!showReplies);
  };

  const handleToggleLike = async () => {
    try {
      const { data } = await axios.put(`/comments/${commentId}/like`);
      setLikes(data.likesCount);
      setHasLiked(data.liked);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: "Borrar Comentario",
      message: "¿Estás seguro de eliminar este comentario?",
      confirmText: "Sí, borrar",
      variant: "danger",
    });
    if (!isConfirmed) return;

    try {
      await axios.delete(`/comments/${commentId}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReport = async () => {
    const isConfirmed = await confirm({
      title: "Reportar Comentario",
      message: "Si crees que este comentario incumple las normas, repórtalo.",
      confirmText: "Reportar",
      variant: "default",
    });
    if (!isConfirmed) return;

    try {
      setIsDeleted(true);
      await axios.put(`/comments/${commentId}/flag`);
    } catch (err) {
      console.error(err);
      setIsDeleted(false);
    }
  };

  const handleEditSubmit = async () => {
    try {
      await axios.put(`/comments/${commentId}`, { content: editContent });
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (isDeleted) return null;

  // LÁPIDA: Renderizamos una versión simplificada
  if (commentData.isDeleted) {
    return (
      <div className="neo-comment-item">
        <div style={{ width: "42px", flexShrink: 0 }}></div> 
        <div className="neo-comment-body">
          <div
            className="neo-comment-bubble text-muted fst-italic"
            style={{ backgroundColor: "#f1f1f1", border: "1px dashed #ccc", padding: "10px", borderRadius: "8px" }}
          >
            {commentData.content}
          </div>

          {showReplies && replies.length > 0 && (
            <div className="neo-replies-thread mt-2">
              {replies.map((reply) => (
                <CommentItem
                  key={reply._id}
                  comment={reply}
                  postId={postId}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="neo-comment-item">
      <div
        onClick={() =>
          commentData.author?._id &&
          navigate(`/profile/${commentData.author._id}`)
        }
        style={{ cursor: "pointer", flexShrink: 0 }}
        title="Ver perfil"
      >
        <UserAvatar user={commentData.author} className="neo-comment-avatar" />
      </div>

      <div className="neo-comment-body">
        <div className="neo-comment-header d-flex justify-content-between align-items-center w-100">
          <div>
            <span
              className="neo-comment-author"
              onClick={() =>
                commentData.author?._id &&
                navigate(`/profile/${commentData.author._id}`)
              }
              style={{ cursor: "pointer" }}
              title="Ver perfil"
            >
              {authorName}
            </span>
            <span className="neo-comment-time ms-2">
              • {timeAgoShort(commentData.createdAt)}
            </span>
          </div>

          {user && (
            <div className="neo-options-menu" ref={menuRef}>
              <button
                className="neo-options-trigger"
                onClick={() => setShowMenu(!showMenu)}
              >
                <i className="bi bi-three-dots"></i>
              </button>
              {showMenu && (
                <div className="neo-dropdown">
                  {isAuthor ? (
                    <>
                      <button
                        className="neo-dropdown-item"
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="neo-dropdown-item neo-dropdown-item--danger"
                        onClick={handleDelete}
                      >
                        Eliminar
                      </button>
                    </>
                  ) : (
                    <button
                      className="neo-dropdown-item neo-dropdown-item--danger"
                      onClick={handleReport}
                    >
                      Reportar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="neo-edit-container">
            <textarea
              className="neo-edit-input"
              rows={2}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <div className="neo-edit-actions">
              <button
                className="neo-btn-xs bg-white"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </button>
              <button
                className="neo-btn-xs bg-dark text-white"
                onClick={handleEditSubmit}
              >
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <div className="neo-comment-bubble">{commentData.content}</div>
        )}

        {!isEditing && (
          <div className="neo-comment-actions">
            <button
              className={`neo-action-btn ${hasLiked ? "neo-action-btn--active" : ""}`}
              onClick={handleToggleLike}
            >
              <i
                className={
                  hasLiked
                    ? "bi bi-hand-thumbs-up-fill"
                    : "bi bi-hand-thumbs-up"
                }
              ></i>
              {likes > 0 && <span>{likes}</span>}
            </button>
            <button
              className="neo-action-btn"
              onClick={() => setShowReplyForm(!showReplyForm)}
            >
              Responder
            </button>
            {(commentData.replies?.length > 0 || replies.length > 0) && (
              <button className="neo-action-btn" onClick={handleToggleReplies}>
                {showReplies
                  ? "Ocultar"
                  : `Ver respuestas (${commentData.replies?.length || replies.length})`}
              </button>
            )}
          </div>
        )}

        {showReplyForm && (
          <div className="mt-3">
            <CommentForm
              postId={postId}
              parentComment={commentId}
              onNewComment={(newReply) => {
                setReplies((prev) => [newReply, ...prev]);
                setCommentData((prev) => ({
                  ...prev,
                  replies: [...(prev.replies || []), newReply._id],
                }));

                // Despachamos evento para sumar +1 exacto (sin recalcular)
                window.dispatchEvent(
                  new CustomEvent("vinci:local-increment", {
                    detail: { postId },
                  }),
                );

                setShowReplyForm(false);
                setShowReplies(true);
              }}
            />
          </div>
        )}

        {showReplies && replies.length > 0 && (
          <div className="neo-replies-thread">
            {replies.map((reply) => (
              <CommentItem
                key={reply._id}
                comment={reply}
                postId={postId}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CommentsList({ postId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!postId) return;
    const fetchComments = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`/comments/post/${postId}`);
        const rootComments = Array.isArray(data)
          ? data.filter((c) => !c.parentComment)
          : [];
        setComments(rootComments);
        
        // ❌ ELIMINADA la función que inflaba el conteo sumando IDs huérfanos/lápidas.
        // Ahora confiamos a ciegas en lo que mandó el backend en el PostCard.
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [postId]);

  useEffect(() => {
    if (!postId) return;

    const handleSocketNewComment = (payload) => {
      const newComment = payload.newComment || payload;
      if (
        newComment.post?.toString() !== postId?.toString() &&
        newComment.post?._id?.toString() !== postId?.toString()
      )
        return;

      const myId = user?._id?.toString();
      let authorId = null;
      if (newComment?.author?._id) authorId = newComment.author._id.toString();
      else if (newComment?.author) authorId = newComment.author.toString();

      if (myId && authorId === myId) return; 

      if (!newComment.parentComment) {
        setComments((prev) => [newComment, ...prev]);
      }
    };

    const handleSocketDelete = (payload) => {
      if (payload.postId?.toString() !== postId?.toString()) return;
      
      if (!payload.parentComment && payload.hardDeleted) {
        setComments((prev) => prev.filter((c) => c._id !== payload.commentId));
      }
    };

    socket.on("post:comment", handleSocketNewComment);
    socket.on("comment:delete", handleSocketDelete);

    return () => {
      socket.off("post:comment", handleSocketNewComment);
      socket.off("comment:delete", handleSocketDelete);
    };
  }, [postId, user]);

  if (loading)
    return (
      <div className="p-3 text-center text-muted fw-bold">
        Cargando opiniones...
      </div>
    );

  return (
    <div className="neo-comments-section">
      {comments.length === 0 ? (
        <p className="text-muted small fst-italic">
          Sé el primero en comentar.
        </p>
      ) : (
        comments.map((comment) => (
          <CommentItem key={comment._id} comment={comment} postId={postId} />
        ))
      )}
    </div>
  );
}