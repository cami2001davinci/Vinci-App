// src/components/PostCard.jsx
import { useState, useEffect } from "react";
import axios from "../api/axiosInstance";
import CommentForm from "./CommentForm";
import CommentsList from "./CommentsList";
import PostContent from "./PostContent";
import { CommentCountStore } from "../store/commentCountStore.js";
import { useAuth } from "../context/AuthContext";
import CollabActions from "./CollabActions";

export default function PostCardView({ post, onPostChanged }) {
  const { user } = useAuth();
  const [postData, setPostData] = useState(post);
  const [likes, setLikes] = useState(post?.likedBy?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentsVersion, setCommentsVersion] = useState(0);
  const [commentsCount, setCommentsCount] = useState(() => {
    const fromStore = CommentCountStore.getCount(post?._id);
    if (fromStore) return fromStore;
    if (Array.isArray(post?.comments)) return post.comments.length;
    if (typeof post?.commentsCount === "number") return post.commentsCount;
    return 0;
  });
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({
    title: post?.title || "",
    content: post?.content || "",
    category: post?.category || "comunidad",
  });
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const postId = postData?._id || post?._id;

  useEffect(() => {
    setPostData(post);
  }, [post]);

  useEffect(() => {
    setLikes(postData?.likedBy?.length || 0);
    setFormValues({
      title: postData?.title || "",
      content: postData?.content || "",
      category: postData?.category || "comunidad",
    });
  }, [postData]);

  useEffect(() => {
    if (!postId) return;
    const fallback = Array.isArray(postData?.comments)
      ? postData.comments.length
      : typeof postData?.commentsCount === "number"
      ? postData.commentsCount
      : 0;
    setCommentsCount(fallback);
  }, [postId, postData?.comments, postData?.commentsCount]);

  useEffect(() => {
    if (!postId) return;
    CommentCountStore.subscribe(postId, setCommentsCount);
    return () => {
      CommentCountStore.unsubscribe(postId, setCommentsCount);
    };
  }, [postId]);

  const currentUserId = user?._id || user?.id;
  const rawAuthor = postData?.author;
  const authorId =
    typeof rawAuthor === "object" && rawAuthor !== null
      ? rawAuthor._id || rawAuthor.id
      : rawAuthor;
  const isAuthor =
    !!currentUserId &&
    !!authorId &&
    currentUserId.toString() === authorId.toString();

  const collabClosed = postData?.collabStatus === "team_chosen";
  const selectedNames = (postData?.selectedCollaborators || [])
    .map((u) => u?.username)
    .filter(Boolean);

  const toggleLike = async () => {
    if (!postId) return;
    try {
      const res = await axios.put(`/posts/${postId}/like`);
      setLikes(res.data.likesCount);
    } catch (error) {
      console.error("Error al dar like:", error);
    }
  };

  useEffect(() => {
    if (!postId) return;
    const handlePostLike = (e) => {
      const { postId: updatedId, likesCount } = e.detail || {};
      if (updatedId === postId) {
        setLikes(likesCount);
      }
    };

    window.addEventListener("vinci:post-like", handlePostLike);
    return () => {
      window.removeEventListener("vinci:post-like", handlePostLike);
    };
  }, [postId]);

  const handleFieldChange = (evt) => {
    const { name, value } = evt.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setActionError("");
    setFormValues({
      title: postData?.title || "",
      content: postData?.content || "",
      category: postData?.category || "comunidad",
    });
  };

  const handleEditSubmit = async (evt) => {
    evt.preventDefault();
    if (!postId) return;

    const payload = {
      title: formValues.title.trim(),
      content: formValues.content.trim(),
      category: formValues.category,
    };

    if (!payload.title) {
      setActionError("El titulo es obligatorio.");
      return;
    }
    if (!payload.content || payload.content.length < 10) {
      setActionError("La descripcion debe tener al menos 10 caracteres.");
      return;
    }

    setSaving(true);
    setActionError("");
    try {
      const { data } = await axios.put(`/posts/${postId}`, payload);
      setPostData(data);
      setIsEditing(false);
      window.dispatchEvent(
        new CustomEvent("vinci:post-updated", { detail: { post: data } })
      );
      onPostChanged?.("update", data._id);
    } catch (err) {
      const apiMsg = err.response?.data?.message;
      setActionError(apiMsg || "No se pudo actualizar el post.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!postId) return;
    if (!window.confirm("Eliminar este post?")) return;

    setRemoving(true);
    setActionError("");
    try {
      await axios.delete(`/posts/${postId}`);
      window.dispatchEvent(
        new CustomEvent("vinci:post-deleted", {
          detail: {
            postId,
            degreeSlug: postData?.degree?.slug,
          },
        })
      );
      setHidden(true);
      onPostChanged?.("delete", postId);
    } catch (err) {
      const apiMsg = err.response?.data?.message;
      setActionError(apiMsg || "No se pudo eliminar el post.");
    } finally {
      setRemoving(false);
    }
  };

  if (hidden) return null;

  const renderActions = () => (
    <div className="position-relative">
      <button
        type="button"
        className="btn btn-light btn-sm d-inline-flex align-items-center"
        onClick={() => setShowActions((prev) => !prev)}
      >
        <i className="bi bi-three-dots-vertical" />
      </button>

      {showActions && (
        <div
          className="dropdown-menu show p-2 shadow-sm"
          style={{
            right: 0,
            top: "100%",
            zIndex: 1100,
            position: "absolute",
            minWidth: 170,
          }}
        >
          {!isEditing && (
            <button
              type="button"
              className="dropdown-item d-flex align-items-center gap-2"
              onClick={() => {
                setIsEditing(true);
                setActionError("");
                setShowActions(false);
              }}
            >
              <i className="bi bi-pencil" /> Editar
            </button>
          )}
          <button
            type="button"
            className="dropdown-item text-danger d-flex align-items-center gap-2"
            onClick={() => {
              setShowActions(false);
              handleDelete();
            }}
            disabled={removing}
          >
            <i className="bi bi-trash" />
            {removing ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="card mb-3 shadow-sm">
      <div className="card-body position-relative">
        {isAuthor && isEditing && (
          <div
            className="position-absolute"
            style={{ top: 8, right: 8 }}
          >
            {renderActions()}
          </div>
        )}

        {actionError && <p className="text-danger small mb-2">{actionError}</p>}

        {isEditing ? (
          <form onSubmit={handleEditSubmit} className="mb-3">
            <input
              className="form-control mb-2"
              name="title"
              value={formValues.title}
              placeholder="Titulo"
              onChange={handleFieldChange}
              disabled={saving}
            />
            <textarea
              className="form-control mb-2"
              name="content"
              rows={4}
              value={formValues.content}
              placeholder="Describe tu publicacion"
              onChange={handleFieldChange}
              disabled={saving}
            />
            <select
              className="form-select w-auto mb-3"
              name="category"
              value={formValues.category}
              onChange={handleFieldChange}
              disabled={saving}
            >
              <option value="comunidad">Comunidad</option>
              <option value="colaboradores">Colaboradores</option>
              <option value="ayuda">Ayuda</option>
              <option value="feedback">Feedback</option>
              <option value="ideas">Ideas</option>
            </select>
            <div className="d-flex gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-success btn-sm"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </form>
        ) : (
          <PostContent
            post={postData}
            actionsSlot={isAuthor ? renderActions() : null}
          />
        )}

        {collabClosed && selectedNames.length > 0 && (
          <div className="small text-success mt-2">
            <strong>Trabajando con:</strong> {selectedNames.join(" ? ")}
          </div>
        )}

        <CollabActions post={postData} onPostUpdate={setPostData} />

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

        {showComments && postId && (
          <div className="mt-3">
            <CommentForm
              postId={postId}
              onNewComment={() => {
                setCommentsVersion((x) => x + 1);
              }}
            />

            <CommentsList postId={postId} key={`${postId}-${commentsVersion}`} />
          </div>
        )}
      </div>
    </div>
  );
}
