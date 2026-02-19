import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axiosInstance";
import { CommentCountStore } from "../store/commentCountStore.js"; 
import CommentForm from "./CommentForm";
import CommentsList from "./CommentsList";
import PostContent from "./PostContent";
import CollabActions from "./CollabActions";
import UserAvatar from "./UserAvatar"; 
import { useConfirm } from "../context/ConfirmContext"; // ✅ Estilos recuperados

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
  const [postData, setPostData] = useState(post);
  const [likes, setLikes] = useState(post?.likedBy?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentsVersion, setCommentsVersion] = useState(0);
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isReported, setIsReported] = useState(false);

  const [formValues, setFormValues] = useState({
    content: post?.content || "",
    category: post?.category || "comunidad",
  });

  const [commentsCount, setCommentsCount] = useState(0);
  const postId = postData?._id || post?._id;

  useEffect(() => { setPostData(post); }, [post]);

  // 1. SUSCRIPCIÓN AL STORE (Solo lectura del valor numérico)
  useEffect(() => {
    if (!postId) return;
    const storeCount = CommentCountStore.getCount(postId);
    const initialCount = storeCount > 0 
      ? storeCount 
      : (Array.isArray(postData?.comments) ? postData.comments.length : (postData?.commentsCount || 0));
    
    setCommentsCount(initialCount);
    // Inicializamos el store si está vacío
    if (storeCount === 0 && initialCount > 0) {
       CommentCountStore.setCount(postId, initialCount);
    }
    return CommentCountStore.subscribe(postId, (newVal) => setCommentsCount(newVal));
  }, [postId, postData]);

  // 2. ESCUCHA DE EVENTOS GLOBALES (Lógica de conteo)
  // Usamos los eventos de window que despacha socket.js
  useEffect(() => {
    if (!postId) return;

    // A. Nuevo Comentario
    const handleRemoteCreate = (e) => {
        const { postId: pId, newComment } = e.detail || {};
        
        // Verificar que sea de este post
        if (pId !== postId && newComment?.post !== postId) return;
        
        // 👇 LÓGICA ROBUSTA PARA EVITAR DOBLE CONTEO
        const myId = user?._id ? user._id.toString() : null;
        let authorId = null;

        if (newComment?.author) {
            // El author puede venir como objeto {_id: '...'} o como string '...'
            authorId = newComment.author._id 
                ? newComment.author._id.toString() 
                : newComment.author.toString();
        }

        // Si el autor soy yo, IGNORO este evento (ya sumé manualmente en onNewComment)
        if (myId && authorId === myId) return;

        // Si es otro usuario, incremento
        CommentCountStore.increment(postId);
    };

    // B. Eliminación de Comentario
    const handleRemoteDelete = (e) => {
        const { postId: pId } = e.detail || {};
        if (pId === postId) {
            CommentCountStore.decrement(postId);
        }
    };

    window.addEventListener("vinci:post-comment", handleRemoteCreate);
    window.addEventListener("vinci:comment-delete", handleRemoteDelete);

    return () => {
        window.removeEventListener("vinci:post-comment", handleRemoteCreate);
        window.removeEventListener("vinci:comment-delete", handleRemoteDelete);
    };
  }, [postId, user]);

  const author = postData?.author || {};
  const displayName = (author.firstName && author.lastName) 
    ? `${author.firstName} ${author.lastName}` 
    : author.username || "Usuario";
  const displayUsername = author.username ? `@${author.username}` : "";
  const isAuthor = user?._id === author._id;

  const postDegree = postData.degree || {};
  const forumColor = postDegree.color || '#000000'; 
  const headerBarStyle = { backgroundColor: forumColor };
  const authorDegrees = Array.isArray(author.degrees) ? author.degrees : [];

  const toggleLike = async () => {
    if (!postId) return;
    try {
      const res = await axios.put(`/posts/${postId}/like`);
      setLikes(res.data.likesCount);
    } catch (error) { console.error(error); }
  };

  const handleDelete = async () => {
    // ✅ Estilos: Usamos el confirm personalizado
    const isConfirmed = await confirm({
      title: "Eliminar Posteo",
      message: "¿Estás seguro de que quieres eliminar esta publicación permanentemente?",
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
     // ✅ Estilos: Usamos el confirm personalizado
     const isConfirmed = await confirm({
        title: "Reportar Contenido",
        message: "Si crees que esto incumple las normas, repórtalo. Desaparecerá de tu vista.",
        confirmText: "Reportar",
        variant: "default"
     });
     
     if (!isConfirmed) return;

     setIsReported(true);
     setShowActions(false);

     try {
       // Llamada a la API (ruta estándar)
       await axios.put(`/posts/${postId}/flag`);
     } catch (err) {
       console.error("Error al reportar:", err);
       // Opcional: Revertir si falla
     }
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
            <p className="text-muted small m-0">Gracias por informarnos. No volverás a ver esta publicación mientras la revisamos.</p>
            <button className="btn btn-link text-dark fw-bold btn-sm mt-2" onClick={() => onPostChanged?.("delete", postId)}>Cerrar</button>
        </div>
      </article>
    );
  }

  return (
    <article className="neo-post-card" style={{overflow: 'visible'}}>
      <div className="neo-post-card__color-bar" style={headerBarStyle}></div>
      <div className="neo-post-card__header">
        <div className="neo-post-card__author-info">
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
          {/* Cuando comentas, esto suma 1.*/}
          <CommentForm 
            postId={postId} 
            onNewComment={() => {
                setCommentsVersion(v => v + 1);
                CommentCountStore.increment(postId); 
            }} 
          />
          <CommentsList postId={postId} key={commentsVersion} />
        </div>
      )}
    </article>
  );
}