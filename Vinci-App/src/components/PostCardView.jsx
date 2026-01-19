import { useState, useEffect } from "react";
import axios from "../api/axiosInstance";
import CommentForm from "./CommentForm";
import CommentsList from "./CommentsList";
import PostContent from "./PostContent";

export default function PostCardView({ post }) {
  const [likes, setLikes] = useState(post.likedBy?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentsVersion, setCommentsVersion] = useState(0);

  // 👇 contador de comentarios, como en PostPage
  const [commentsCount, setCommentsCount] = useState(
    Array.isArray(post.comments) ? post.comments.length : 0
  );

  const toggleLike = async () => {
    try {
      const res = await axios.put(`/posts/${post._id}/like`);
      setLikes(res.data.likesCount);
    } catch (error) {
      console.error("Error al dar like:", error);
    }
  };

  // 🔌 Tiempo real: likes + comentarios (nuevo / delete)
  useEffect(() => {
    const handlePostLike = (e) => {
      const { postId, likesCount } = e.detail || {};
      if (postId === post._id) {
        setLikes(likesCount);
      }
    };

    const handleNewComment = (e) => {
      const { postId } = e.detail || {};
      if (postId !== post._id) return;
      setCommentsCount((prev) => prev + 1);
    };

    const handleDeleteComment = (e) => {
      const { postId } = e.detail || {};
      if (postId !== post._id) return;
      setCommentsCount((prev) => Math.max(prev - 1, 0));
    };

    window.addEventListener("vinci:post-like", handlePostLike);
    window.addEventListener("vinci:post-comment", handleNewComment);
    window.addEventListener("vinci:comment-delete", handleDeleteComment);

    return () => {
      window.removeEventListener("vinci:post-like", handlePostLike);
      window.removeEventListener("vinci:post-comment", handleNewComment);
      window.removeEventListener("vinci:comment-delete", handleDeleteComment);
    };
  }, [post._id]);

  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        {/* CONTENIDO PRINCIPAL DEL POST */}
        <PostContent post={post} />

        {/* ACCIONES DEL POST */}
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

        {/* COMENTARIOS */}
        {showComments && (
          <div className="mt-3">
            <CommentForm
              postId={post._id}
              onNewComment={() => {
                // recarga CommentsList localmente
                setCommentsVersion((x) => x + 1);
                // y actualiza el contador inmediatamente
                setCommentsCount((prev) => prev + 1);
              }}
            />

            <CommentsList
              postId={post._id}
              key={`${post._id}-${commentsVersion}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
