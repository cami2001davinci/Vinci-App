import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axiosInstance";
import CommentForm from "./CommentForm";
import CommentsList from "./CommentsList";
import PostContent from "./PostContent";
import CollabActions from "./CollabActions";
import UserAvatar from "./UserAvatar"; 
import { useConfirm } from "../context/ConfirmContext";
import { useNavigate } from "react-router-dom"; 

import "../styles/PostCard.css";

function timeAgo(date) {
  if (!date) return "";
  const now = new Date();
  const past = new Date(date);
  const diff = Math.floor((now - past) / 1000); 

  if (diff < 60) return "Ahora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days} d`;
  return past.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

export default function PostCardView({ post, onPostChanged }) {
  const { user } = useAuth();
  const confirm = useConfirm(); 
  const navigate = useNavigate();
  
  const [postData, setPostData] = useState(post);

  
  
  
  const [likes, setLikes] = useState(post?.likedBy?.length || post?.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(
    post?.commentsCount !== undefined ? post.commentsCount : (Array.isArray(post?.comments) ? post.comments.length : 0)
  );

  const [showComments, setShowComments] = useState(false);
  const [commentsVersion, setCommentsVersion] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isReported, setIsReported] = useState(false);

  const [formValues, setFormValues] = useState({
    title: post?.title || "",
    content: post?.content || "",
    category: post?.category || "comunidad",
  });

  const postId = postData?._id || post?._id;

  
  const author = postData?.author || {};
  const displayName = (author.firstName && author.lastName) ? `${author.firstName} ${author.lastName}` : author.username || "Usuario";
  const displayUsername = author.username ? `@${author.username}` : "";
  const isAuthor = user?._id === author._id;

  const postDegree = postData.degree || {};
  const forumColor = postDegree.color || '#000000'; 
  const headerBarStyle = { backgroundColor: forumColor };
  const authorDegrees = Array.isArray(author.degrees) ? author.degrees : [];

  // 1. SINCRONIZACIÓN DESDE EL PADRE (Feed)
  useEffect(() => { 
    setPostData(post); 
    if (post?.likedBy !== undefined) setLikes(post.likedBy.length);
    else if (post?.likesCount !== undefined) setLikes(post.likesCount);

    if (post?.commentsCount !== undefined) {
      setCommentsCount(post.commentsCount);
    } else if (Array.isArray(post?.comments)) {
      setCommentsCount(post.comments.length);
    }
  }, [post]);

  // 2. ESCUCHA DE EVENTOS Y SOCKETS
  useEffect(() => {
    if (!postId) return;

    // A. Comentario Nuevo de OTRO usuario
    const handleRemoteCreate = (e) => {
        const { postId: pId, newComment } = e.detail || {};
        if (pId?.toString() !== postId?.toString() && newComment?.post?.toString() !== postId?.toString()) return;

        const myId = user?._id?.toString();
        let authorId = null;
        if (newComment?.author?._id) authorId = newComment.author._id.toString();
        else if (newComment?.author) authorId = newComment.author.toString();

        if (myId && authorId === myId) return; 
        setCommentsCount(prev => prev + 1);
    };

    // B. Comentario Nuevo MÍO
    const handleLocalIncrement = (e) => {
        if (e.detail?.postId?.toString() === postId?.toString()) {
            setCommentsCount(prev => prev + 1);
        }
    };

    // C. Eliminación (Soporta Soft y Hard Delete)
    const handleRemoteDelete = (e) => {
        const payload = e.detail || {};
        const { postId: pId, commentsCount: newCount } = payload;

        if (pId?.toString() === postId?.toString()) {
            if (newCount !== undefined) {
                setCommentsCount(newCount); // Usamos la cuenta exacta del servidor
            } else {
                setCommentsCount(prev => Math.max(0, prev - 1));
            }
        }
    };

    // D. Likes
    const handleRemoteLike = (e) => {
        const payload = e.detail || {};
        const pId = payload.postId || payload.post?._id || payload.post;
        
        if (pId?.toString() === postId?.toString() && payload.likesCount !== undefined) {
            setLikes(payload.likesCount);
        }
    };

    // E. CORRECCIÓN DEL CONTADOR AL ABRIR COMENTARIOS
    const handleSyncCount = (e) => {
        const { postId: pId, count } = e.detail || {};
        if (pId?.toString() === postId?.toString() && count !== undefined) {
            setCommentsCount(count); 
        }
    };

    window.addEventListener("vinci:post-comment", handleRemoteCreate);
    window.addEventListener("vinci:local-increment", handleLocalIncrement);
    window.addEventListener("vinci:comment-delete", handleRemoteDelete);
    window.addEventListener("vinci:post-like", handleRemoteLike);
    window.addEventListener("vinci:sync-comments-count", handleSyncCount);

    return () => {
        window.removeEventListener("vinci:post-comment", handleRemoteCreate);
        window.removeEventListener("vinci:local-increment", handleLocalIncrement);
        window.removeEventListener("vinci:comment-delete", handleRemoteDelete);
        window.removeEventListener("vinci:post-like", handleRemoteLike);
        window.removeEventListener("vinci:sync-comments-count", handleSyncCount);
    };
  }, [postId, user]);

  const toggleLike = async () => {
    if (!postId) return;
    try {
      const res = await axios.put(`/posts/${postId}/like`);
      setLikes(res.data.likesCount);
    } catch (error) { console.error(error); }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: "Eliminar Posteo",
      message: "¿Seguro que quieres eliminar esta publicación permanentemente?",
      confirmText: "Sí, eliminar",
      variant: "danger"
    });
    if (!isConfirmed) return;

    try {
        await axios.delete(`/posts/${postId}`);
        onPostChanged?.("delete", postId);
    } catch (err) { console.error(err); }
  };
  
  const handleReport = async () => {
     const isConfirmed = await confirm({
        title: "Reportar Contenido",
        message: "Si crees que esto incumple las normas, repórtalo.",
        confirmText: "Reportar",
        variant: "default"
     });
     if (!isConfirmed) return;

     setIsReported(true);
     setShowActions(false);
     try {
       await axios.put(`/posts/${postId}/flag`);
     } catch (err) { console.error(err); }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formValues, title: "Publicación" };
      const { data } = await axios.put(`/posts/${postId}`, payload);
      setPostData(data);
      setIsEditing(false);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  if (isReported) {
    return (
      <article className="neo-post-card p-4 text-center bg-light" style={{ minHeight: '150px', justifyContent: 'center' }}>
        <div className="d-flex flex-column align-items-center gap-2">
            <i className="bi bi-shield-check fs-1 text-muted"></i>
            <h5 className="fw-bold mb-1">Publicación reportada</h5>
            <p className="text-muted small m-0">Gracias por informarnos.</p>
            <button className="btn btn-link text-dark fw-bold btn-sm mt-2" onClick={() => onPostChanged?.("delete", postId)}>Cerrar</button>
        </div>
      </article>
    );
  }

  return (
    <article className="neo-post-card" style={{overflow: 'visible'}}>
      <div className="neo-post-card__color-bar" style={headerBarStyle}></div>
      <div className="neo-post-card__header">
        
        {/* IZQUIERDA: Avatar + Info */}
        <div 
          className="neo-post-card__author-info"
          onClick={() => author?._id && navigate(`/profile/${author._id}`)}
          style={{ cursor: 'pointer' }}
          title="Ver perfil del autor"
        >
          <UserAvatar user={author} className="neo-post-card__avatar" />
          <div className="neo-post-card__names">
            <div className="neo-post-card__identity-row">
                <span className="neo-post-card__fullname">{displayName}</span>
                <span className="neo-post-card__username">{displayUsername}</span>
            </div>
            <div className="neo-post-card__badges-row">
               {authorDegrees.length > 0 ? (
                 authorDegrees.map((deg, index) => (
                   <span key={index} className="neo-degree-badge" style={{ backgroundColor: deg.color || '#000' }}>{deg.name}</span>
                 ))
               ) : (
                 <span className="neo-degree-badge" style={{ backgroundColor: '#000' }}>ESTUDIANTE</span>
               )}
               <span className="neo-category-hashtag" style={{ color: forumColor }}>#{postData.category}</span>
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
            <div className="neo-date-pill">HACE {timeAgo(postData.createdAt)}</div>
            <div className="position-relative">
                <button className="btn btn-link text-dark p-0 ms-1" onClick={() => setShowActions(!showActions)} style={{ fontSize: '1.2rem', lineHeight: 1 }}>
                    <i className="bi bi-three-dots-vertical"></i>
                </button>
                {showActions && (
                    <div className="dropdown-menu show shadow-sm border-2 border-dark p-1" style={{ position: 'absolute', right: 0, top: '100%', minWidth: '160px', zIndex: 1000 }}>
                        {isAuthor ? (
                            <>
                                <button className="dropdown-item fw-bold py-2" onClick={() => { setIsEditing(true); setShowActions(false); }}><i className="bi bi-pencil me-2"></i> Editar</button>
                                <div className="dropdown-divider border-dark opacity-25 my-1"></div>
                                <button className="dropdown-item text-danger fw-bold py-2" onClick={handleDelete}><i className="bi bi-trash me-2"></i> Eliminar</button>
                            </>
                        ) : (
                            <button className="dropdown-item text-danger fw-bold py-2" onClick={handleReport}><i className="bi bi-flag me-2"></i> Reportar</button>
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="neo-post-card__body">
        {isEditing ? (
          <form onSubmit={handleEditSubmit}>
            <textarea className="neo-input" rows={4} value={formValues.content} onChange={(e) => setFormValues({...formValues, content: e.target.value})} />
            <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-link text-dark fw-bold" onClick={() => setIsEditing(false)}>Cancelar</button>
                <button type="submit" className="neo-action-btn bg-dark text-white" disabled={saving}>Guardar</button>
            </div>
          </form>
        ) : (
          <>
          {/* Título renderizado limpio, usando la nueva clase CSS */}
            {postData.category === 'colaboradores' && postData.title && postData.title !== 'Publicación' && (
              <h3 className="neo-post-card__project-title mb-3">
                {postData.title}
              </h3>
            )}
            <PostContent post={postData} actionsSlot={null} accentColor={forumColor} />
            {postData.category === 'colaboradores' && (
              <div className="mt-3"><CollabActions post={postData} onPostUpdate={setPostData} /></div>
            )}
          </>
        )}
      </div>

      <div className="neo-post-card__footer">
        <button className={`neo-action-btn ${likes > 0 ? 'neo-action-btn--liked' : ''}`} onClick={toggleLike}>
          <i className={likes > 0 ? "bi bi-hand-thumbs-up-fill" : "bi bi-hand-thumbs-up"}></i>
          {likes > 0 ? likes : 'Me gusta'}
        </button>
        <button className="neo-action-btn" onClick={() => setShowComments(!showComments)}>
          <i className="bi bi-chat-left-text"></i>
          {commentsCount} Comentarios
        </button>
      </div>

      {showComments && postId && (
        <div className="bg-light p-3 border-top border-2 border-dark">
          <CommentForm 
            postId={postId} 
            onNewComment={() => {
                setCommentsVersion(v => v + 1);
                window.dispatchEvent(new CustomEvent("vinci:local-increment", { detail: { postId } })); 
            }} 
          />
          <CommentsList postId={postId} key={commentsVersion} />
        </div>
      )}
    </article>
  );
}