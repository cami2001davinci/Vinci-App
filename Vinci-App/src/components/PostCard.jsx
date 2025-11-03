import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "../api/axiosInstance";
import CommentsList from "./CommentsList";
import CommentForm from "./CommentForm";
import Lightbox from "yet-another-react-lightbox";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";
import { socket } from "../services/socket"; // 👈

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

const PostCard = ({ post, onPostChanged, readOnly = false }) => {
  const [showComments, setShowComments] = useState(false);
  const [likes, setLikes] = useState(post.likedBy?.length || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content || "");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [commentsBump, setCommentsBump] = useState(0); // 👈 para forzar refetch en CommentsList
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  const isOpeningLightbox = useRef(false);

  // 🔗 unir al room del post mientras la tarjeta viva (para broadcasts por post)
  useEffect(() => {
    if (!post?._id) return;
    socket.emit("post:join", post._id);
    return () => socket.emit("post:leave", post._id);
  }, [post?._id]);

  // 🔔 actualizar likes del post cuando llegue un evento global
  useEffect(() => {
    const likeHandler = (e) => {
      const { postId, likesCount } = e.detail || {};
      if (postId === post._id) {
        setLikes(likesCount);
      }
    };
    window.addEventListener("vinci:post-like", likeHandler);
    return () => window.removeEventListener("vinci:post-like", likeHandler);
  }, [post._id]);

  // 💬 actualizar lista/contador de comentarios en vivo
  useEffect(() => {
    const commentHandler = (e) => {
      const { postId } = e.detail || {};
      if (postId === post._id) {
        // opción A: forzar CommentsList a refetchear (key)
        setCommentsBump((x) => x + 1);
        // opción B: si querés, podrías inyectar el comment e incrementar contador local
      }
    };
    window.addEventListener("vinci:post-comment", commentHandler);
    return () =>
      window.removeEventListener("vinci:post-comment", commentHandler);
  }, [post._id]);

  const authorDegrees = Array.isArray(post.author?.degrees)
    ? post.author.degrees
    : [];

  const first = post.author?.firstName || "";
  const last = post.author?.lastName || "";
  const username = post.author?.username || "usuario";

  const isFavicon = (url) =>
    typeof url === "string" && url.includes("google.com/s2/favicons");
  const heroImageCandidate = post.links?.find((l) => l?.preview?.image)?.preview
    ?.image;
  const heroImage =
    heroImageCandidate && !isFavicon(heroImageCandidate)
      ? heroImageCandidate
      : null;

  const toggleLike = async () => {
    try {
      // PUT o POST según tu router; vos tenías PUT, lo mantengo
      const res = await axios.put(`/posts/${post._id}/like`);
      setLikes(res.data.likesCount); // reflejo inmediato para quien clickeó
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
      {heroImage && (
        <img
          src={heroImage}
          alt=""
          className="mb-2 rounded"
          style={{ width: "100%", maxHeight: 360, objectFit: "cover" }}
          loading="lazy"
        />
      )}

      <div className="card-body">
        <div className="d-flex align-items-center mb-2 position-relative">
          <img
            src={
              post.author?.profilePicture
                ? `${baseUrl}${post.author.profilePicture}`
                : "/default-avatar.png"
            }
            alt="avatar"
            className="rounded-circle me-2"
            style={{ width: 50, height: 50, objectFit: "cover" }}
          />
          <div>
            <strong>{`${first} ${last}`.trim() || username}</strong> @{username}
            <br />
            {authorDegrees.length > 0 && (
              <small className="text-muted">
                Estudia:{" "}
                {authorDegrees.map((d, i) => (
                  <span key={d?.slug || i}>
                    <Link
                      to={`/degrees/${d?.slug}`}
                      className="text-decoration-none text-muted"
                    >
                      {d?.name}
                    </Link>
                    {i < authorDegrees.length - 1 ? " · " : ""}
                  </span>
                ))}
              </small>
            )}
            <br />
            <small className="text-muted">
              {new Date(post.createdAt).toLocaleString()}
            </small>
          </div>

          {!readOnly && (
            <div className="position-absolute top-0 end-0">
              <button
                onClick={() => setShowMenu((p) => !p)}
                className="btn btn-sm btn-light"
              >
                <i className="bi bi-three-dots" />
              </button>
              {showMenu && (
                <div
                  className="border rounded bg-white p-2 position-absolute"
                  style={{ right: 0, zIndex: 1000 }}
                >
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
                      handleDelete();
                      setShowMenu(false);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {isEditing ? (
          <>
            <textarea
              className="form-control mt-2"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
            />
            <div className="d-flex gap-2 mt-2">
              <button onClick={handleUpdate} className="btn btn-success btn-sm">
                Guardar
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            {post.title && <h5 className="mt-2 mb-1">{post.title}</h5>}
            <p className="mt-2">{post.content}</p>
          </>
        )}

        {Array.isArray(post.images) && post.images.length > 0 && (
          <div className="mt-3 d-flex flex-wrap gap-2">
            {post.images.map((imgUrl, index) => (
              <img
                key={index}
                src={`${baseUrl}${imgUrl}`}
                alt={`imagen-${index}`}
                className="rounded cursor-pointer border"
                style={{ width: 120, height: 120, objectFit: "cover" }}
                onClick={() => openLightbox(index)}
              />
            ))}
          </div>
        )}

        {Array.isArray(post.documents) && post.documents.length > 0 && (
          <div className="mt-3">
            <strong>Documentos:</strong>
            <div className="d-flex flex-wrap gap-2 mt-2">
              {post.documents.map((docUrl, idx) => {
                const fileName = docUrl.split("/").pop();
                const ext = fileName.split(".").pop().toLowerCase();
                if (ext === "pdf") {
                  return (
                    <div
                      key={idx}
                      className="border rounded p-2 text-center"
                      style={{ width: 150, height: 210, overflow: "hidden" }}
                    >
                      <Document
                        file={`${baseUrl}${docUrl}`}
                        onLoadError={(err) =>
                          console.error("Error al cargar PDF:", err)
                        }
                      >
                        <Page pageNumber={1} width={130} />
                      </Document>
                      <a
                        href={`${baseUrl}${docUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="small d-block mt-1 text-primary"
                      >
                        {fileName}
                      </a>
                    </div>
                  );
                }
                return (
                  <a
                    key={idx}
                    href={`${baseUrl}${docUrl}`}
                    download={fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border rounded px-2 py-1 d-flex align-items-center"
                    title={fileName}
                  >
                    <span className="text-truncate" style={{ maxWidth: 150 }}>
                      {fileName}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {Array.isArray(post.links) && post.links.length > 0 && (
          <div className="mt-2 d-flex flex-wrap gap-2">
            {post.links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-primary"
              >
                <i className="bi bi-link-45deg" /> {l.provider || "Link"}
              </a>
            ))}
          </div>
        )}

        {lightboxOpen && Array.isArray(post.images) && post.images.length > 0 && (
          <Lightbox
            open={lightboxOpen}
            close={() => setLightboxOpen(false)}
            index={photoIndex}
            slides={post.images.map((imgUrl) => ({
              src: `${baseUrl}${imgUrl}`,
            }))}
            on={{ view: ({ index }) => setPhotoIndex(index) }}
          />
        )}

        {!readOnly && !isEditing && (
          <div className="d-flex gap-2 mt-3">
            <button onClick={toggleLike} className="btn btn-light btn-sm">
              <i className="bi bi-hand-thumbs-up" /> Me gusta ({likes})
            </button>
            <button
              onClick={() => setShowComments((prev) => !prev)}
              className="btn btn-light btn-sm"
            >
              <i className="bi bi-chat" /> {showComments ? "Ocultar" : "Comentar"}
            </button>
          </div>
        )}

        {showComments && !readOnly && (
          <div className="mt-2">
            <CommentForm
              postId={post._id}
              onNewComment={() => setCommentsBump((x) => x + 1)}
            />
            <CommentsList postId={post._id} key={commentsBump} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PostCard;
