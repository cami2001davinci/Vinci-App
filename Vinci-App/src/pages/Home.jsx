import { useEffect, useState, useRef } from "react";
import axios from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext"; // Para saber quién soy
import { socket } from "../services/socket"; // Importamos el socket
import MainLayout from "../components/MainLayout";
import PostCard from "../components/PostCard";

export default function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Almacén temporal para posts nuevos que llegan por socket (de otros usuarios)
  const [pendingPosts, setPendingPosts] = useState([]);

  // Referencia para scroll (opcional, si quieres volver arriba al cargar nuevos)
  const topRef = useRef(null);

  const loadPosts = async () => {
    setLoading(true);
    try {
      // Recuerda: el backend ya debe filtrar { flagged: { $ne: true } }
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
    // 1. Escuchar NUEVOS posts
    const handlePostCreated = (payload) => {
      const newPost = payload.post || payload;
      if (!newPost?._id) return;

      // Si el post es MÍO, lo agrego inmediatamente
      if (user && newPost.author?._id === user._id) {
        setPosts((prev) => [newPost, ...prev]);
        // Limpiamos de pending si existiera por error
        setPendingPosts((prev) => prev.filter(p => p._id !== newPost._id));
      } else {
        // Si es de OTRO, lo guardo en "pendientes" y muestro el botón
        setPendingPosts((prev) => {
          if (prev.find(p => p._id === newPost._id)) return prev;
          return [newPost, ...prev];
        });
      }
    };

    // 2. Escuchar ACTUALIZACIONES (Edición, Likes masivos, etc.)
    const handlePostUpdated = (payload) => {
      const updatedPost = payload.post || payload;
      const pId = updatedPost._id;
      
      setPosts((prev) => prev.map((p) => (p._id === pId ? updatedPost : p)));
    };

    // 3. Escuchar ELIMINACIONES (Borrado o Reporte)
    const handlePostDeleted = (payload) => {
      const { postId } = payload;
      if (!postId) return;
      
      // Lo sacamos de la lista visible
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      // Y también de pendientes por si estaba ahí
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

  // Función para mezclar los posts pendientes con los actuales
  const handleShowNewPosts = () => {
    setPosts((prev) => [...pendingPosts, ...prev]);
    setPendingPosts([]);
    // Scroll suave hacia arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Manejador local para cuando PostCard avisa de cambios (delete manual)
  const handlePostChanged = (action, postId) => {
    if (action === "delete") {
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } else {
      loadPosts(); 
    }
  };

  return (
    <MainLayout>
      <div ref={topRef}></div>

      {/* BOTÓN FLOTANTE DE NUEVOS POSTS */}
      {pendingPosts.length > 0 && (
        <div 
          className="position-fixed start-50 translate-middle-x z-3" 
          style={{ top: '80px' }} // Ajusta según la altura de tu Navbar
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
      <div className="d-flex flex-column gap-4 mt-4">
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
    </MainLayout>
  );
}