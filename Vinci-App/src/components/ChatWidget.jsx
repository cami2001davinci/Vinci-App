import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";
import { socket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const getDisplayName = (user) => {
  if (!user) return "Usuario";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;
  if (user.username) return user.username;
  return "Usuario";
};

const getUsernameHandle = (user) => (user?.username ? `@${user.username}` : "");

const getId = (entity) =>
  typeof entity === "object" && entity !== null
    ? entity._id || entity.id
    : entity;

const getConversationId = (conversation) =>
  conversation?._id || conversation?.id || "";

const getOtherParticipant = (conversation, currentUserId) => {
  const participants = conversation?.participants || [];
  const current = currentUserId?.toString();
  const found = participants.find((p) => {
    const pid = getId(p)?.toString();
    return pid && pid !== current;
  });
  if (found) return found;
  const fallback = conversation?.participant;
  const fallbackId = getId(fallback)?.toString();
  if (fallbackId && fallbackId !== current) return fallback;
  return null;
};

const getRequestSender = (conversation, currentUserId) => {
  const requestedBy = getId(conversation?.requestedBy);
  const participants = conversation?.participants || [];
  if (requestedBy) {
    const fromParticipants = participants.find(
      (p) => getId(p)?.toString() === requestedBy.toString()
    );
    if (fromParticipants) return fromParticipants;
  }
  if (conversation?.requestedBy && typeof conversation.requestedBy === "object") {
    return conversation.requestedBy;
  }
  return getOtherParticipant(conversation, currentUserId);
};

const formatDateShort = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
};

