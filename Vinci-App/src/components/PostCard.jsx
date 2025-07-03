import { useState, useRef } from "react";
import axios from "../api/axiosInstance";
import CommentsList from "./CommentsList";
import CommentForm from "./CommentForm";
import Lightbox from "yet-another-react-lightbox";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const PostCard = ({ post, onPostChanged, readOnly = false }) => {
  const [showComments, setShowComments] = useState(false);
  const [likes, setLikes] = useState(post.likedBy.length);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  const isOpeningLightbox = useRef(false);

  const toggleLike = async () => {
    try {
      const res = await axios.put(`/posts/${post._id}/like`);
      setLikes(res.data.likesCount);
    } catch (error) {
      console.error("Error al dar like al post:", error);
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`/posts/${post._id}`, { content: editedContent });
      post.content = editedContent;
      setIsEditing(false);
      onPostChanged?.();
    } catch (err) {
      console.error("Error al editar post:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar este posteo?")) return;
    try {
      await axios.delete(`/posts/${post._id}`);
      onPostChanged?.();
    } catch (err) {
      console.error("Error al eliminar posteo:", err);
    }
  };

  const openLightbox = (index) => {
    if (lightboxOpen || isOpeningLightbox.current) return;
    isOpeningLightbox.current = true;
    setPhotoIndex(index);
    setLightboxOpen(true);
    setTimeout(() => {
      isOpeningLightbox.current = false;
    }, 300);
  };

  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body">
        <div className="d-flex align-items-center mb-2 position-relative">
          <img src={post.author?.profilePicture ? `${baseUrl}${post.author.profilePicture}` : '/default-avatar.png'} alt="avatar" className="rounded-circle me-2" style={{ width: '50px', height: '50px', objectFit: 'cover' }} />
          <div>
            <strong>{post.author?.firstName} {post.author?.lastName}</strong> @{post.author?.username} <br />
            <small className="text-muted">{new Date(post.createdAt).toLocaleString()}</small>
          </div>

          {!readOnly && (
            <div className="position-absolute top-0 end-0">
              <button onClick={() => setShowMenu(prev => !prev)} className="btn btn-sm btn-light">
                <i className="bi bi-three-dots"></i>
              </button>
              {showMenu && (
                <div className="border rounded bg-white p-2 position-absolute" style={{ right: 0, zIndex: 1000 }}>
                  <button className="dropdown-item" onClick={() => { setIsEditing(true); setShowMenu(false); }}>Editar</button>
                  <button className="dropdown-item text-danger" onClick={() => { handleDelete(); setShowMenu(false); }}>Eliminar</button>
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <>
            <textarea className="form-control mt-2" value={editedContent} onChange={(e) => setEditedContent(e.target.value)} />
            <div className="d-flex gap-2 mt-2">
              <button onClick={handleUpdate} className="btn btn-success btn-sm">Guardar</button>
              <button onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm">Cancelar</button>
            </div>
          </>
        ) : (
          <p className="mt-2">{post.content}</p>
        )}

        {post.images && post.images.length > 0 && (
          <div className="mt-3 d-flex flex-wrap gap-2">
            {post.images.map((imgUrl, index) => (
              <img key={index} src={`${baseUrl}${imgUrl}`} alt={`imagen-${index}`} className="rounded cursor-pointer border" style={{ width: '120px', height: '120px', objectFit: 'cover' }} onClick={() => openLightbox(index)} />
            ))}
          </div>
        )}

        {post.documents && post.documents.length > 0 && (
          <div className="mt-3">
            <strong>Documentos:</strong>
            <div className="d-flex flex-wrap gap-2 mt-2">
              {post.documents.map((docUrl, idx) => {
                const fileName = docUrl.split("/").pop();
                const ext = fileName.split(".").pop().toLowerCase();
                if (ext === "pdf") {
                  return (
                    <div key={idx} className="border rounded p-2 text-center" style={{ width: '150px', height: '210px', overflow: 'hidden' }}>
                      <Document file={`${baseUrl}${docUrl}`} onLoadError={(err) => console.error("Error al cargar PDF:", err)}>
                        <Page pageNumber={1} width={130} />
                      </Document>
                      <a href={`${baseUrl}${docUrl}`} target="_blank" rel="noopener noreferrer" className="small d-block mt-1 text-primary">{fileName}</a>
                    </div>
                  );
                }
                return (
                  <a key={idx} href={`${baseUrl}${docUrl}`} download={fileName} target="_blank" rel="noopener noreferrer" className="border rounded px-2 py-1 d-flex align-items-center" title={fileName}>
                    <span className="text-truncate" style={{ maxWidth: '150px' }}>{fileName}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {lightboxOpen && post.images && post.images.length > 0 && (
          <Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} index={photoIndex} slides={post.images.map((imgUrl) => ({ src: `${baseUrl}${imgUrl}` }))} on={{ view: ({ index }) => setPhotoIndex(index) }} />
        )}

        {!readOnly && !isEditing && (
          <div className="d-flex gap-2 mt-3">
            <button onClick={toggleLike} className="btn btn-light btn-sm"><i className="bi bi-hand-thumbs-up"></i> Me gusta ({likes})</button>
            <button onClick={() => setShowComments(prev => !prev)} className="btn btn-light btn-sm"><i className="bi bi-chat"></i> {showComments ? "Ocultar" : "Comentar"}</button>
          </div>
        )}

        {showComments && !readOnly && (
          <div className="mt-2">
            <CommentForm postId={post._id} onNewComment={onPostChanged} />
            <CommentsList postId={post._id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard;
