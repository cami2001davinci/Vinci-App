// src/pages/RequestsPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";

// 👇 NUEVO LAYOUT
import MainLayout from "../components/MainLayout"; 
import "../styles/RequestsPage.css"; 

export default function RequestsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("received");
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [myCollabs, setMyCollabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Helper de tiempo
  const getTimeAgo = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "HACE UN MOMENTO";
    if (diff < 3600) return `HACE ${Math.floor(diff / 60)} MIN`;
    if (diff < 86400) return `HACE ${Math.floor(diff / 3600)} H`;
    const days = Math.floor(diff / 86400);
    return `HACE ${days} ${days === 1 ? 'DÍA' : 'DÍAS'}`;
  };

  const formatDegrees = (degrees) => 
    (!Array.isArray(degrees) || degrees.length === 0) ? "Estudiante" : degrees.map(d => d.name).join(" · ");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resReceived, resSent, resMine] = await Promise.all([
          axios.get("/posts/requests/received"),
          axios.get("/posts/requests/sent"),
          axios.get("/posts/requests/my-active"),
        ]);
        setReceived(resReceived.data || []);
        setSent(resSent.data || []);
        setMyCollabs(resMine.data || []);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleAction = async (postId, userId, action) => {
    if (!postId || !userId) return;
    try {
      if (action === "accepted") {
        const { data } = await axios.post(`/posts/${postId}/collab/${userId}/accept-chat`);
        if (data.conversationId) navigate(`/chats?conversationId=${data.conversationId}`);
        else navigate("/chats");
      } else {
        await axios.put(`/posts/${postId}/collab/${userId}`, { status: "rejected" });
        setReceived((prev) => prev.map(g => {
            const newP = g.projects.filter(p => p._id !== postId);
            return { ...g, projects: newP, totalRequests: newP.length };
        }).filter(g => g.totalRequests > 0));
      }
    } catch (err) { alert("Error"); }
  };

  const handleCloseTeam = async (post) => {
    if (!window.confirm(`¿Cerrar convocatoria?`)) return;
    try {
      await axios.put(`/posts/${post._id}/close-team`);
      setMyCollabs((prev) => prev.filter(p => p._id !== post._id));
    } catch (err) { alert("Error al cerrar."); }
  };

  const toggleExpand = (id) => setExpandedId(prev => (prev === id ? null : id));

  // Componente interno reutilizable
  const RequestCommonInfo = ({ userData, projectTitle }) => {
    const avatarUrl = userData.profilePicture 
      ? `${import.meta.env.VITE_SERVER_URL}${userData.profilePicture}` 
      : null;

    return (
      <>
        <div className="request-media">
          {avatarUrl ? (
            <img src={avatarUrl} className="request-avatar" alt="Avatar" />
          ) : (
            <div className="request-avatar d-flex align-items-center justify-content-center bg-light fw-bold fs-5">
              {userData.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="request-info">
          <div className="request-header-line">
            <h5 className="request-name">{userData.firstName} {userData.lastName}</h5>
            <span className="request-username">@{userData.username}</span>
          </div>
          <div className="request-degree">{formatDegrees(userData.degrees)}</div>
          <div className="project-pill">
            <span className="project-label">PROYECTO</span>
            <span className="project-pill-title">"{projectTitle}"</span>
          </div>
        </div>
      </>
    );
  };

  const renderReceived = () => {
    if (received.length === 0) return <div className="text-center py-5 text-muted">No tienes solicitudes pendientes.</div>;
    return (
      <div className="d-flex flex-column gap-3">
        {received.map((group) =>
          group.projects.map((proj) => (
            <div key={`${group.applicant._id}-${proj._id}`} className="request-card">
              <div className="request-content">
                <RequestCommonInfo userData={group.applicant} projectTitle={proj.title} />
                <div className="request-actions-container">
                  <button className="req-btn req-btn-decline" onClick={() => handleAction(proj._id, group.applicant._id, "rejected")}>DECLINAR</button>
                  <button className="req-btn req-btn-accept" onClick={() => handleAction(proj._id, group.applicant._id, "accepted")}>ACEPTAR</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderSent = () => {
    if (sent.length === 0) return <div className="text-center py-5 text-muted">No has enviado solicitudes.</div>;
    return (
      <div className="d-flex flex-column gap-3">
        {sent.map((req) => {
          const isRej = req.status === "rejected";
          const isAcc = req.status === "accepted";
          const cardClass = isRej ? "request-card card-disabled" : "request-card";
          return (
            <div key={req._id} className={cardClass} style={{ position: 'relative' }}>
              {isRej && <div className="declined-stamp">DECLINADO</div>}
              <div className="request-content">
                <RequestCommonInfo userData={req.owner} projectTitle={req.title} />
                <div className="request-actions-container">
                  {isAcc ? <button className="req-btn btn-chat-green" onClick={() => navigate('/chats')}>IR AL CHAT 💬</button> 
                  : isRej ? <div className="status-badge-closed">SAGA CERRADA</div> 
                  : <div className="project-pill pending-state">⏳ PENDIENTE</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderManage = () => {
    if (myCollabs.length === 0) return <div className="text-center py-5 text-muted">No tienes proyectos activos.</div>;
    return (
      <div className="d-flex flex-column gap-3">
        {myCollabs.map((post) => (
          <div key={post._id} className="request-card">
             <div className="request-content">
                <div className="request-media"><div className="manage-icon"><i className="bi bi-folder-fill"></i></div></div>
                <div className="request-info">
                   <h2 className="manage-title">{post.title}</h2>
                   <div className="manage-meta-row">
                      <span>CARRERA: <span style={{color: '#000'}}>{post.degree?.name || "GENERAL"}</span></span>
                      <span>•</span>
                      <span>{getTimeAgo(post.createdAt)}</span>
                   </div>
                   <div className="manage-badge-pink">{post.interestedUsers?.length || 0} SOLICITUDES</div>
                </div>
                <div className="request-actions-container actions-vertical-desktop">
                  <button className="req-btn btn-manage-close" onClick={() => handleCloseTeam(post)}>DAR POR CERRADO 🔒</button>
                  <button className="req-btn btn-manage-view" onClick={() => toggleExpand(post._id)}>
                    {expandedId === post._id ? "OCULTAR APLICANTES ▲" : "VER APLICANTES ▼"}
                  </button>
                </div>
             </div>
             {expandedId === post._id && (
                <div className="applicants-container">
                    <h4 className="applicants-title">LISTADO DE APLICANTES</h4>
                    {post.interestedUsers && post.interestedUsers.length > 0 ? (
                        post.interestedUsers.map((applicant, index) => {
                            const userData = applicant.user || {}; 
                            const avatarUrl = userData.profilePicture ? `${import.meta.env.VITE_SERVER_URL}${userData.profilePicture}` : null;
                            let statusClass = "pending"; let statusText = "PENDIENTE";
                            if (applicant.status === 'accepted') { statusClass = "accepted"; statusText = "ACEPTADO"; }
                            if (applicant.status === 'rejected') { statusClass = "rejected"; statusText = "RECHAZADO"; }
                            return (
                                <div key={index} className="applicant-card">
                                    <div className="applicant-main-info">
                                        {avatarUrl ? <img src={avatarUrl} className="applicant-avatar-large" alt="User" /> : <div className="applicant-avatar-large d-flex align-items-center justify-content-center text-dark fw-bold fs-5">{userData.username?.[0]?.toUpperCase() || "?"}</div>}
                                        <div>
                                            <div className="applicant-name-large">{userData.firstName} {userData.lastName}</div>
                                            <div className="applicant-role-large">@{userData.username}</div>
                                        </div>
                                    </div>
                                    <div className={`status-pill ${statusClass}`}>{statusText}</div>
                                </div>
                            );
                        })
                    ) : (<p className="text-center text-muted fw-bold">Aún no hay postulantes.</p>)}
                </div>
             )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="mb-4">
        <h2 className="fw-black" style={{ fontFamily: 'Degular, sans-serif', fontSize: '2rem' }}>Centro de Solicitudes</h2>
        <p className="text-muted">Gestiona tus colaboraciones y postulaciones.</p>
      </div>
      
      <div className="card shadow-sm border-2 border-dark" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          <div className="card-header bg-white border-bottom-2 border-dark p-0">
            <ul className="nav nav-pills nav-fill">
              <li className="nav-item"><button className={`nav-link rounded-0 py-3 fw-bold ${activeTab === "received" ? "bg-dark text-white" : "text-dark"}`} onClick={() => setActiveTab("received")}>Recibidas {received.length > 0 && <span className="badge bg-danger ms-2">{received.length}</span>}</button></li>
              <li className="nav-item"><button className={`nav-link rounded-0 py-3 fw-bold ${activeTab === "sent" ? "bg-dark text-white" : "text-dark"}`} onClick={() => setActiveTab("sent")}>Enviadas</button></li>
              <li className="nav-item"><button className={`nav-link rounded-0 py-3 fw-bold ${activeTab === "manage" ? "bg-dark text-white" : "text-dark"}`} onClick={() => setActiveTab("manage")}>Gestión</button></li>
            </ul>
          </div>
          <div className="card-body bg-light p-4">
            {loading ? <div className="text-center py-5"><div className="spinner-border text-dark"></div></div> : (
              <>
                {activeTab === "received" && renderReceived()}
                {activeTab === "sent" && renderSent()}
                {activeTab === "manage" && renderManage()}
              </>
            )}
          </div>
      </div>
    </MainLayout>
  );
}