const formatTimeShort = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ChatWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentUserId = user?._id || user?.id;

  const [isOpen, setIsOpen] = useState(false);

  // panelView:
  // - "listChats": lista principal de chats (Chats + link a solicitudes)
  // - "listRequests": lista de solicitudes de mensajes
  // - "chatDetail": vista de chat abierto
  // - "requestDetail": vista de solicitud abierta
  const [panelView, setPanelView] = useState("listChats");

  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [handlingRequest, setHandlingRequest] = useState(false);
  const [actionError, setActionError] = useState("");

  const messagesRef = useRef(null);

  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

  const normalizeConversation = (conv) => {
    if (!conv) return conv;
    const unreadBy = conv.unreadBy || [];
    const ownerId = getId(conv.owner);
    const requestedById = getId(conv.requestedBy);

    const unread = unreadBy.some(
      (id) => id?.toString() === currentUserId?.toString()
    );
    const isOwner = ownerId?.toString() === currentUserId?.toString();
    const isRequester =
      requestedById?.toString() === currentUserId?.toString();
    const isPendingForMe = conv.status === "pending" && isOwner;

    return { ...conv, unread, isOwner, isRequester, isPendingForMe };
  };

  const unreadCount = useMemo(
    () => conversations.filter((c) => c.unread).length,
    [conversations]
  );

  const requestCount = useMemo(
    () => requests.filter((r) => r.isPendingForMe).length,
    [requests]
  );

  const selectedConversation = useMemo(() => {
    if (!selectedId) return null;
    const all = [...conversations, ...requests];
    return all.find((c) => getConversationId(c) === selectedId) || null;
  }, [conversations, requests, selectedId]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const fetchConversations = async () => {
    if (!currentUserId) return;
    try {
      const { data } = await axios.get("/chats");
      const list = Array.isArray(data?.conversations)
        ? data.conversations.map(normalizeConversation)
        : [];
      const reqs = Array.isArray(data?.requests)
        ? data.requests.map(normalizeConversation)
        : [];

      const visibleRequests = reqs.filter((r) => r.isPendingForMe);
      const visibleConversations = list.filter(
        (c) => c.status !== "pending"
      );

      setConversations(visibleConversations);
      setRequests(visibleRequests);
    } catch (err) {
      console.error("Error cargando chats:", err);
    }
  };

  const fetchMessages = async (conversationId) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const { data } = await axios.get(`/chats/${conversationId}/messages`);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      scrollToBottom();
    } catch (err) {
      console.error("Error al cargar mensajes:", err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const markAsRead = async (conversationId) => {
    if (!conversationId) return;
    try {
      await axios.put(`/chats/${conversationId}/read`);
      setConversations((prev) =>
        prev.map((c) =>
          getConversationId(c) === conversationId
            ? { ...c, unread: false, unreadBy: [] }
            : c
        )
      );
    } catch (err) {
      console.error("Error al marcar como leido:", err);
    }
  };

  const openChatDetail = async (conversationId) => {
    setSelectedId(conversationId);
    setPanelView("chatDetail");
    setActionError("");
    socket.emit("chat:join", conversationId);
    await fetchMessages(conversationId);
    await markAsRead(conversationId);
  };

  const openRequestDetail = (conversationId) => {
    setSelectedId(conversationId);
    setPanelView("requestDetail");
    setActionError("");
  };

  const handleBackFromDetail = () => {
    setSelectedId("");
    setMessages([]);
    setPanelView("listChats");
    setActionError("");
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!selectedId || !messageText.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await axios.post(`/chats/${selectedId}/messages`, {
        content: messageText.trim(),
      });
      setMessageText("");
      if (data?.message) {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
      }
      if (data?.conversation) {
        const normalized = normalizeConversation(data.conversation);
        setConversations((prev) => {
          const others = prev.filter(
            (c) => getConversationId(c) !== getConversationId(normalized)
          );
          return [normalized, ...others];
        });
      }
    } catch (err) {
      console.error("Error enviando mensaje:", err);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!selectedId || !selectedConversation?.isPendingForMe) {
      setActionError("Solo el autor del post puede aceptar la solicitud.");
      return;
    }
    setHandlingRequest(true);
    setActionError("");
    try {
      const { data } = await axios.post(
        `/chats/${selectedId}/accept-collab`
      );

      // Eliminamos de solicitudes
      setRequests((prev) =>
        prev.filter((r) => getConversationId(r) !== selectedId)
      );

      const updatedConv = data?.conversation;
      const convId = getConversationId(updatedConv) || selectedId;

      if (updatedConv) {
        const normalized = normalizeConversation(updatedConv);
        setConversations((prev) => {
          const others = prev.filter(
            (c) => getConversationId(c) !== convId
          );
          return [normalized, ...others];
        });
      }

      // Abrimos el chat ya aceptado
      await openChatDetail(convId);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "No se pudo aceptar la solicitud de colaboracion.";
      setActionError(msg);
    } finally {
      setHandlingRequest(false);
    }
  };

  const handleIgnoreRequest = async () => {
    if (!selectedId || !selectedConversation?.isPendingForMe) {
      setActionError("Solo el autor del post puede gestionar la solicitud.");
      return;
    }
    setHandlingRequest(true);
    setActionError("");
    try {
      await axios.post(`/chats/requests/${selectedId}/ignore`);
      setRequests((prev) =>
        prev.filter((r) => getConversationId(r) !== selectedId)
      );
      setSelectedId("");
      setPanelView("listChats");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "No se pudo ignorar la solicitud.";
      setActionError(msg);
    } finally {
      setHandlingRequest(false);
    }
  };

  const renderConversationRow = (conv, isRequest = false) => {
    const cid = getConversationId(conv);
    const targetUser = isRequest
      ? getRequestSender(conv, currentUserId)
      : getOtherParticipant(conv, currentUserId);
    const displayName = getDisplayName(targetUser);
    const usernameHandle = getUsernameHandle(targetUser);
    const avatar =
      targetUser?.profilePicture &&
      `${baseUrl}${targetUser.profilePicture}`;

    const preview =
      conv.lastMessage ||
      conv.requestMessage ||
      "Nuevo mensaje";

    const dateLabel = formatDateShort(conv.lastMessageAt || conv.createdAt);

    const isUnread = !!conv.unread;

    return (
      <button
        key={cid}
        type="button"
        className={`chatw-row${isUnread ? " chatw-row--unread" : ""}`}
        onClick={() =>
          isRequest ? openRequestDetail(cid) : openChatDetail(cid)
        }
      >
        <div className="chatw-row-avatar">
          <img
            src={
              avatar ||
              "https://ui-avatars.com/api/?name=" +
                encodeURIComponent(displayName)
            }
            alt={displayName}
          />
        </div>
        <div className="chatw-row-main">
          <div className="chatw-row-top">
            <span
              className={
                "chatw-row-name" +
                (isUnread ? " chatw-row-name--unread" : "")
              }
            >
              {displayName}
            </span>
            {usernameHandle && (
              <span className="chatw-row-username">{usernameHandle}</span>
            )}
            {dateLabel && (
              <span
                className={
                  "chatw-row-date" +
                  (isUnread ? " chatw-row-date--unread" : "")
                }
              >
                {dateLabel}
              </span>
            )}
            {isUnread && <span className="chatw-unread-dot" aria-hidden="true" />}
          </div>
          <div className="chatw-row-bottom">
            <span
              className={
                "chatw-row-preview" +
                (isUnread ? " chatw-row-preview--unread" : "")
              }
              title={preview}
            >
              {preview}
            </span>
          </div>
        </div>
      </button>
    );
  };

  const renderMessageBubble = (msg) => {
    const isMine =
      (msg?.sender?._id || msg?.sender)?.toString() ===
      currentUserId?.toString();

    const text = msg.text || msg.content || "";
    const timeLabel = formatTimeShort(msg.createdAt || msg.updatedAt);

    return (
      <div
        key={msg._id || msg.id}
        className={
          "chatw-msg-row " +
          (isMine ? "chatw-msg-row--me" : "chatw-msg-row--other")
        }
      >
        <div className="chatw-msg-bubble">
          <span className="chatw-msg-text">{text}</span>
          {timeLabel && <span className="chatw-msg-time">{timeLabel}</span>}
        </div>
      </div>
    );
  };

  const resolveOther = (conv) => {
    if (!conv) return null;
    if (conv.status === "pending") {
      return getRequestSender(conv, currentUserId);
    }
    return getOtherParticipant(conv, currentUserId);
  };

  const other = resolveOther(selectedConversation);

  const otherName = getDisplayName(other);
  const otherUsername = getUsernameHandle(other);

  const otherAvatar =
    other?.profilePicture && `${baseUrl}${other.profilePicture}`;

  // ===== EFFECTS =====
  useEffect(() => {
    if (!currentUserId) return;
    fetchConversations();
  }, [currentUserId]);

  useEffect(() => {
    const onChatMessageEvent = (e) => {
      const { conversationId, conversation, message } = e.detail || {};
      const cid = conversationId || getConversationId(conversation);
      if (!cid) return;
      const normalized = conversation ? normalizeConversation(conversation) : null;

      // si es pending para mi, va a solicitudes
      if (normalized?.status === "pending") {
        if (!normalized.isPendingForMe) return;
        setRequests((prev) => {
          const exists = prev.some((r) => getConversationId(r) === cid);
          if (exists) return prev;
          return [normalized, ...prev];
        });
        return;
      }

      // si es chat normal
      setRequests((prev) =>
        prev.filter((r) => getConversationId(r) !== cid)
      );
      setConversations((prev) => {
        const others = prev.filter((c) => getConversationId(c) !== cid);
        const existing = prev.find((c) => getConversationId(c) === cid);
        const updated = normalized || normalizeConversation(existing);
        return updated ? [updated, ...others] : prev;
      });

      // si justo estamos mirando ese chat => agregamos mensaje
      if (panelView === "chatDetail" && cid === selectedId && message) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => (m._id || m.id) === (message._id || message.id)
          );
          if (exists) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      }
    };

    const onCollabRequestEvent = (e) => {
      const conv = e.detail?.conversation || e.detail;
      if (!conv) return;
      const normalized = normalizeConversation(conv);
      if (!normalized.isPendingForMe) return;
      setRequests((prev) => {
        const exists = prev.some(
          (r) => getConversationId(r) === getConversationId(normalized)
        );
        if (exists) return prev;
        return [normalized, ...prev];
      });
    };

    const onCollabIgnoredEvent = (e) => {
      const { conversationId } = e.detail || {};
      if (!conversationId) return;
      setRequests((prev) =>
        prev.filter((r) => getConversationId(r) !== conversationId)
      );
      setConversations((prev) =>
        prev.filter((c) => getConversationId(c) !== conversationId)
      );
      if (selectedId === conversationId) {
        handleBackFromDetail();
      }
    };

    window.addEventListener("vinci:chat-message", onChatMessageEvent);
    window.addEventListener("vinci:collab-request", onCollabRequestEvent);
    window.addEventListener("vinci:collab-ignored", onCollabIgnoredEvent);

    return () => {
      window.removeEventListener("vinci:chat-message", onChatMessageEvent);
      window.removeEventListener(
        "vinci:collab-request",
        onCollabRequestEvent
      );
      window.removeEventListener(
        "vinci:collab-ignored",
        onCollabIgnoredEvent
      );
    };
  }, [currentUserId, panelView, selectedId]);

  useEffect(() => {
    if (!isOpen) {
      setPanelView("listChats");
      setSelectedId("");
      setMessages([]);
      setActionError("");
    }
  }, [isOpen]);

  if (!currentUserId) return null;

  return (
    <div className="chatw-container">
      {/* panel desplegable */}
      {isOpen && (
        <div className="chatw-panel shadow-lg">
          {/* HEADER segun vista */}
          {panelView === "listChats" && (
            <div className="chatw-header">
              <div className="chatw-header-left">
                <span className="chatw-header-title">Chats</span>
              </div>
              <button
                type="button"
                className="chatw-header-link"
                onClick={() => setPanelView("listRequests")}
              >
                Solicitudes{" "}
                {requestCount > 0 && (
                  <span className="chatw-header-badge">{requestCount}</span>
                )}
              </button>
            </div>
          )}

          {panelView === "listRequests" && (
            <div className="chatw-header">
              <button
                type="button"
                className="chatw-back-btn"
                onClick={() => setPanelView("listChats")}
              >
                {"<"}
              </button>
              <span className="chatw-header-title">
                Solicitudes de mensajes
              </span>
            </div>
          )}

          {panelView === "chatDetail" && (
            <div className="chatw-header">
              <button
                type="button"
                className="chatw-back-btn"
                onClick={handleBackFromDetail}
              >
                {"<"}
              </button>
              <div className="chatw-header-user">
                <img
                  src={
                    otherAvatar ||
                    "https://ui-avatars.com/api/?name=" +
                      encodeURIComponent(otherName)
                  }
                  alt={otherName}
                />
                <div className="chatw-header-user-text">
                  <span className="chatw-header-title">{otherName}</span>
                  <span className="chatw-header-sub">
                    {otherUsername || "@usuario"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {panelView === "requestDetail" && (
            <div className="chatw-header">
              <button
                type="button"
                className="chatw-back-btn"
                onClick={handleBackFromDetail}
              >
                {"<"}
              </button>
              <span className="chatw-header-title">Solicitud de mensaje</span>
            </div>
          )}

          {/* CONTENIDO */}
          <div className="chatw-body">
            {panelView === "listChats" && (
              <>
                <div className="chatw-list">
                  {conversations.length === 0 ? (
                    <p className="chatw-empty">No tienes chats todavia.</p>
                  ) : (
                    conversations.map((c) => renderConversationRow(c, false))
                  )}
                </div>
                <button
                  type="button"
                  className="chatw-open-full"
                  onClick={() => navigate("/chats")}
                >
                  Abrir bandeja completa
                </button>
              </>
            )}

            {panelView === "listRequests" && (
              <div className="chatw-list">
                {requests.length === 0 ? (
                  <p className="chatw-empty">
                    No tienes solicitudes de mensajes.
                  </p>
                ) : (
                  requests.map((r) => renderConversationRow(r, true))
                )}
              </div>
            )}

            {panelView === "chatDetail" && (
              <div className="chatw-chat-detail">
                <div className="chatw-chat-messages" ref={messagesRef}>
                  {loadingMessages ? (
                    <p className="chatw-empty">Cargando mensajes...</p>
                  ) : messages.length === 0 ? (
                    <p className="chatw-empty">
                      No hay mensajes. Envia el primero!
                    </p>
                  ) : (
                    messages.map(renderMessageBubble)
                  )}
                </div>
                <form
                  className="chatw-chat-input"
                  onSubmit={handleSend}
                  autoComplete="off"
                >
                  <input
                    type="text"
                    className="chatw-input"
                    placeholder="Escribe un mensaje..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className="chatw-send-btn"
                    disabled={sending || !messageText.trim()}
                  >
                    Enviar
                  </button>
                </form>
              </div>
            )}

            {panelView === "requestDetail" && selectedConversation && (
              <div className="chatw-request-detail">
                <div className="chatw-request-user">
                  <img
                    src={
                      otherAvatar ||
                      "https://ui-avatars.com/api/?name=" +
                        encodeURIComponent(otherName)
                    }
                    alt={otherName}
                  />
                  <div className="chatw-request-user-text">
                    <span className="chatw-header-title">{otherName}</span>
                    <span className="chatw-header-sub">
                      {otherUsername || "@usuario"}
                    </span>
                  </div>
                </div>

                <div className="chatw-request-bubble">
                  {selectedConversation.requestMessage ||
                    "Estoy interesado en colaborar contigo en tu proyecto."}
                </div>

                <div className="chatw-request-info">
                  {otherName} te envio una solicitud de mensaje
                </div>

                {actionError && (
                  <div className="chatw-error">{actionError}</div>
                )}

                <div className="chatw-request-actions">
                  <button
                    type="button"
                    className="chatw-btn-accept"
                    onClick={handleAcceptRequest}
                    disabled={handlingRequest}
                  >
                    {handlingRequest ? "Aceptando..." : "Aceptar"}
                  </button>
                  <button
                    type="button"
                    className="chatw-btn-ignore"
                    onClick={handleIgnoreRequest}
                    disabled={handlingRequest}
                  >
                    Ignorar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTON FLOTANTE (colapsado) */}
      <button
        type="button"
        className="chatw-toggle shadow-lg"
        onClick={() => setIsOpen((v) => !v)}
      >
        <span>Chats</span>
        {unreadCount + requestCount > 0 && (
          <span className="chatw-toggle-badge">
            {unreadCount + requestCount}
          </span>
        )}
        <span className="chatw-toggle-icon">{isOpen ? "-" : "+"}</span>
      </button>
    </div>
  );
};

export default ChatWidget;
