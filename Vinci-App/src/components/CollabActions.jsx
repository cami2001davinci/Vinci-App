import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";

const getId = (entity) =>
  typeof entity === "object" && entity !== null
    ? entity._id || entity.id
    : entity;

export default function CollabActions({ post, onPostUpdate }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const postId = post?._id || post?.id;
  const authorId = getId(post?.author);
  const currentUserId = user?._id || user?.id;

  const isCollabPost =
    post?.category && post.category.toLowerCase() === "colaboradores";
  
  const isAuthor =
    postId &&
    authorId &&
    currentUserId &&
    authorId.toString() === currentUserId.toString();

  // Buscar mi interés personal
  const myInterestObj = Array.isArray(post?.interestedUsers)
    ? post.interestedUsers.find(
        (i) => getId(i.user || i)?.toString() === currentUserId?.toString()
      )
    : null;

  const initialInterested = !!myInterestObj;
  
  const [interestStatus, setInterestStatus] = useState(
    myInterestObj?.status || (initialInterested ? "pending" : null)
  );

  const [interestedCount, setInterestedCount] = useState(
    Array.isArray(post?.interestedUsers) ? post.interestedUsers.length : 0
  );

  const [collabStatus, setCollabStatus] = useState(
    post?.collabStatus || "open"
  );
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sentRequest = interestStatus === "pending";
  const isAccepted = interestStatus === "accepted";
  const interested = sentRequest || isAccepted || interestStatus === "rejected";
  const isCollabClosed = collabStatus === "team_chosen";

  // Sincronizar estado local cuando el prop 'post' cambia
  useEffect(() => {
    setCollabStatus(post?.collabStatus || "open");
    if (Array.isArray(post?.interestedUsers)) {
        setInterestedCount(post.interestedUsers.length);
        const mine = post.interestedUsers.find(
            (i) => getId(i.user || i)?.toString() === currentUserId?.toString()
        );
        setInterestStatus(mine?.status || null);
    }
  }, [post, currentUserId]);

  // Manejo de sockets (Realtime)
  useEffect(() => {
    if (!postId || !isCollabPost) return;

    const shouldHandle = (detail = {}) => {
      const targetPostId = detail.postId || detail?.post?.id || detail?.post?._id;
      return targetPostId && targetPostId.toString() === postId.toString();
    };

    const handleRealtimeUpdate = (e) => {
      if (!shouldHandle(e.detail || {})) return;
      if (e.detail?.post) {
        onPostUpdate?.(e.detail.post);
      }
    };

    window.addEventListener("vinci:collab-request", handleRealtimeUpdate);
    window.addEventListener("vinci:post-updated", handleRealtimeUpdate);

    return () => {
      window.removeEventListener("vinci:collab-request", handleRealtimeUpdate);
      window.removeEventListener("vinci:post-updated", handleRealtimeUpdate);
    };
  }, [postId, isCollabPost, onPostUpdate]);


  // FUNCIÓN 1: Para el visitante (Proponer Team-Up)
  const toggleInterest = async () => {
    if (!postId) return;
    if (isCollabClosed) return;
    
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.put(`/posts/${postId}/interes`);
      
      const myInterest = data?.myInterest;
      setInterestStatus(myInterest?.status || null);
      setInterestedCount(data?.interestedCount || interestedCount);
      
      if (isAuthor) onPostUpdate?.(data.post); 

    } catch (err) {
      const msg = err?.response?.data?.message || "Error al conectar.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // FUNCIÓN 2: Para el dueño (Cerrar Equipo - FASE 4)
  const handleCloseTeam = async () => {
    if (!window.confirm("¿Estás seguro? Esto rechazará a los candidatos pendientes y cerrará la convocatoria.")) {
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await axios.put(`/posts/${postId}/close-team`);
      // Actualizamos el post localmente con la respuesta del server
      onPostUpdate?.(data.post); 
      setCollabStatus("team_chosen");
    } catch (err) {
      alert("Error al cerrar equipo");
    } finally {
      setLoading(false);
    }
  };

  if (!isCollabPost) return null;

  return (
    <div className="mt-3">
      {error && <div className="text-danger small mb-2">{error}</div>}

      {/* CASO 1: VISITANTE (No es el dueño) */}
      {!isAuthor ? (
        <div>
           {/* Botón Grande estilo "PROPONER TEAM-UP" */}
           <button
            className={`btn w-100 py-2 fw-bold d-flex align-items-center justify-content-center gap-2 ${
                interested 
                ? "btn-secondary text-white"  // Ya enviado
                : "btn-info text-white"       // Cyan/Celeste (estilo imagen 1)
            }`}
            style={{ 
                borderRadius: '12px', 
                border: '2px solid black', // Borde negro estilo cómic/imagen 1
                boxShadow: '2px 2px 0px black', // Sombra sólida
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
            }}
            onClick={toggleInterest}
            disabled={loading || isCollabClosed || (interested && !sentRequest)}
          >
            {isCollabClosed ? (
                <>🚫 Convocatoria Cerrada</>
            ) : isAccepted ? (
                <>✅ ¡Fuiste Aceptado!</>
            ) : interestStatus === "rejected" ? (
                <>❌ Solicitud Rechazada</>
            ) : sentRequest ? (
                <>📩 Solicitud Enviada</>
            ) : (
                <>Proponer Team-Up 🤝</>
            )}
          </button>
          
          <div className="mt-2 text-muted small text-center">
             🔥 {interestedCount} interesados en este proyecto
          </div>
        </div>
      ) : (
        /* CASO 2: DUEÑO (Author) */
        <div className="p-3 bg-light rounded-3 border" style={{ borderColor: isCollabClosed ? '#10b981' : '#e5e7eb' }}>
            <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <h6 className="mb-0 fw-bold">
                        {isCollabClosed ? "✅ Equipo Confirmado" : "Gestión de Equipo"}
                    </h6>
                    <small className="text-muted">
                        {interestedCount} solicitudes totales
                    </small>
                </div>
                
                {/* Botón para ir al Match Center */}
                <button 
                    className="btn btn-dark btn-sm rounded-pill px-3"
                    onClick={() => navigate('/requests')}
                >
                    <i className="bi bi-people-fill me-1"></i>
                    Ver Candidatos
                </button>
            </div>
            
            {/* LÓGICA FASE 4: Botón de Cerrar Equipo */}
            {!isCollabClosed && (
                <div className="mt-3 pt-3 border-top">
                    <button 
                        className="btn w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                        style={{ 
                            backgroundColor: '#fff', 
                            border: '2px solid #000', 
                            borderRadius: '10px',
                            boxShadow: '3px 3px 0 #000',
                            color: '#000',
                            fontSize: '0.9rem'
                        }}
                        onClick={handleCloseTeam}
                        disabled={loading}
                    >
                        {loading ? "Cerrando..." : "🔒 CERRAR CONVOCATORIA"}
                    </button>
                    <small className="d-block text-center text-muted mt-2" style={{ fontSize: '0.75rem' }}>
                        Al cerrar, se rechazarán las solicitudes pendientes.
                    </small>
                </div>
            )}

            {isCollabClosed && (
                <div className="mt-2 text-success small fw-bold text-center bg-white p-2 rounded border border-success">
                    ¡Convocatoria finalizada!
                </div>
            )}
        </div>
      )}
    </div>
  );
}