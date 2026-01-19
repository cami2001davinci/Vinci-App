import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";

const formatNotificationMessage = (notification) => {
  if (!notification?.message) return "";
  const name = (notification.fromUserName || "").trim();
  if (!name) return notification.message;

  if (notification.message.startsWith(name)) {
    return notification.message.slice(name.length).trimStart();
  }
  if (notification.message.startsWith(`@${name}`)) {
    return notification.message.slice(name.length + 1).trimStart();
  }
  return notification.message;
};

const getNotificationItemClass = (notification) =>
  [
    "p-3",
    "mb-2",
    "border",
    "rounded",
    "is-clickable",
    "cursor-pointer",
    notification.read ? "bg-white" : "bg-light",
  ].join(" ");

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllAndMarkAsRead = async () => {
      setLoading(true);
      try {
        // 1) Traer todas
        const res = await axios.get("/users/me/notifications");
        const data = res.data || {};
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data.notifications)
          ? data.notifications
          : [];
        setNotifications(list);

        // 2) Si habia no leidas, marcarlas como leidas en bloque
        const hadUnread = list.some((n) => !n.read);

        if (hadUnread) {
          try {
            const res2 = await axios.put(
              "/users/me/notifications/read-all"
            );

            // Ponerlas como leidas en el estado local
            setNotifications((prev) =>
              prev.map((n) => ({ ...n, read: true }))
            );

            const nextUnread =
              typeof res2.data?.unreadCount === "number"
                ? res2.data.unreadCount
                : 0;
            const nextBadge =
              typeof res2.data?.badgeCount === "number"
                ? res2.data.badgeCount
                : nextUnread;

            // Avisar globalmente (Sidebar escucha este evento)
            window.dispatchEvent(
              new CustomEvent("vinci:notifications-count", {
                detail: { badgeCount: nextBadge, unreadCount: nextUnread },
              }),
            );
          } catch (err) {
            console.error(
              "Error al marcar todas las notificaciones como leidas:",
              err
            );
          }
        }
      } catch (err) {
        console.error("Error al cargar notificaciones:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllAndMarkAsRead();
  }, []);

  const handleNotificationActivation = async (n) => {
    const type = (n?.type || "").toUpperCase();
    const conversationId = n?.data?.conversationId || n?.entity?.id;
    const postId = n?.post?._id || n?.post;

    if (!n.read && n._id) {
      try {
        const res = await axios.put(`/users/me/notifications/${n._id}/read`);
        setNotifications((prev) =>
          prev.map((x) => (x._id === n._id ? { ...x, read: true } : x))
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
          window.dispatchEvent(
            new CustomEvent("vinci:notifications-count", {
              detail: counts,
            })
          );
        }
      } catch (err) {
        console.error("Error al marcar como leida:", err);
      }
    }

    if (type === "CHAT_MESSAGE" || type === "COLLAB_ACCEPTED") {
      if (conversationId) navigate(`/chats?conversationId=${conversationId}`);
      return;
    }

    if (type === "COLLAB_REQUEST") {
      navigate("/chats?tab=requests");
      return;
    }

    if (!postId) return;

    const highlightKind =
      n?.entity?.kind || (n?.data?.commentId ? "comment" : "post");
    const anchorId = n?.entity?.id || n?.data?.commentId || null;
    const params = new URLSearchParams();
    if (highlightKind) params.set("highlight", highlightKind);
    if (anchorId) params.set("anchorId", anchorId);

    const search = params.toString();
    const url = search ? `/posts/${postId}?${search}` : `/posts/${postId}`;

    navigate(url, { state: { fromNotification: true, highlight: highlightKind } });
  };

  if (loading) return <p className="mt-4 px-4">Cargando notificaciones...</p>;

  return (
    <div className="container mt-4">
      <h1 className="mb-3">Notificaciones</h1>

      {notifications.length === 0 ? (
        <p className="text-muted">Todavía no tenés notificaciones.</p>
      ) : (
        <div>
          {notifications
            .slice() // copia defensiva
            .sort(
              (a, b) =>
                new Date(b.createdAt || 0).getTime() -
                new Date(a.createdAt || 0).getTime()
            )
            .map((n) => (
             <div
  key={n._id || n.createdAt}
  className={getNotificationItemClass(n)}
  role="button"
  tabIndex={0}
  style={{ cursor: "pointer" }}   // 👉 cursor de mano
  onClick={() => handleNotificationActivation(n)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleNotificationActivation(n);
    }
  }}
>

                <div className="d-flex align-items-start gap-2">
                  {n.fromUserAvatar ? (
                    <img
                      src={
                        n.fromUserAvatar.startsWith("http")
                          ? n.fromUserAvatar
                          : `${import.meta.env.VITE_SERVER_URL || "http://localhost:3000"}${n.fromUserAvatar}`
                      }
                      alt={n.fromUserName || "Usuario"}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : null}

                  <div className="flex-grow-1">
                    <div className="d-flex align-items-start gap-2">
                      {!n.read && (
                        <span
                          className="rounded-circle bg-primary mt-1"
                          style={{ width: 10, height: 10 }}
                          aria-label="Notificación no leída"
                        />
                      )}
                      <div>
                        {n.fromUserName ? (
                          <Fragment>
                            <span className="fw-semibold">@{n.fromUserName}</span>{" "}
                            <span>{formatNotificationMessage(n)}</span>
                          </Fragment>
                        ) : (
                          <span>{n.message}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <small className="text-muted">
                        {new Date(n.createdAt || Date.now()).toLocaleString()}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
