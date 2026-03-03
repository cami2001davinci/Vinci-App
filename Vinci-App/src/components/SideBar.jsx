import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axiosInstance";
import UserAvatar from "./UserAvatar";
import "../styles/SideBar.css";

export default function SideBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [carreras, setCarreras] = useState([]);

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

  const isActive = (path) => location.pathname === path;

  // Lógica de nombres
  const displayName = user
    ? user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || "Usuario"
    : "";
  const displayUsername = user?.username ? `@${user.username}` : "";

  return (
    <div className="neo-sidebar-container">
      {/* 1. HEADER: LOGO */}
      <Link to="/" className="text-decoration-none">
        <div className="neo-sidebar-logo-card">
          <img
            src="/img/logo-2.svg"
            alt="Vinci App Logo"
            className="neo-sidebar-logo-img"
          />
        </div>
      </Link>

      {/* 2. NAVEGACIÓN */}
      <nav className="neo-sidebar-nav">
        <div>
          <div className="neo-sidebar-title">Principal</div>

          <Link
            to="/"
            className={`neo-sidebar-link ${isActive("/") ? "neo-sidebar-link--active" : ""}`}
          >
            <i
              className={`bi ${isActive("/") ? "bi-house-fill" : "bi-house"}`}
            ></i>
            Inicio
          </Link>

          <Link
            to="/chats"
            className={`neo-sidebar-link ${isActive("/chats") ? "neo-sidebar-link--active" : ""}`}
          >
            <i
              className={`bi ${isActive("/chats") ? "bi-chat-square-text-fill" : "bi-chat-square-text"}`}
            ></i>
            Mensajes
          </Link>

          <Link
            to="/requests"
            className={`neo-sidebar-link ${isActive("/requests") ? "neo-sidebar-link--active" : ""}`}
          >
            <i
              className={`bi ${isActive("/requests") ? "bi-inbox-fill" : "bi-inbox"}`}
            ></i>
            Solicitudes
          </Link>
        </div>

        <div className="mt-4">
          <div className="neo-sidebar-title">Carreras</div>

          <div className="d-flex flex-column gap-1">
            {carreras.map((c) => (
              <Link
                key={c._id}
                to={`/degrees/${c.slug}`}
                className={`neo-sidebar-link ${isActive(`/degrees/${c.slug}`) ? "neo-sidebar-link--active" : ""}`}
              >
                {/* El background-color dinámico es el único estilo en línea necesario */}
                <span
                  className="neo-sidebar-dot"
                  style={{ backgroundColor: c.color || "#000" }}
                ></span>
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* 3. FOOTER: PERFIL FIJO OSCURO */}
      <div className="neo-sidebar-footer">
        {user ? (
          <div className="neo-sidebar-user-wrapper">
            {/* Agregamos el onClick, el cursor pointer y un title */}
            <div
              className="neo-sidebar-user-info"
              onClick={() => navigate(`/profile/${user._id}`)}
              style={{ cursor: "pointer" }}
              title="Ir a mi perfil"
            >
              <UserAvatar user={user} className="neo-sidebar-avatar" />

              <div className="neo-sidebar-user-text">
                <div
                  className="neo-sidebar-user-name text-truncate"
                  title={displayName}
                >
                  {displayName}
                </div>
                <div
                  className="neo-sidebar-user-handle text-truncate"
                  title={displayUsername}
                >
                  {displayUsername}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-link text-white p-0 ps-2 flex-shrink-0"
              title="Cerrar sesión"
            >
              <i className="bi bi-box-arrow-right fs-4"></i>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="btn btn-light w-100 text-center fw-bold border-dark border-2"
          >
            Iniciar Sesión
          </Link>
        )}
      </div>
    </div>
  );
}
