import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext"; 
import { socket } from "../services/socket"; 

import PostCard from "../components/PostCard";
import PostForm from "../components/PostForm"; 

export default function DegreePage() {
  const { slug } = useParams();
  const { user } = useAuth(); 
  
  const [degreeData, setDegreeData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [pendingPosts, setPendingPosts] = useState([]);
  const topRef = useRef(null);

  useEffect(() => {
    if (!slug) return;
    
    const fetchDegree = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await axios.get(`/degrees/${slug}/overview`);
        //  Imprimimos en consola para que veas qué manda el backend
        // console.log("Datos de la carrera recibidos:", data); 
        
        setDegreeData(data); 
        const safePosts = (data.recentPosts || data.posts || []).filter(p => !p.flagged);
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

  useEffect(() => {
    if (!degreeData) return; 

    const currentDegreeId = degreeData.degree?._id || degreeData._id;

    const handlePostCreated = (payload) => {
      const newPost = payload.post || payload;
      if (!newPost?._id) return;

      const postDegreeId = newPost.degree?._id || newPost.degree;
      if (postDegreeId?.toString() !== currentDegreeId?.toString()) return;

      if (user && newPost.author?._id === user._id) {
        setPosts((prev) => {
          if (prev.some(p => p._id === newPost._id)) return prev;
          return [newPost, ...prev];
        });
        setPendingPosts(prev => prev.filter(p => p._id !== newPost._id));
      } else {
        setPendingPosts((prev) => {
          if (prev.some(p => p._id === newPost._id)) return prev;
          return [newPost, ...prev];
        });
      }
    };

    const handlePostUpdated = (payload) => {
      const updatedPost = payload.post || payload;
      setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
    };

    const handlePostDeleted = (payload) => {
      const { postId } = payload;
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

  const handlePostCreatedForm = (newPost) => {
    setPosts([newPost, ...posts]);
  };

  const handlePostChanged = (action, postId) => {
     if (action === "delete") {
        setPosts(prev => prev.filter(p => p._id !== postId));
     }
  };

  const handleShowNewPosts = () => {
    setPosts((prev) => [...pendingPosts, ...prev]);
    setPendingPosts([]);
    if (topRef.current) {
        topRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) return <div className="p-5 text-center fw-bold">CARGANDO...</div>;
  if (error) return <div className="p-5 text-center text-danger fw-bold">{error}</div>;
  if (!degreeData) return null;

  // 👇 EXTRACCIÓN A PRUEBA DE BALAS
  // Si no viene 'degree' o 'degreeData' es null, creamos un objeto vacío de respaldo
  const degree = degreeData.degree || degreeData || {};
  
  // Variables 100% seguras que nunca serán undefined
  const degreeName = degree.name || "CARRERA DESCONOCIDA";
  const degreeColor = degree.color || degree.hex || "#000000"; // Agregamos 'hex' por si así se llama en tu BD
  const degreeDesc = degree.description || "";

  return (
    <>
      <div ref={topRef}></div>

      {pendingPosts.length > 0 && (
        <div 
          className="position-fixed start-50 translate-middle-x z-3" 
          style={{ top: '80px' }} 
        >
          <button 
            onClick={handleShowNewPosts}
            className="btn btn-dark rounded-pill shadow-lg fw-bold d-flex align-items-center gap-2 px-4 py-2"
            style={{ border: '2px solid white' }}
          >
            <i className="bi bi-arrow-up-circle-fill text-warning"></i>
            Ver {pendingPosts.length} nuevas publicaciones
          </button>
        </div>
      )}

      {/* HEADER NEOBRUTALISTA SEGURO */}
      <div className="mb-4 mt-2 d-flex flex-column justify-content-center">
        <div className="d-flex align-items-center">
          <div
            style={{
              width: '12px',
              height: '42px',
              backgroundColor: degreeColor,
              border: '3px solid #000000',
              marginRight: '1rem'
            }}
          ></div>
          <h1
            className="m-0 text-truncate"
            style={{
              fontFamily: 'Degular, sans-serif, Arial',
              fontWeight: 900,
              fontSize: '3.5rem',
              textTransform: 'uppercase',
              fontStyle: 'italic',
              color: '#000000',
              lineHeight: '1',
              letterSpacing: '-1px'
            }}
          >
            {degreeName}
          </h1>
        </div>
        
        {degreeDesc && (
          <p className="text-muted fw-bold mt-2 mb-0" style={{ marginLeft: '2.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {degreeDesc}
          </p>
        )}
      </div>

      <div className="mb-5">
         <PostForm onNewPost={handlePostCreatedForm} />
      </div>

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
            <div className="text-center p-5 neo-card text-muted" style={{ border: '2px dashed #000' }}>
                <h4 className="fw-bold text-uppercase">Aún no hay publicaciones</h4>
                <p className="fw-bold">Sé el primero en publicar algo en {degreeName}.</p>
            </div>
        )}
      </div>
    </>
  );
}