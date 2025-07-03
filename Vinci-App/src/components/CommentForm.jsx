import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from '../api/axiosInstance';

const CommentForm = ({ postId, parentComment = null, onNewComment }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!postId) {
      console.error('Falta postId en CommentForm');
      setError('Error interno: falta ID del post');
      return;
    }

    if (!content.trim() || content.trim().length < 3) {
      setError('El comentario debe tener al menos 3 caracteres.');
      return;
    }

    try {
      await axios.post('/comments', {
        content: content.trim(),
        postId,
        ...(parentComment && { parentComment })
      });
      setContent('');
      setError('');
      onNewComment?.();
    } catch (err) {
      console.error('Error al enviar comentario:', err);
      setError(err.response?.data?.message || 'No se pudo enviar el comentario.');
    }
  };

  const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <div className="flex items-center gap-2 mb-2">
        <img
          src={user?.profilePicture ? `${baseUrl}${user.profilePicture}` : '/default-avatar.png'}
          alt="avatar"
          className="rounded-circle"
          style={{ width: '30px', height: '30px', objectFit: 'cover' }}
        />
        <span className="text-sm text-muted">Comentando como @{user?.username}</span>
      </div>

      {error && <div className="text-red-500 text-sm mb-1">{error}</div>}
      <input
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Escribe una respuesta"
        className="w-full border p-1 rounded mb-1"
      />
      <button type="submit" className="text-sm text-white btn btn-primary bg-blue-500 px-3 py-1 rounded">
        Comentar
      </button>
    </form>
  );
};

export default CommentForm;
