// src/components/SideBar.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axiosInstance";

export default function SideBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [carreras, setCarreras] = useState([]);

  // Cargar carreras para el menú
  useEffect(() => {
    const fetchCarreras = async () => {
      try {
        const { data } = await axios.get("/degrees");
        setCarreras(data);
      } catch (err) {
        console.error("Error al cargar carreras", err);
      }
    };
    fetchCarreras();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Helper para saber si el link está activo
  const isActive = (path) => location.pathname === path;

  // Estilo base para los items del menú
  const linkStyle = (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "12px",
    textDecoration: "none",
    color: active ? "white" : "black",
    backgroundColor: active ? "black" : "transparent",
    border: active ? "2px solid black" : "2px solid transparent",
    fontWeight: "700",
    fontSize: "1.1rem",
    marginBottom: "8px",
    transition: "all 0.1s ease",
  });

  return (
    <div className="d-flex flex-column h-100 p-4">
      {/* 1. LOGO */}
      <div className="mb-5 px-2">
        <Link to="/" className="text-decoration-none">
          <h1 
            style={{ 
              fontFamily: 'Degular, sans-serif', 
              fontSize: '2rem', 
              fontWeight: '900', 
              fontStyle: 'italic',
              color: 'black',
              margin: 0,
              lineHeight: 1
            }}
          >
            VINCI<span style={{ color: 'var(--saga-color)' }}>.</span>
          </h1>
        </Link>
      </div>

      {/* 2. MENU PRINCIPAL */}
      <nav className="flex-grow-1">
        <div className="mb-4">
          <small className="text-muted fw-bold text-uppercase px-3 mb-2 d-block" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
            Menu
          </small>
          
          <Link to="/" style={linkStyle(isActive("/"))} className="sidebar-link">
            <i className={`bi ${isActive("/") ? "bi-house-fill" : "bi-house"}`}></i>
            Inicio
          </Link>

          <Link to="/chats" style={linkStyle(isActive("/chats"))} className="sidebar-link">
            <i className={`bi ${isActive("/chats") ? "bi-chat-square-text-fill" : "bi-chat-square-text"}`}></i>
            Mensajes
          </Link>

          <Link to="/requests" style={linkStyle(isActive("/requests"))} className="sidebar-link">
            <i className={`bi ${isActive("/requests") ? "bi-inbox-fill" : "bi-inbox"}`}></i>
            Solicitudes
          </Link>
          
          <Link to="/notifications" style={linkStyle(isActive("/notifications"))} className="sidebar-link">
             <i className={`bi ${isActive("/notifications") ? "bi-bell-fill" : "bi-bell"}`}></i>
             Notificaciones
          </Link>
        </div>

        {/* 3. SAGAS (Carreras) */}
        <div className="mb-4">
          <small className="text-muted fw-bold text-uppercase px-3 mb-2 d-block" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
            Sagas
          </small>
          
          <div className="d-flex flex-column gap-1">
            {carreras.map((c) => (
              <Link
                key={c._id}
                to={`/degree/${c.slug}`}
                className="d-flex align-items-center gap-2 px-3 py-2 text-decoration-none text-dark fw-bold nav-saga-item"
                style={{ borderRadius: '8px', fontSize: '0.95rem' }}
              >
                {/* Puntito de color según la carrera (Hardcoded por ahora o dinámico si tienes mapeo de colores) */}
                <span 
                  style={{ 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    border: '1px solid black',
                    backgroundColor: 'var(--text-main)' // Idealmente aquí va el color de la carrera
                  }} 
                ></span>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* 4. PERFIL / LOGOUT */}
      <div className="mt-auto border-top border-2 border-dark pt-3">
        {user ? (
          <div className="d-flex align-items-center justify-content-between">
             <div className="d-flex align-items-center gap-2">
                <img 
                  src={user.profilePicture ? `${import.meta.env.VITE_SERVER_URL}${user.profilePicture}` : "/default-avatar.png"} 
                  alt="Profile" 
                  className="rounded-circle border border-dark"
                  style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                />
                <div style={{ lineHeight: 1.1 }}>
                    <div className="fw-bold small">@{user.username}</div>
                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>En línea</div>
                </div>
             </div>
             <button onClick={handleLogout} className="btn btn-link text-danger p-0">
                <i className="bi bi-box-arrow-right fs-5"></i>
             </button>
          </div>
        ) : (
          <Link to="/login" className="neo-btn w-100 text-center text-decoration-none d-block">
            Iniciar Sesión
          </Link>
        )}
      </div>
    </div>
  );
}