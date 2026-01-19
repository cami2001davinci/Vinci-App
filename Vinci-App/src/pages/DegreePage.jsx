import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "../api/axiosInstance";

import ThreeColumnLayout from "../components/ThreeColumnLayout";
import DegreeComposer from "../components/DegreeComposer";
import CategoryFilter from "../components/CategoryFilter";
import PostCard from "../components/PostCard";
import LeftColumn from "../components/LeftColumn";
import RightColumn from "../components/RightColumn";

const DegreePage = () => {
  const { slug } = useParams();
  const [degree, setDegree] = useState(null);
  const [posts, setPosts] = useState([]);
  const [catFilter, setCatFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Posts
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/posts/degree/${slug}`);
      if (Array.isArray(res.data)) {
        setPosts(res.data);
      } else if (Array.isArray(res.data.items)) {
        setPosts(res.data.items);
      } else {
        setError("Respuesta inesperada del servidor.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Error al cargar posts");
    } finally {
      setLoading(false);
    }
  };

  // Info de la carrera (para la columna izquierda)
  const fetchDegree = async () => {
    try {
      const res = await axios.get(`/degrees/${slug}`);
      setDegree(res.data);
    } catch {
      setDegree(null);
    }
  };

  useEffect(() => {
    fetchDegree();
    fetchPosts();
  }, [slug]);

  const updatePostInline = (nextPost) => {
    if (!nextPost?._id) return;
    if (nextPost.degree?.slug && nextPost.degree.slug !== slug) return;

    setPosts((prev) => {
      let changed = false;
      const mapped = prev.map((p) => {
        if (p._id === nextPost._id) {
          changed = true;
          return nextPost;
        }
        return p;
      });
      return changed ? mapped : prev;
    });
  };

  const removePostInline = (postId, degreeSlug) => {
    if (!postId) return;
    if (degreeSlug && degreeSlug !== slug) return;
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  };

  useEffect(() => {
    const handlePostUpdated = (e) => {
      const detail = e.detail || {};
      const nextPost = detail.post || detail;
      if (!nextPost?._id) return;
      updatePostInline(nextPost);
    };

    const handlePostDeleted = (e) => {
      const { postId, degreeSlug } = e.detail || {};
      removePostInline(postId, degreeSlug);
    };

    window.addEventListener("vinci:post-updated", handlePostUpdated);
    window.addEventListener("vinci:post-deleted", handlePostDeleted);
    return () => {
      window.removeEventListener("vinci:post-updated", handlePostUpdated);
      window.removeEventListener("vinci:post-deleted", handlePostDeleted);
    };
  }, [slug]);

  // 🟡 TIEMPO REAL: escuchar likes y comentarios de posts y refrescar el foro
  useEffect(() => {
    // Like en un post (evento global)
    const handlePostLike = (e) => {
      const { postId } = e.detail || {};
      if (!postId) return;

      // Solo recargamos si el post está en este foro (en la lista actual)
      setPosts((prev) => {
        const exists = prev.some((p) => p._id === postId);
        if (exists) {
          fetchPosts();
        }
        return prev; // NO modificamos el array acá
      });
      const handlePostCreated = (e) => {
        const { post } = e.detail || {};
        if (!post) return;

        // Solo si pertenece a esta carrera
        if (post.degree?.slug === slug) {
          setPosts((prev) => [post, ...prev]);
        }
      };

      window.addEventListener("vinci:post-created", handlePostCreated);

      return () => {
        window.removeEventListener("vinci:post-created", handlePostCreated);
      };
    };

    // Nuevo comentario en un post (evento global)
    const handlePostComment = (e) => {
      const { postId } = e.detail || {};
      if (!postId) return;

      setPosts((prev) => {
        const exists = prev.some((p) => p._id === postId);
        if (exists) {
          fetchPosts();
        }
        return prev;
      });
    };

    window.addEventListener("vinci:post-like", handlePostLike);
    window.addEventListener("vinci:post-comment", handlePostComment);

    return () => {
      window.removeEventListener("vinci:post-like", handlePostLike);
      window.removeEventListener("vinci:post-comment", handlePostComment);
    };
  }, [slug]); // se vuelve a enganchar si cambiás de carrera

  const handleNewPost = (post) => {
    if (!post) return fetchPosts();
    setPosts((prev) => [post, ...prev]);
  };

  const filteredPosts = catFilter
    ? posts.filter((p) => p.category === catFilter)
    : posts;

  return (
    <>
      {/* Top bar: flecha a Home + logo Vinci centrado */}
      <div className="container mb-3">
        <div
          className="d-flex align-items-center justify-content-between py-2 position-sticky top-0 bg-white"
          style={{ zIndex: 1020 }}
        >
          {/* Flecha volver */}
          <Link
            to="/"
            className="btn btn-light d-inline-flex align-items-center gap-2"
            aria-label="Volver a inicio"
          >
            <i className="bi bi-arrow-left"></i>
            <span className="d-none d-sm-inline">Inicio</span>
          </Link>

          {/* Logo al centro (link a Home) */}
          <Link to="/" className="text-decoration-none">
            <img
              src="/img/logo-2.svg" // <- tu archivo
              alt="Vinci"
              style={{ height: 36 }}
            />
          </Link>

          {/* Placeholder para balancear el centro */}
          <div style={{ width: 90 }} className="d-none d-sm-block"></div>
        </div>
      </div>

      <ThreeColumnLayout
        left={<LeftColumn degree={degree} slug={slug} />}
        center={
          <div className="d-flex flex-column gap-3 p-3">
            {/* Caja de publicación en 2 pasos */}
            <DegreeComposer onNewPost={handleNewPost} />

            {/* Filtro con contadores */}
            <CategoryFilter
              degreeSlug={slug}
              value={catFilter}
              onChange={setCatFilter}
            />

            {/* Feed */}
            {loading && <p>Cargando posts…</p>}
            {error && <p className="text-danger">{error}</p>}
            {!loading && !error && filteredPosts.length === 0 && (
              <p>No hay publicaciones todavía.</p>
            )}
            {filteredPosts.map((post) => (
              <PostCard key={post._id} post={post} onPostChanged={fetchPosts} />
            ))}
          </div>
        }
        right={<RightColumn />}
      />
    </>
  );
};

export default DegreePage;
