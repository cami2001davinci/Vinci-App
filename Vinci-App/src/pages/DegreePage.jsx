import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext"; // Para identificar si el post es mío
import { socket } from "../services/socket"; // Importamos el socket

import MainLayout from "../components/MainLayout";
import PostCard from "../components/PostCard";
import PostForm from "../components/PostForm"; 

export default function DegreePage() {
  const { slug } = useParams();
  const { user } = useAuth(); // Obtenemos el usuario actual
  
  const [degreeData, setDegreeData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Estado para botón flotante (posts de otros)
  const [pendingPosts, setPendingPosts] = useState([]);
  
  // Referencia para scroll (opcional)
  const topRef = useRef(null);

  // 1. Cargar Datos de la Carrera y Posts Iniciales
  useEffect(() => {
    if (!slug) return;
    
    const fetchDegree = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await axios.get(`/degrees/${slug}`);
        setDegreeData(data); 
        
        // Filtramos posts reportados por si el backend trajo alguno (flagged != true)
        const safePosts = (data.recentPosts || []).filter(p => !p.flagged);
        setPosts(safePosts);
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar la carrera.");
      } finally {
        setLoading(false);
      }
    };
    fetchDegree();
  }, [slug]);

  // 2. Lógica de Sockets (Tiempo Real)
  useEffect(() => {
    if (!degreeData?.degree) return; // Esperamos a tener la info de la carrera

    const currentDegreeId = degreeData.degree._id;

    // A. CREACIÓN
    const handlePostCreated = (payload) => {
      const newPost = payload.post || payload;
      if (!newPost?._id) return;

      // Verificamos que el post sea de ESTA carrera
      // (El post suele venir con degree populado o solo el ID)
      const postDegreeId = newPost.degree?._id || newPost.degree;
      if (postDegreeId?.toString() !== currentDegreeId?.toString()) return;

      // Si es MÍO, lo agrego directo (si no está ya)
      if (user && newPost.author?._id === user._id) {
        setPosts((prev) => {
          if (prev.some(p => p._id === newPost._id)) return prev;
          return [newPost, ...prev];
        });
        // Limpiamos de pendientes por seguridad
        setPendingPosts(prev => prev.filter(p => p._id !== newPost._id));
      } else {
        // Si es de OTRO, a la cola de pendientes
        setPendingPosts((prev) => {
          if (prev.some(p => p._id === newPost._id)) return prev;
          return [newPost, ...prev];
        });
      }
    };

    // B. ACTUALIZACIÓN
    const handlePostUpdated = (payload) => {
      const updatedPost = payload.post || payload;
      // Actualizamos solo si está en la lista visible
      setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
    };

    // C. ELIMINACIÓN / REPORTE
    const handlePostDeleted = (payload) => {
      const { postId } = payload;
      // Lo sacamos de todos lados
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
  }, [degreeData, user]);

  // Handler para el PostForm (cuando publicas tú manualmente)
  const handlePostCreatedForm = (newPost) => {
    // Lo agregamos directo (el socket también lo intentará agregar, pero tenemos check de duplicados)
    setPosts([newPost, ...posts]);
  };

  // Handler para eliminar localmente (desde el menú de 3 puntos)
  const handlePostChanged = (action, postId) => {
     if (action === "delete") {
        setPosts(prev => prev.filter(p => p._id !== postId));
     }
  };

  // Handler del botón flotante
  const handleShowNewPosts = () => {
    setPosts((prev) => [...pendingPosts, ...prev]);
    setPendingPosts([]);
    // Scroll suave hacia arriba (donde están los nuevos)
    if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) return <MainLayout><div className="p-5 text-center">Cargando Saga...</div></MainLayout>;
  if (error) return <MainLayout><div className="p-5 text-center text-danger fw-bold">{error}</div></MainLayout>;
  if (!degreeData) return null;

  const { degree } = degreeData;
  const degreeSlug = degree.slug || "general";

  return (
    <MainLayout>
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

      {/* HEADER DE LA CARRERA */}
      <div 
        className="mb-4 neo-card p-4 bg-white" 
        data-theme={degreeSlug}
        style={{ borderLeft: `8px solid ${degree.color || 'var(--saga-color)'}` }}
      >
        <h1 className="fw-black display-5 mb-2" style={{ fontFamily: 'Degular, sans-serif' }}>
            {degree.name}
        </h1>
        <p className="lead text-muted mb-0">
            {degree.description || "Espacio oficial de la carrera."}
        </p>
      </div>

      {/* COMPOSITOR DE POSTS */}
      <div className="mb-5">
         <PostForm onNewPost={handlePostCreatedForm} />
      </div>

      {/* FEED DE LA CARRERA */}
      <div className="d-flex flex-column gap-4">
        {posts.length > 0 ? (
            posts.map(post => (
                <PostCard 
                    key={post._id} 
                    post={post} 
                    onPostChanged={handlePostChanged}
                />
            ))
        ) : (
            <div className="text-center p-5 neo-card text-muted">
                <h4 className="fw-bold">Aún no hay publicaciones</h4>
                <p>Sé el primero en publicar algo en {degree.name}.</p>
            </div>
        )}
      </div>
    </MainLayout>
  );
}