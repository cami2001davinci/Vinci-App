import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "../api/axiosInstance";
import { socket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const getConversationId = (conversation) =>
  conversation?._id || conversation?.id || "";

const getId = (entity) =>
  typeof entity === "object" && entity !== null
    ? entity._id || entity.id
    : entity;

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

export default function ChatsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedIsRequest, setSelectedIsRequest] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [actionError, setActionError] = useState("");
  const [accepting, setAccepting] = useState(false);

  const messagesRef = useRef(null);

  const currentUserId = user?._id || user?.id;
  // Normaliza datos para ocultar solicitudes al interesado y marcar al owner
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

  const fetchConversations = async () => {
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

      const fromQuery = searchParams.get("conversationId");
      const tabQuery = searchParams.get("tab");
      const initialReq = visibleRequests.find(
        (r) => getConversationId(r) === fromQuery
      );
      const initialConv = visibleConversations.find(
        (c) => getConversationId(c) === fromQuery
      );

      if (initialReq) {
        setSelectedId(getConversationId(initialReq));
        setSelectedIsRequest(true);
      } else if (initialConv) {
        setSelectedId(getConversationId(initialConv));
        setSelectedIsRequest(false);
      } else {
        const firstReq = tabQuery === "requests" ? visibleRequests[0] : null;
        const firstConv =
          tabQuery !== "requests"
            ? visibleConversations.find((c) => c.unread) ||
              visibleConversations[0]
            : null;
        const pick = firstReq || firstConv;
        if (pick) {
          setSelectedId(getConversationId(pick));
          setSelectedIsRequest(pick.isPendingForMe);
          setSearchParams({
            conversationId: getConversationId(pick),
            tab: pick.isPendingForMe ? "requests" : "chats",
          });
        }
      }
    } catch (err) {
      console.error("Error al cargar conversaciones:", err);
    }
  };

  useEffect(() => {
    if (!currentUserId) return;
    fetchConversations();
  }, [currentUserId]);

  useEffect(() => {
    if (!selectedId || selectedIsRequest) return;

    socket.emit("chat:join", selectedId);
    fetchMessages(selectedId);
    markAsRead(selectedId);

    return () => {
      socket.emit("chat:leave", selectedId);
    };
  }, [selectedId, selectedIsRequest]);

  useEffect(() => {
    const onChat = (e) => {
      const { conversationId, message, conversation } = e.detail || {};
      const cid = conversationId || getConversationId(conversation);
      if (!cid) return;
      const normalized = conversation ? normalizeConversation(conversation) : null;
      const isPending = normalized?.status === "pending";

      if (isPending) {
        if (!normalized?.isPendingForMe) return; // Solo el owner ve la solicitud
        setRequests((prev) => {
          const exists = prev.some((r) => getConversationId(r) === cid);
          if (exists) return prev;
          return [normalized, ...prev];
        });
        return;
      }

      // Limpia solicitudes si el chat pasa a activo y actualiza la lista
      setRequests((prev) =>
        prev.filter((r) => getConversationId(r) !== cid)
      );

      setConversations((prev) => {
        const without = prev.filter((c) => getConversationId(c) !== cid);
        const existing = prev.find((c) => getConversationId(c) === cid);
        const updated = normalized || normalizeConversation(existing);
        return updated ? [updated, ...without] : prev;
      });

      if (cid === selectedId && message) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) => (m._id || m.id) === (message._id || message.id)
          );
          if (exists) return prev;
          return [...prev, message];
        });
        markAsRead(cid);
        scrollToBottom();
      }
    };

    const onRequest = (e) => {
      const conv = e.detail?.conversation || e.detail;
      if (!conv || conv.status !== "pending") return;
      const cid = getConversationId(conv);
      const normalized = normalizeConversation(conv);
      if (!normalized?.isPendingForMe) return;
      setRequests((prev) => {
        const exists = prev.some((r) => getConversationId(r) === cid);
        if (exists) return prev;
        return [normalized, ...prev];
      });
    };

    const onIgnored = (e) => {
      const { conversationId } = e.detail || {};
      if (!conversationId) return;
      setRequests((prev) =>
        prev.filter((r) => getConversationId(r) !== conversationId)
      );
      setConversations((prev) =>
        prev.filter((c) => getConversationId(c) !== conversationId)
      );
      if (selectedId === conversationId) {
        setSelectedId("");
        setSelectedIsRequest(false);
        setMessages([]);
      }
    };

    window.addEventListener("vinci:chat-message", onChat);
    window.addEventListener("vinci:collab-request", onRequest);
    window.addEventListener("vinci:collab-ignored", onIgnored);
    return () => {
      window.removeEventListener("vinci:chat-message", onChat);
      window.removeEventListener("vinci:collab-request", onRequest);
      window.removeEventListener("vinci:collab-ignored", onIgnored);
    };
  }, [selectedId, currentUserId]);

  const fetchMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const { data } = await axios.get(`/chats/${conversationId}/messages`);
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      if (data?.conversation) {
        const normalized = normalizeConversation(data.conversation);
        if (normalized?.status === "pending" && !normalized.isPendingForMe) {
          return;
        }
        setConversations((prev) => {
          const others = prev.filter(
            (c) => getConversationId(c) !== conversationId
          );
          return normalized ? [normalized, ...others] : others;
        });
      }
    } catch (err) {
      if (err?.response?.status === 404) {
        setMessages([]);
        setSelectedId(null);
        return;
      }
      console.error("Error al cargar mensajes:", err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
      scrollToBottom();
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
      if (err?.response?.status === 404) return;
      console.error("Error al marcar leido:", err);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!selectedId || !messageText.trim() || sending || selectedIsRequest)
      return;

    setSending(true);
    try {
      const { data } = await axios.post(`/chats/${selectedId}/messages`, {
        content: messageText.trim(),
      });

      if (data?.message) {
        setMessageText("");
        setConversations((prev) => {
          const others = prev.filter(
            (c) => getConversationId(c) !== selectedId
          );
          const updated = normalizeConversation(
            data.conversation ||
              prev.find((c) => getConversationId(c) === selectedId)
          );
          return updated ? [updated, ...others] : prev;
        });
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    } finally {
      setSending(false);
    }
  };

 // Usa ESTO dentro de tu handleAcceptRequest O handleAcceptCollab
const handleAcceptRequest = async () => {
  if (!selectedId || !selectedConversation?.isPendingForMe) {
    setActionError("Solo el owner puede aceptar esta colaboracion.");
    return;
  }
  setAccepting(true);
  setActionError("");

  try {
    const { data } = await axios.post(`/chats/${selectedId}/accept-collab`);

    const updatedConv = data?.conversation;
    const convId = getConversationId(updatedConv) || selectedId;

    // 1) Sacar la solicitud de la lista de "Solicitudes"
    setRequests((prev) =>
      prev.filter((r) => getConversationId(r) !== selectedId)
    );

    // 2) Meter/actualizar la conversación en la lista de "Chats"
    if (updatedConv) {
      setConversations((prev) => {
        const others = prev.filter((c) => getConversationId(c) !== convId);
        return [normalizeConversation(updatedConv), ...others];
      });
    }

    // 3) Cambiar la vista: dejar de estar en "solicitud" y pasar a "chat"
    setSelectedIsRequest(false);
    setSelectedId(convId);
    setMessages([]); // que se recarguen limpio

    setSearchParams({
      conversationId: convId,
      tab: "chats",
    });

    // 4) Cargar mensajes y marcar como leído YA MISMO
    await fetchMessages(convId);
    await markAsRead(convId);

    // (si el backend mandó un mensaje de sistema, lo agregamos después de traer todo)
    if (data?.message) {
      setMessages((prev) => {
        const exists = prev.some(
          (m) => (m._id || m.id) === (data.message._id || data.message.id)
        );
        return exists ? prev : [...prev, data.message];
      });
    }

    scrollToBottom();
  } catch (err) {
    const msg =
      err?.response?.data?.message ||
      "No se pudo aceptar la colaboracion.";
    setActionError(msg);
  } finally {
    setAccepting(false);
  }
};



  const handleIgnoreRequest = async () => {
    if (!selectedId || !selectedConversation?.isPendingForMe) {
      setActionError("Solo el owner puede gestionar la solicitud.");
      return;
    }
    setAccepting(true);
    setActionError("");
    try {
      await axios.post(`/chats/requests/${selectedId}/ignore`);
      setRequests((prev) =>
        prev.filter((r) => getConversationId(r) !== selectedId)
      );
      setSelectedId("");
      setSelectedIsRequest(false);
      setMessages([]);
      setSearchParams({});
    } catch (err) {
      const msg =
        err?.response?.data?.message || "No se pudo ignorar la solicitud.";
      setActionError(msg);
    } finally {
      setAccepting(false);
    }
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const selectConversation = (conversationId, isRequest = false) => {
    setSelectedId(conversationId);
    setSelectedIsRequest(isRequest);
    setMessages([]);
    setSearchParams({
      conversationId,
      tab: isRequest ? "requests" : "chats",
    });
  };

  const selectedConversation = useMemo(
    () =>
      (selectedIsRequest ? requests : conversations).find(
        (c) => getConversationId(c) === selectedId
      ),
    [conversations, requests, selectedId, selectedIsRequest]
  );

  const renderConversationItem = (conv, isRequest) => {
    const cid = getConversationId(conv);
    const other = isRequest
      ? getRequestSender(conv, currentUserId)
      : getOtherParticipant(conv, currentUserId);
    const name =
      other?.username ||
      [other?.firstName, other?.lastName].filter(Boolean).join(" ").trim() ||
      "Chat";

    return (
      <button
        key={cid}
        onClick={() => selectConversation(cid, isRequest)}
        className={`w-100 text-start p-2 border rounded mb-2 ${
          cid === selectedId && isRequest === selectedIsRequest
            ? "bg-primary text-white"
            : "bg-light"
        }`}
      >
        <div className="d-flex justify-content-between align-items-center">
          <span>{name}</span>
          {isRequest ? (
            <span className={`badge ${cid === selectedId ? "bg-light text-primary" : "bg-warning text-dark"}`}>
              Solicitud
            </span>
          ) : conv.unread ? (
            <span className="badge bg-danger">Nuevo</span>
          ) : null}
        </div>
        {conv.lastMessage ? (
          <small className={cid === selectedId ? "text-white" : "text-muted"}>
            {conv.lastMessage}
          </small>
        ) : null}
      </button>
    );
  };

const renderMessage = (msg) => {
  const isMine =
    (msg?.sender?._id || msg?.sender)?.toString() ===
    currentUserId?.toString();

  // El backend guarda el texto en "content"
  const text = msg.text || msg.content || "";

  // 🔍 Detectar mensajes automáticos de colaboración
  const acceptMatch = text.match(/acepto tu interes en "([^"]+)"/i);
  const requestMatch = text.match(
    /est[aá] interesado en colaborar en "([^"]+)"/i
  );

  const isCollab = !!acceptMatch || !!requestMatch;

  if (isCollab) {
    const projectTitle = (acceptMatch || requestMatch)[1];
    const label = acceptMatch
      ? "Colaboración confirmada"
      : "Nuevo interés en tu proyecto";

    return (
      <div
        key={msg._id || msg.id}
        className="d-flex mb-3 justify-content-center"
      >
        <div
          className="rounded-3"
          style={{
            maxWidth: "80%",
            backgroundColor: "#f5f5f5",
            border: "1px solid #e0e0e0",
            padding: "8px 12px",
            fontSize: "0.9rem",
          }}
        >
          {/* Cajita tipo reply de WhatsApp */}
          <div
            style={{
              borderLeft: "4px solid #25d366",
              paddingLeft: 8,
              marginBottom: 6,
              backgroundColor: "#ffffff",
              borderRadius: 6,
            }}
          >
            <small className="text-muted d-block">{label}</small>
            <strong className="d-block">{projectTitle}</strong>
          </div>

          {/* Texto principal del mensaje */}
          <div>{text}</div>
        </div>
      </div>
    );
  }

  // 💬 Mensajes normales
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  const avatar =
    msg?.sender?.profilePicture &&
    `${baseUrl}${msg.sender.profilePicture}`;

  return (
    <div
      key={msg._id || msg.id}
      className={`d-flex mb-2 ${
        isMine ? "justify-content-end" : "justify-content-start"
      }`}
    >
      {!isMine && (
        <img
          src={
            avatar ||
            "https://ui-avatars.com/api/?name=" +
              encodeURIComponent(msg?.sender?.name || "U")
          }
          alt={msg?.sender?.name || "User"}
          className="rounded-circle me-2"
          style={{ width: 32, height: 32, objectFit: "cover" }}
        />
      )}

      <div
        className={`p-2 rounded-3 ${
          isMine ? "bg-primary text-white" : "bg-light"
        }`}
        style={{ maxWidth: "75%" }}
      >
        {!isMine && (
          <div className="fw-bold mb-1">
            {msg?.sender?.name || msg?.sender?.username || "Usuario"}
          </div>
        )}
        <div>{text}</div>
      </div>
    </div>
  );
};


  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Mensajes</h2>
        <button className="btn btn-light" onClick={() => navigate(-1)}>
          Volver
        </button>
      </div>

      <div className="row" style={{ minHeight: 480 }}>
        <div className="col-12 col-md-4">
          <div className="border rounded p-2">
            <h6>Solicitudes</h6>
            {requests.length === 0 ? (
              <p className="text-muted small">Sin solicitudes</p>
            ) : (
              requests.map((r) => renderConversationItem(r, true))
            )}
            <h6 className="mt-3">Chats</h6>
            {conversations.length === 0 ? (
              <p className="text-muted small">No tienes conversaciones.</p>
            ) : (
              conversations.map((c) => renderConversationItem(c, false))
            )}
          </div>
        </div>

        <div className="col-12 col-md-8 mt-3 mt-md-0">
          <div
            className="border rounded d-flex flex-column"
            style={{ height: "100%" }}
          >
            {selectedConversation?.post &&
              selectedConversation.post.category &&
              selectedConversation.post.category.toLowerCase() ===
                "colaboradores" && (
                <div className="p-2 border-bottom d-flex justify-content-between align-items-center bg-light">
                  <div>
                    <strong>Proyecto:</strong> {selectedConversation.post.title}
                  </div>
                  {selectedConversation?.isPendingForMe && selectedIsRequest ? (
                    <button
                      className="btn btn-sm btn-success"
                      onClick={handleAcceptRequest}
                      disabled={accepting}
                    >
                      {accepting ? "Aceptando..." : "Aceptar colaboracion"}
                    </button>
                  ) : null}
                </div>
              )}

            {selectedIsRequest ? (
              <div className="p-3">
                {actionError && (
                  <div className="alert alert-danger py-2">{actionError}</div>
                )}
                <p className="mb-3">
                  {selectedConversation?.requestMessage ||
                    "Solicitud de chat o colaboracion"}
                </p>
                {selectedConversation?.isPendingForMe ? (
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-success"
                      onClick={handleAcceptRequest}
                      disabled={accepting}
                    >
                      {accepting ? "Aceptando..." : "Aceptar chat"}
                    </button>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={handleIgnoreRequest}
                      disabled={accepting}
                    >
                      Ignorar
                    </button>
                  </div>
                ) : (
                  <p className="text-muted small mb-0">
                    Solo el owner puede aceptar esta colaboracion.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div
                  ref={messagesRef}
                  className="flex-grow-1 p-3 overflow-auto"
                  style={{ minHeight: 300 }}
                >
                  {actionError && (
                    <div className="alert alert-danger py-2">{actionError}</div>
                  )}
                  {loadingMessages ? (
                    <p className="text-muted">Cargando mensajes...</p>
                  ) : messages.length === 0 ? (
                    <p className="text-muted">No hay mensajes todavia.</p>
                  ) : (
                    messages.map(renderMessage)
                  )}
                </div>

                <form
                  onSubmit={handleSend}
                  className="p-3 border-top d-flex gap-2"
                >
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Escribe un mensaje..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    disabled={!selectedId || sending}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!selectedId || sending || !messageText.trim()}
                  >
                    {sending ? "Enviando..." : "Enviar"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
