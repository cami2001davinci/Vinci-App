import { useEffect, useState, useRef } from "react";
import axios from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext"; 
import { socket } from "../services/socket"; 
import PostCard from "../components/PostCard";
// ❌ Borramos la importación de MainLayout

export default function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pendingPosts, setPendingPosts] = useState([]);
  const topRef = useRef(null);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/posts");
      
      let safePosts = [];
      if (Array.isArray(res.data)) {
        safePosts = res.data;
      } else if (res.data && Array.isArray(res.data.items)) {
        safePosts = res.data.items;
      }

      setPosts(safePosts);
      setError(null);
    } catch (err) {
      console.error("Error al cargar posts:", err);
      setError("No se pudieron cargar las publicaciones.");
      setPosts([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // --- LÓGICA DE SOCKETS (Tiempo Real) ---
  useEffect(() => {
    const handlePostCreated = (payload) => {
      const newPost = payload.post || payload;
      if (!newPost?._id) return;

      if (user && newPost.author?._id === user._id) {
        setPosts((prev) => [newPost, ...prev]);
        setPendingPosts((prev) => prev.filter(p => p._id !== newPost._id));
      } else {
        setPendingPosts((prev) => {
          if (prev.find(p => p._id === newPost._id)) return prev;
          return [newPost, ...prev];
        });
      }
    };

    const handlePostUpdated = (payload) => {
      const updatedPost = payload.post || payload;
      const pId = updatedPost._id;
      
      setPosts((prev) => prev.map((p) => (p._id === pId ? updatedPost : p)));
    };

    const handlePostDeleted = (payload) => {
      const { postId } = payload;
      if (!postId) return;
      
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      setPendingPosts((prev) => prev.filter((p) => p._id !== postId));
    };

    socket.on("post:created", handlePostCreated);
    socket.on("post:updated", handlePostUpdated);
    socket.on("post:deleted", handlePostDeleted);

    return () => {
      socket.off("post:created", handlePostCreated);
      socket.off("post:updated", handlePostUpdated);
      socket.off("post:deleted", handlePostDeleted);
    };
  }, [user]);

  const handleShowNewPosts = () => {
    setPosts((prev) => [...pendingPosts, ...prev]);
    setPendingPosts([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePostChanged = (action, postId) => {
    if (action === "delete") {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } else {
      loadPosts(); 
    }
  };

  return (
    // 👇 Usamos un fragmento vacío en lugar de MainLayout
    <> 
      <div ref={topRef}></div>

      {/* BOTÓN FLOTANTE DE NUEVOS POSTS */}
      {pendingPosts.length > 0 && (
        <div 
          className="position-fixed start-50 translate-middle-x z-3" 
          style={{ top: '80px' }} 
        >
          <button 
            onClick={handleShowNewPosts}
            className="btn btn-dark rounded-pill shadow-lg fw-bold d-flex align-items-center gap-2 px-4 py-2 animate__animated animate__fadeInDown"
            style={{ border: '2px solid white' }}
          >
            <i className="bi bi-arrow-up-circle-fill text-warning"></i>
            Ver {pendingPosts.length} nuevas publicaciones
          </button>
        </div>
      )}

      {/* FEED DE PUBLICACIONES */}
      <div className="d-flex flex-column gap-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="mt-3 fw-bold text-muted">Cargando el universo Vinci...</p>
          </div>
        ) : (
          <>
            {error && (
                <div className="alert alert-danger border-2 border-dark text-center fw-bold">
                {error}
                </div>
            )}

            {Array.isArray(posts) && posts.length > 0 ? (
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onPostChanged={handlePostChanged}
                />
              ))
            ) : (
              !error && (
                <div className="neo-card p-5 text-center">
                  <h3 className="fw-black">¡Todo muy tranquilo! 🍃</h3>
                  <p className="text-muted">No hay publicaciones recientes.</p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </>
  );
}