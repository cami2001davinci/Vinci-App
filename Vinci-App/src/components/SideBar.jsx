import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";
import {
  Bell,
  Home,
  LogOut,
  User,
  MessageSquare,
  BookOpen,
} from "lucide-react";

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [carreras, setCarreras] = useState([]);
  const [showCarreras, setShowCarreras] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchCarreras();
    }
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get("/users/me/notifications");
      setNotifications(res.data || []);
      const unread = res.data.filter((notif) => !notif.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error("Error al obtener notificaciones:", err);
    }
  };

  // Actualiza notificaciones cada 15 segundos
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Detecta clic fuera del dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchCarreras = async () => {
    try {
      const res = await axios.get("/degrees");
      setCarreras(res.data);
    } catch (err) {
      console.error("Error al cargar carreras:", err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleOpenDropdown = async () => {
    setShowDropdown(!showDropdown);
    try {
      await axios.put("/users/me/notifications/mark-as-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error al marcar notificaciones como leídas:", err);
    }
  };

  return (
    <aside className="w-64 h-screen bg-gray-100 flex flex-col justify-between fixed">
      <div className="text-start">
        <img
          src="/img/logo-2.svg"
          alt="Logo"
          className="img-fluid"
          style={{ width: "120px" }}
        />
      </div>
      <div className="space-y-4">
        <Link to="/" className=" link flex items-center gap-2 text-lg">
          <Home /> Home
        </Link>

        <div>
          <button
            onClick={() => setShowCarreras(!showCarreras)}
            className=" relative flex items-center gap-2 text-lg  border-0 bg-transparent"
          >
            <BookOpen /> Carreras
          </button>
          {showCarreras && (
            <div className="dropdown-active">
              <ul className="ms-4 mt-2">
                {carreras.map((carrera) => (
                  <li key={carrera._id}>
                    <Link
                      to={`/degrees/${carrera.slug}`}
                      className="text-primary text-decoration-none"
                    >
                      {carrera.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Link
          to={`/profile/${user?.id}`}
          className=" link flex items-center gap-2 text-lg"
        >
          <User /> Perfil
        </Link>

        {/* Notificaciones con dropdown */}
        <div className="" ref={dropdownRef}>
          <button
            onClick={handleOpenDropdown}
            className=" relative flex items-center gap-2 text-lg border-0 bg-transparent"
          >
            <Bell />
            Notificaciones
            {unreadCount > 0 && (
              <span className="badge bg-danger ms-1">{unreadCount}</span>
            )}
          </button>

          {showDropdown && (
            <div className="notifications-dropdown mt-2">
              {notifications.length === 0 ? (
                <p className="text-muted">Sin notificaciones</p>
              ) : (
                notifications.slice(0, 5).map((n, idx) => (
                  <div
                    key={idx}
                    className={`p-2 border-bottom ${
                      n.read ? "text-muted" : "fw-bold"
                    }`}
                  >
                    <strong>{n.fromUser?.username || "Alguien"}</strong> —{" "}
                    {n.message}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <Link to="/chats" className=" link flex items-center gap-2 text-lg">
          <MessageSquare /> Chats
        </Link>
      </div>

      {user ? (
        <button
          onClick={handleLogout}
          className=" relative flex items-center gap-2 text-red-600 text-lg border-0 bg-transparent"
        >
          <LogOut /> Cerrar sesión
        </button>
      ) : (
        <Link
          to="/login"
          className=" link flex items-center gap-2 text-green-600 text-lg"
        >
          <LogOut /> Iniciar sesión
        </Link>
      )}
    </aside>
  );
};

export default Sidebar;
