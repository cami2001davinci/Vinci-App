import { useEffect, useState } from 'react';
import axios from '../api/axiosInstance';
import CommentForm from './CommentForm';

const CommentItem = ({ comment, depth = 0, onCommentChanged }) => {
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [likes, setLikes] = useState(comment.likedBy.length);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [showMenu, setShowMenu] = useState(false);

  const toggleLike = async () => {
    try {
      const res = await axios.put(`/comments/${comment._id}/like`);
      setLikes(res.data.likesCount);
    } catch (error) {
      console.error('Error al dar like al comentario:', error);
    }
  };

  const fetchReplies = async () => {
    try {
      const res = await axios.get(`/comments/replies/${comment._id}`);
      const enriched = res.data.map(reply => ({
        ...reply,
        post: comment.post
      }));
      setReplies(enriched);
    } catch (err) {
      console.error('Error al obtener respuestas:', err);
    }
  };

  const handleToggleReplies = () => {
    if (!showReplies) {
      fetchReplies();
    }
    setShowReplies(!showReplies);
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`/comments/${comment._id}`, { content: editedContent });
      comment.content = editedContent;
      setIsEditing(false);
      fetchReplies();
      onCommentChanged?.();
    } catch (err) {
      console.error('Error al editar comentario:', err);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm('¿Eliminar este comentario?');
    if (!confirmDelete) return;

    try {
      await axios.delete(`/comments/${comment._id}`);
      onCommentChanged?.();
    } catch (err) {
      console.error('Error al eliminar comentario:', err);
    }
  };

  const handleNewReply = () => {
    fetchReplies();
    setShowReplyForm(false);
    setShowReplies(true);
    onCommentChanged?.();
  };

  return (
    <div className="comment-item border rounded p-3 bg-white mb-2" style={{ marginLeft: depth * 16 }}>
      <div className="d-flex justify-content-between align-items-start">
        <div className="d-flex align-items-start">
          <img
            src={comment.author.profilePicture
              ? `${import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'}${comment.author.profilePicture}`
              : '/default-avatar.png'}
            alt="avatar"
            className="comment-avatar rounded-circle me-2"
            style={{ width: "40px", height: "40px", objectFit: "cover" }}
          />
          <div>
            <div className="fw-bold">{comment.author.username}</div>
            {isEditing ? (
              <input
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="form-control form-control-sm mt-1"
              />
            ) : (
              <p className="text-muted mb-1">{comment.content}</p>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="position-relative">
            <button onClick={() => setShowMenu(prev => !prev)} className="btn btn-sm btn-light">
              <i className="bi bi-three-dots"></i>
            </button>
            {showMenu && (
              <div className="dropdown-menu show p-2" style={{ right: 0, zIndex: 1000, position: 'absolute' }}>
                <button className="dropdown-item" onClick={() => { setIsEditing(true); setShowMenu(false); }}>Editar</button>
                <button className="dropdown-item text-danger" onClick={() => { handleDelete(); setShowMenu(false); }}>Eliminar</button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="d-flex gap-2 mt-2 ms-5">
        {isEditing ? (
          <>
            <button onClick={handleUpdate} className="btn btn-success btn-sm">Guardar</button>
            <button onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm">Cancelar</button>
          </>
        ) : (
          <>
            <button onClick={() => setShowReplyForm(!showReplyForm)} className="btn btn-light btn-sm">
              <i className="bi bi-reply"></i> Responder
            </button>
            <button onClick={handleToggleReplies} className="btn btn-light btn-sm">
              <i className="bi bi-chat-dots"></i> {showReplies ? 'Ocultar respuestas' : 'Ver respuestas'}
            </button>
            <button onClick={toggleLike} className="btn btn-light btn-sm">
              <i className="bi bi-heart"></i> {likes}
            </button>
          </>
        )}
      </div>

      {showReplyForm && (
        <CommentForm
          postId={comment.post}
          parentComment={comment._id}
          onNewComment={handleNewReply}
        />
      )}

      {showReplies &&
        replies.map((reply) => (
          <CommentItem
            key={reply._id}
            comment={{ ...reply, post: comment.post }}
            depth={depth + 1}
            onCommentChanged={onCommentChanged}
          />
        ))}
    </div>
  );
};

const CommentsList = ({ postId }) => {
  const [comments, setComments] = useState([]);

  const loadComments = async () => {
    try {
      const res = await axios.get(`/comments/post/${postId}`);
      const rootComments = res.data.filter(c => !c.parentComment);

      const current = JSON.stringify(comments);
      const next = JSON.stringify(rootComments);

      if (current !== next) {
        setComments(rootComments);
      }
    } catch (err) {
      console.error('Error al cargar comentarios:', err);
    }
  };

  useEffect(() => {
    loadComments();
  }, [postId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadComments();
    }, 5000);
    return () => clearInterval(interval);
  }, [postId]);

  return (
    <div className="mt-2">
      {comments.map(comment => (
        <CommentItem
          key={comment._id}
          comment={comment}
          onCommentChanged={loadComments}
        />
      ))}
    </div>
  );
};

export default CommentsList;
