import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "../api/axiosInstance";
import { socket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

// --- HELPERS SEGUROS ---
const getId = (entity) => {
  if (!entity) return "";
  if (typeof entity === "string") return entity;
  return entity._id || entity.id || "";
};

const getConversationId = (conv) => getId(conv);

const normalizeConversation = (conv, currentUserId) => {
  if (!conv) return null;
  const ownerId = getId(conv.owner);
  const requestedById = getId(conv.requestedBy);
  const unreadBy = conv.unreadBy || [];
  
  const isOwner = ownerId.toString() === currentUserId?.toString();
  const unread = unreadBy.some(id => getId(id).toString() === currentUserId?.toString());
  
  // Status fallback seguro
  const status = conv.status || "active"; 
  const isPendingForMe = status === "pending" && isOwner;

  return { ...conv, status, unread, isOwner, isPendingForMe };
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
  const currentUserId = getId(user);

  // --- DEDUPLICADOR DE LISTAS (Fix Error Keys) ---
  const uniqueList = (list) => {
    const seen = new Set();
    return list.filter(item => {
      const id = getId(item);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  const fetchConversations = async () => {
    try {
      const { data } = await axios.get("/chats");
      
      let list = Array.isArray(data?.conversations) ? data.conversations : [];
      let reqs = Array.isArray(data?.requests) ? data.requests : [];

      // Normalizar y Deduplicar
      list = uniqueList(list.map(c => normalizeConversation(c, currentUserId)));
      reqs = uniqueList(reqs.map(r => normalizeConversation(r, currentUserId)));

      const visibleRequests = reqs.filter(r => r.isPendingForMe);
      const visibleConversations = list.filter(c => c.status !== "pending");

      setConversations(visibleConversations);
      setRequests(visibleRequests);

      // Lógica de selección inicial (query params)
      const fromQuery = searchParams.get("conversationId");
      if (fromQuery) {
        const foundReq = visibleRequests.find(r => getId(r) === fromQuery);
        const foundConv = visibleConversations.find(c => getId(c) === fromQuery);
        
        if (foundReq) selectConversation(fromQuery, true);
        else if (foundConv) selectConversation(fromQuery, false);
      }
    } catch (err) {
      console.error("Error fetching chats:", err);
    }
  };

  useEffect(() => {
    if (currentUserId) fetchConversations();
  }, [currentUserId]);

  // --- SOCKETS ---
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
      const cid = conversationId || getId(conversation);
      if (!cid) return;

      // 🛑 FIX DUPLICADOS: Ignorar si soy el remitente
      const senderId = getId(message?.sender);
      if (senderId.toString() === currentUserId.toString()) {
        return; 
      }

      // Actualizar listas (Sidebar)
      const normalized = normalizeConversation(conversation, currentUserId);
      if (normalized) {
         setConversations(prev => {
            // Quitamos el viejo y ponemos el nuevo arriba
            const others = prev.filter(c => getId(c) !== cid);
            return [normalized, ...others];
         });
      }

      // Si es el chat abierto, agregar mensaje
      if (cid === selectedId && message) {
        setMessages(prev => {
           // Doble check por seguridad
           if (prev.some(m => getId(m) === getId(message))) return prev;
           return [...prev, message];
        });
        markAsRead(cid);
        scrollToBottom();
      }
    };

    window.addEventListener("vinci:chat-message", onChat);
    return () => window.removeEventListener("vinci:chat-message", onChat);
  }, [selectedId, currentUserId]);

  const fetchMessages = async (id) => {
    setLoadingMessages(true);
    try {
      const { data } = await axios.get(`/chats/${id}/messages`);
      setMessages(data?.messages || []);
    } catch(e) { 
      console.error(e); 
      setMessages([]); 
    } finally {
      setLoadingMessages(false);
      scrollToBottom();
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`/chats/${id}/read`);
      setConversations(prev => prev.map(c => getId(c) === id ? { ...c, unread: false } : c));
    } catch(e) {}
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      const { data } = await axios.post(`/chats/${selectedId}/messages`, {
        content: messageText.trim(),
      });

      if (data?.message) {
        setMessageText("");
        
        // 1. Agregar mensaje manualmente (Feedback instantáneo)
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();

        // 2. Actualizar sidebar (subir conversación)
        if (data.conversation) {
           const updatedConv = normalizeConversation(data.conversation, currentUserId);
           setConversations(prev => {
              const others = prev.filter(c => getId(c) !== getId(updatedConv));
              return [updatedConv, ...others];
           });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
    }, 100);
  };

  const selectConversation = (id, isReq) => {
    setSelectedId(id);
    setSelectedIsRequest(isReq);
    setSearchParams({ conversationId: id, tab: isReq ? "requests" : "chats" });
  };

  // --- RENDERS ---
  const renderItem = (c, isReq) => {
    const cid = getId(c);
    const parts = c.participants || [];
    const other = parts.find(p => getId(p) !== currentUserId) || c.participant;
    const name = other?.username || "Usuario"; // Fallback simple

    return (
      <button
        key={cid} // Aquí la clave es única gracias a uniqueList()
        onClick={() => selectConversation(cid, isReq)}
        className={`w-100 text-start p-2 border rounded mb-2 ${cid === selectedId ? "bg-primary text-white" : "bg-light"}`}
      >
        <div className="d-flex justify-content-between">
            <span className="fw-bold">{name}</span>
            {c.unread && <span className="badge bg-danger">!</span>}
        </div>
        <small className="text-truncate d-block" style={{opacity: 0.8}}>
            {c.lastMessage || "..."}
        </small>
      </button>
    );
  };

 const renderMessage = (msg) => {
     const isMine = getId(msg.sender) === currentUserId;
     const text = msg.content;
     
     // 1. Detección de Mensaje de Sistema / Match
     if (msg.context?.type === 'PROJECT_MATCH') {
         return (
             <div key={getId(msg)} className="d-flex justify-content-center my-4">
                 <div className="card border-0 shadow-sm bg-light" style={{maxWidth: '85%'}}>
                    <div className="card-body p-3 d-flex align-items-center gap-3">
                        {/* Icono */}
                        <div className="rounded-circle bg-success bg-opacity-10 text-success p-2 d-flex align-items-center justify-content-center" style={{width: 40, height: 40}}>
                             <i className="bi bi-briefcase-fill fs-5"></i>
                        </div>
                        
                        <div className="flex-grow-1">
                             <div className="small text-uppercase fw-bold text-success mb-0" style={{fontSize: '0.7rem', letterSpacing: '0.5px'}}>
                                Match Confirmado
                             </div>
                             <div className="fw-bold text-dark mb-1">
                                {msg.context.projectTitle || "Proyecto"}
                             </div>
                             {/* Texto del sistema */}
                             <div className="small text-muted border-start border-3 ps-2 fst-italic">
                                "{text}"
                             </div>
                        </div>
                    </div>
                 </div>
             </div>
         );
     }

     // 2. Mensaje Normal
     return (
        <div key={getId(msg)} className={`d-flex mb-2 ${isMine ? "justify-content-end" : "justify-content-start"}`}>
           <div 
             className={`p-2 rounded-3 px-3 ${isMine ? "bg-primary text-white" : "bg-white border"}`} 
             style={{maxWidth: "75%", boxShadow: isMine ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'}}
           >
              {text}
           </div>
        </div>
     );
  };

  const selectedConv = (selectedIsRequest ? requests : conversations).find(c => getId(c) === selectedId);

  return (
    <div className="container py-4" style={{ height: "85vh" }}>
      <div className="row h-100">
        {/* SIDEBAR */}
        <div className="col-md-4 h-100 overflow-auto border-end">
           <h5 className="mb-3">Mensajes</h5>
           {requests.length > 0 && (
             <div className="mb-3">
                <small className="text-muted">Solicitudes</small>
                {requests.map(r => renderItem(r, true))}
             </div>
           )}
           <div>
              {conversations.map(c => renderItem(c, false))}
              {conversations.length === 0 && <p className="text-muted">No hay chats activos.</p>}
           </div>
        </div>

        {/* CHAT AREA */}
        <div className="col-md-8 h-100 d-flex flex-column">
           {!selectedId ? (
              <div className="m-auto text-muted">Selecciona una conversación</div>
           ) : (
              <>
                <div className="p-2 border-bottom bg-light">
                   <strong>Chat con {selectedConv?.participants?.find(p => getId(p) !== currentUserId)?.username || "Usuario"}</strong>
                </div>
                
                <div className="flex-grow-1 overflow-auto p-3" ref={messagesRef}>
                   {loadingMessages ? "Cargando..." : messages.map(renderMessage)}
                </div>

                {!selectedIsRequest && (
                    <form onSubmit={handleSend} className="p-2 border-top d-flex gap-2">
                        <input 
                          className="form-control" 
                          value={messageText} 
                          onChange={e => setMessageText(e.target.value)}
                          placeholder="Escribe algo..."
                          disabled={sending}
                        />
                        <button className="btn btn-primary" disabled={sending}>Enviar</button>
                    </form>
                )}
              </>
           )}
        </div>
      </div>
    </div>
  );
}