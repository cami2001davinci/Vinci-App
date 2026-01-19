// components/SideBar.jsx
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
  const [badgeCount, setBadgeCount] = useState(0);
  const [carreras, setCarreras] = useState([]);
  const [showCarreras, setShowCarreras] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const dropdownRef = useRef(null);

  // Carga inicial cuando el usuario está logueado
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchCarreras();
    }
  }, [user]);

  // 🔄 Actualiza el contador cuando llega desde socket.js
  useEffect(() => {
    const onSetCount = (e) => {
      const detail = e.detail || {};
      const next =
        typeof detail.badgeCount === "number"
          ? detail.badgeCount
          : typeof detail.unreadCount === "number"
          ? detail.unreadCount
          : 0;
      setBadgeCount(next);
    };

    window.addEventListener("vinci:notifications-count", onSetCount);
    return () =>
      window.removeEventListener("vinci:notifications-count", onSetCount);
  }, []);

  // Polling como respaldo
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Cerrar dropdown si se hace clic afuera
  useEffect(() => {
    const handler = (ev) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(ev.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ====== API CALLS =======
  const fetchNotifications = async () => {
    try {
      const res = await axios.get("/users/me/notifications");
      const data = res.data || {};
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.notifications)
        ? data.notifications
        : [];

      setNotifications(list);

      const fallbackUnread = list.filter((n) => !n.read).length;
      const badge =
        typeof data.badgeCount === "number"
          ? data.badgeCount
          : typeof data.unreadCount === "number"
          ? data.unreadCount
          : fallbackUnread;
      const unread =
        typeof data.unreadCount === "number"
          ? data.unreadCount
          : fallbackUnread;

      setBadgeCount(badge);

      // Emitir evento global
      window.dispatchEvent(
        new CustomEvent("vinci:notifications-count", {
          detail: { badgeCount: badge, unreadCount: unread },
        })
      );
    } catch (err) {
      console.error("Error al obtener notificaciones:", err);
    }
  };

  const fetchCarreras = async () => {
    try {
      const res = await axios.get("/degrees");
      setCarreras(res.data || []);
    } catch (err) {
      console.error("Error al cargar carreras:", err);
    }
  };

  // ====== LOGOUT =======
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const acknowledgeNotifications = async () => {
    try {
      const res = await axios.put("/users/me/notifications/opened");
      const serverBadge =
        typeof res.data?.badgeCount === "number" ? res.data.badgeCount : 0;
      const serverUnread =
        typeof res.data?.unreadCount === "number"
          ? res.data.unreadCount
          : undefined;

      setBadgeCount(serverBadge);
      window.dispatchEvent(
        new CustomEvent("vinci:notifications-count", {
          detail: { badgeCount: serverBadge, unreadCount: serverUnread },
        })
      );
    } catch (err) {
      console.error("Error al registrar apertura de notificaciones:", err);
      setBadgeCount(0);
      window.dispatchEvent(
        new CustomEvent("vinci:notifications-count", {
          detail: { badgeCount: 0 },
        })
      );
    }
  };

  // NUEVO: al abrir la cajita, reseteamos el contador del badge (sin tocar read)
  const handleToggleNotificationsDropdown = () => {
    setShowDropdown((prev) => {
      const next = !prev;
      if (!prev && next) {
        acknowledgeNotifications();
      }
      return next;
    });
  };

  // ====== Navegar a notificacion =======
  const handleNotificationActivation = async (n) => {
    const type = (n?.type || "").toUpperCase();
    const conversationId = n?.data?.conversationId || n?.entity?.id;
    const postId = n?.post?._id || n?.post;

    // Marcar como leida si corresponde (solo estado local y backend, NO tocamos contador aqui)
    if (!n.read && n._id) {
      try {
        const res = await axios.put(
          `/users/me/notifications/${n._id}/read`
        );

        setNotifications((prev) =>
          prev.map((x) =>
            x._id === n._id ? { ...x, read: true } : x
          )
        );

        const counts = {
          badgeCount:
            typeof res.data?.badgeCount === "number"
              ? res.data.badgeCount
              : undefined,
          unreadCount:
            typeof res.data?.unreadCount === "number"
              ? res.data.unreadCount
              : undefined,
        };

        if (typeof counts.badgeCount === "number") {
          setBadgeCount(counts.badgeCount);
          window.dispatchEvent(
            new CustomEvent("vinci:notifications-count", {
              detail: counts,
            })
          );
        }
      } catch (err) {
        console.error("Error marcando como leida:", err);
      }
    }

    if (type === "CHAT_MESSAGE" || type === "COLLAB_ACCEPTED") {
      if (conversationId) {
        setShowDropdown(false);
        navigate(`/chats?conversationId=${conversationId}`);
      }
      return;
    }

    if (type === "COLLAB_REQUEST") {
      setShowDropdown(false);
      navigate("/chats?tab=requests");
      return;
    }

    if (!postId) return;

    // highlight -> comment | reply | post
    const highlightKind =
      n?.entity?.kind ||
      (n?.data?.commentId ? "comment" : "post");

    const anchorId =
      n?.entity?.id || n?.data?.commentId || null;

    const params = new URLSearchParams();
    if (highlightKind) params.set("highlight", highlightKind);
    if (anchorId) params.set("anchorId", anchorId);

    const search = params.toString();
    const url = search
      ? `/posts/${postId}?${search}`
      : `/posts/${postId}`;

    setShowDropdown(false);
    navigate(url, {
      state: { fromNotification: true, highlight: highlightKind },
    });
  };

  // ====== RENDER =======
  return (
    <aside className="w-64 h-screen bg-gray-100 flex flex-col justify-between fixed">
      {/* LOGO */}
      <div className="text-start p-3">
        <img
          src="/img/logo-2.svg"
          alt="Logo"
          style={{ width: "120px" }}
        />
      </div>

      {/* MENÚ */}
      <div className="space-y-4 px-3">
        <Link to="/" className="link flex items-center gap-2 text-lg">
          <Home /> Home
        </Link>

        {/* Carreras */}
        <div>
          <button
            onClick={() => setShowCarreras((v) => !v)}
            className="flex items-center gap-2 text-lg bg-transparent"
          >
            <BookOpen /> Carreras
          </button>

          {showCarreras && (
            <ul className="ms-4 mt-2">
              {carreras.map((c) => (
                <li key={c._id}>
                  <Link
                    to={`/degrees/${c.slug}`}
                    className="text-primary"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          to={user ? `/profile/${user.id}` : "/login"}
          className="link flex items-center gap-2 text-lg"
        >
          <User /> Perfil
        </Link>

        {/* 🔔 Notificaciones */}
        <div ref={dropdownRef}>
          <button
            onClick={handleToggleNotificationsDropdown}
            className="relative flex items-center gap-2 text-lg bg-transparent"
          >
            <Bell />
            Notificaciones
            {badgeCount > 0 && (
              <span className="badge bg-danger ms-1">
                {badgeCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="notifications-dropdown mt-2 p-2 rounded border bg-white shadow-sm">
              {notifications.length === 0 ? (
                <p className="text-muted m-0">Sin notificaciones</p>
              ) : (
                <>
                  {notifications.slice(0, 5).map((n) => (
                    <div
                      key={n._id}
                      className={[
                        "p-2 border-bottom rounded",
                        n.read ? "text-muted bg-white" : "bg-light",
                      ].join(" ")}
                      // 👉 cursor de mano para que se sienta cliqueable
                      style={{ cursor: "pointer" }}
                      onClick={() => handleNotificationActivation(n)}
                    >
                      <div className="d-flex align-items-start gap-2">
                        {/* 👉 PUNTO AZUL para no leídas */}
                        {!n.read && (
                          <span
                            className="rounded-circle bg-primary mt-1"
                            style={{ width: 8, height: 8 }}
                            aria-label="Notificación no leída"
                          />
                        )}

                        {n.fromUserAvatar && (
                          <img
                            src={
                              n.fromUserAvatar.startsWith("http")
                                ? n.fromUserAvatar
                                : `${
                                    import.meta.env.VITE_SERVER_URL ||
                                    "http://localhost:3000"
                                  }${n.fromUserAvatar}`
                            }
                            alt="avatar"
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        )}

                        <div>
                          <div>
                            <span className="fw-semibold">
                              @{n.fromUserName}
                            </span>{" "}
                            <span>{n.message}</span>
                          </div>
                          <small className="text-muted">
                            {new Date(
                              n.createdAt || Date.now()
                            ).toLocaleString()}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-2 d-flex justify-content-between">
                    <button
                      className="btn btn-link btn-sm"
                      onClick={fetchNotifications}
                    >
                      Refrescar
                    </button>

                    <button
                      className="btn btn-link btn-sm"
                      onClick={() => {
                        setShowDropdown(false);
                        navigate("/notifications");
                      }}
                    >
                      Ver todas
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <Link to="/chats" className="link flex items-center gap-2 text-lg">
          <MessageSquare /> Chats
        </Link>
      </div>

      {/* FOOTER */}
      <div className="p-3">
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 text-lg bg-transparent"
          >
            <LogOut /> Cerrar sesión
          </button>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 text-green-600 text-lg"
          >
            <LogOut /> Iniciar sesión
          </Link>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
