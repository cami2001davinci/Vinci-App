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
      fetchReplies(); // refresca en caso de que se edite un comentario con respuestas
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
    <div className="mb-2" style={{ marginLeft: depth * 20 }}>
      <div className="flex items-center justify-between text-sm text-gray-700">
        {isEditing ? (
          <input
            value={editedContent}
            onChange={e => setEditedContent(e.target.value)}
            className="border rounded p-1 w-full mr-2"
          />
        ) : (
          <div>
            <strong>{comment.author.username}:</strong> {comment.content}
          </div>
        )}
        <button onClick={toggleLike} className="text-red-500 text-xs ml-2">
          ❤️ {likes}
        </button>
      </div>

      <div className="flex gap-2 text-xs text-blue-600 mt-1">
        {isEditing ? (
          <>
            <button onClick={handleUpdate}>Guardar</button>
            <button onClick={() => setIsEditing(false)}>Cancelar</button>
          </>
        ) : (
          <>
            <button onClick={() => setShowReplyForm(prev => !prev)}>Responder</button>
            <button onClick={() => setIsEditing(true)}>Editar</button>
            <button onClick={handleDelete} className="text-red-600">Eliminar</button>
            <button onClick={handleToggleReplies}>
              {showReplies ? 'Ocultar respuestas' : 'Ver respuestas'}
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
        replies.map(reply => (
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
      setComments(rootComments);
    } catch (err) {
      console.error('Error al cargar comentarios:', err);
    }
  };

  useEffect(() => {
    loadComments();
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
