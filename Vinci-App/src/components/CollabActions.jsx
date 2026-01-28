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

  // Buscar mi interés personal en el array
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
  
  const [selectedCollaborators, setSelectedCollaborators] = useState(
    Array.isArray(post?.selectedCollaborators) ? post.selectedCollaborators : []
  );

  // Selección manual para "Confirmar equipo" final
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  
  const [listOpen, setListOpen] = useState(false);
  const [interestedUsers, setInterestedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState("");

  const sentRequest = interestStatus === "pending";
  const isAccepted = interestStatus === "accepted";
  // Interesado si mandó solicitud o si ya fue aceptado/rechazado
  const interested = sentRequest || isAccepted || interestStatus === "rejected";

  const isCollabClosed = collabStatus === "team_chosen";
  const collaboratorNames = (selectedCollaborators || [])
    .map((u) => u?.username)
    .filter(Boolean);

  // Sincronizar estado local cuando el prop 'post' cambia (vía sockets en el padre)
  useEffect(() => {
    setCollabStatus(post?.collabStatus || "open");
    setSelectedCollaborators(
      Array.isArray(post?.selectedCollaborators)
        ? post.selectedCollaborators
        : []
    );
    
    // Si el post ya trae los interesados populados, usarlos directamente
    if (Array.isArray(post?.interestedUsers)) {
        setInterestedUsers(post.interestedUsers);
        setInterestedCount(post.interestedUsers.length);
        
        // Actualizar mi estado personal basado en la nueva data
        const mine = post.interestedUsers.find(
            (i) => getId(i.user || i)?.toString() === currentUserId?.toString()
        );
        setInterestStatus(mine?.status || null);
    }

  }, [post, currentUserId]);

  // Manejo de sockets para refrescar la lista si entra una solicitud nueva
  useEffect(() => {
    if (!postId || !isCollabPost) return;

    const shouldHandle = (detail = {}) => {
      const targetPostId =
        detail.postId ||
        detail?.post?.id ||
        detail?.post?._id;
      return targetPostId && targetPostId.toString() === postId.toString();
    };

    const handleRealtimeUpdate = (e) => {
      if (!shouldHandle(e.detail || {})) return;
      // Si el evento trae el post completo, el useEffect de arriba actualizará todo.
      // Si no, podríamos llamar a fetchInterested() aquí como fallback.
      if (e.detail?.post) {
        onPostUpdate?.(e.detail.post);
      } else {
        fetchInterested();
      }
    };

    window.addEventListener("vinci:collab-request", handleRealtimeUpdate);
    window.addEventListener("vinci:post-updated", handleRealtimeUpdate);

    return () => {
      window.removeEventListener("vinci:collab-request", handleRealtimeUpdate);
      window.removeEventListener("vinci:post-updated", handleRealtimeUpdate);
    };
  }, [postId, isCollabPost, onPostUpdate]);

  const fetchInterested = async () => {
    try {
      // Nota: Con la nueva arquitectura, el post ya debería traer esto.
      // Mantenemos esto como backup o para obtener datos frescos.
      const { data } = await axios.get(`/posts/${postId}`);
      if (data) {
         onPostUpdate?.(data); // Actualizamos al padre para que baje la info por props
      }
    } catch (err) {
      console.error("Error cargando post actualizado:", err);
    }
  };

  // ✅ NUEVA FUNCIÓN: Aceptar o Rechazar individualmente
  const handleManagement = async (targetUserId, newStatus) => {
    if (!targetUserId) return;
    setError("");
    try {
      await axios.put(`/posts/${postId}/collab/${targetUserId}`, {
        status: newStatus,
      });
      // No necesitamos hacer nada manual aquí, el backend emitirá "post:updated"
      // y el socket actualizará la UI automáticamente.
    } catch (err) {
      console.error("Error gestionando colaborador:", err);
      const msg = err?.response?.data?.message || "Error al actualizar estado.";
      setError(msg);
    }
  };

  const toggleInterest = async () => {
    if (!postId) return;
    if (isCollabClosed) {
      setError("El equipo ya fue confirmado para este post.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.put(`/posts/${postId}/interes`);
      
      // La respuesta trae { interested: bool, myInterest: obj }
      const myInterest = data?.myInterest;
      setInterestStatus(myInterest?.status || null);
      setInterestedCount(data?.interestedCount || interestedCount);
      
      // Si soy el autor y me doy auto-like (raro pero posible para testing), recargamos
      if (isAuthor) fetchInterested();

    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "No se pudo actualizar tu interes en el proyecto.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openChatDirect = async (targetUserId) => {
    if (!targetUserId) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(`/chats/with/${targetUserId}`, {
        postId,
      });
      const conversationId = data?.conversation?._id || data?.conversation?.id;
      if (conversationId) {
        navigate(`/chats?conversationId=${conversationId}`);
      } else {
        navigate("/chats");
      }
    } catch (err) {
      console.error("Error al abrir chat:", err);
      const msg = err?.response?.data?.message || "No se pudo abrir el chat.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openInterestChat = (interest) => {
    const target = getId(interest?.user || interest);
    if (target) {
      openChatDirect(target);
    } else {
      navigate("/chats");
    }
  };

  // Filtrar aceptados para el botón de confirmar equipo
  const acceptedInterests = interestedUsers.filter(
    (i) => (i?.status || "").toLowerCase() === "accepted"
  );

  // Inicializar seleccionados para "Confirmar equipo" con los que ya están aceptados
  useEffect(() => {
    if(!isCollabClosed && acceptedInterests.length > 0) {
        // Por defecto, marcamos todos los aceptados para confirmar el equipo
        const ids = acceptedInterests.map(i => getId(i.user || i)).filter(Boolean);
        setSelectedUserIds(ids);
    }
  }, [interestedUsers.length, isCollabClosed]);


  const toggleSelectedUser = (userId) => {
    if (!userId || isCollabClosed) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleFinalizeTeam = async () => {
    if (!postId || !selectedUserIds.length) return;
    setFinalizing(true);
    setError("");
    try {
      const { data } = await axios.post(
        `/posts/${postId}/collab/finalize-team`,
        { selectedUserIds }
      );
      // El backend devuelve { ok: true, post: updatedPost }
      if (data?.post) {
          onPostUpdate?.(data.post);
      }
      setListOpen(false);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "No se pudo confirmar el equipo.";
      setError(msg);
    } finally {
      setFinalizing(false);
    }
  };

  if (!isCollabPost) return null;

  return (
    <div className="mt-2">
      {error && <div className="text-danger small mb-1">{error}</div>}
      
      {/* HEADER DE TRABAJANDO CON... */}
      {isCollabClosed && collaboratorNames.length > 0 && (
        <div className="small text-success mb-2">
          <strong>Trabajando con:</strong>{" "}
          {collaboratorNames.join(" · ")}
        </div>
      )}

      {/* VISTA PARA VISITANTES (NO AUTOR) */}
      {!isAuthor ? (
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <button
            className={`btn btn-sm ${
              interested ? "btn-outline-secondary" : "btn-primary"
            }`}
            onClick={toggleInterest}
            disabled={loading || isCollabClosed || (interested && !sentRequest)}
          >
            {isCollabClosed
              ? "Convocatoria cerrada"
              : isAccepted
              ? "¡Fuiste aceptado!"
              : interestStatus === "rejected"
              ? "Solicitud rechazada"
              : sentRequest
              ? "Cancelar solicitud"
              : "Quiero colaborar"}
          </button>
          <span className="text-muted small">
            {interestedCount} interesados
          </span>
        </div>
      ) : (
        /* VISTA PARA EL AUTOR */
        <div className="border rounded p-2 bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Interesados:</strong> {interestedCount}
              {isCollabClosed && (
                <span className="badge bg-success ms-2">Equipo cerrado</span>
              )}
            </div>
            <div className="d-flex gap-2">
              {!isCollabClosed && acceptedInterests.length > 0 && (
                <button
                  className="btn btn-sm btn-success"
                  onClick={handleFinalizeTeam}
                  disabled={finalizing || selectedUserIds.length === 0}
                  title="Cierra la convocatoria y selecciona el equipo final"
                >
                  {finalizing ? "Confirmando..." : "Confirmar equipo final"}
                </button>
              )}
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setListOpen((v) => !v)}
              >
                {listOpen ? "Ocultar" : "Ver lista"}
              </button>
            </div>
          </div>

          {listOpen && (
            <div className="mt-2">
              {interestedUsers.length === 0 ? (
                <p className="text-muted small m-0">
                  Todavía no hay interesados.
                </p>
              ) : (
                interestedUsers.map((interest) => {
                  const userItem = interest?.user || interest;
                  const userId = getId(userItem);
                  const status = interest?.status || "pending";
                  
                  let statusLabel = "Pendiente";
                  let badgeClass = "bg-warning text-dark";

                  if (status === "accepted") {
                    statusLabel = "Aceptado";
                    badgeClass = "bg-success";
                  } else if (status === "rejected") {
                    statusLabel = "Rechazado";
                    badgeClass = "bg-secondary";
                  }

                  const avatar = userItem?.profilePicture
                    ? `${
                        import.meta.env.VITE_SERVER_URL ||
                        "http://localhost:3000"
                      }${userItem.profilePicture}`
                    : null;

                  return (
                    <div
                      key={interest?._id || userId}
                      className="d-flex align-items-center justify-content-between border-bottom py-2"
                    >
                      <div className="d-flex align-items-center gap-2">
                        {/* Checkbox solo visible si estamos confirmando equipo final y el usuario ya fue aceptado */}
                        {!isCollabClosed && status === "accepted" && (
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedUserIds.includes(userId)}
                            onChange={() => toggleSelectedUser(userId)}
                            title="Incluir en equipo final"
                          />
                        )}
                        
                        {avatar && (
                          <img
                            src={avatar}
                            alt={userItem?.username}
                            className="rounded-circle"
                            style={{ width: 32, height: 32, objectFit: "cover" }}
                          />
                        )}
                        
                        <div className="d-flex flex-column" style={{lineHeight: '1.1'}}>
                          <span className="fw-bold small">@{userItem?.username || "Usuario"}</span>
                          <span className={`badge ${badgeClass} align-self-start`} style={{fontSize: '0.65rem'}}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>

                      <div className="d-flex gap-1">
                        {/* BOTONES DE ACCIÓN PARA EL AUTOR (Aceptar/Rechazar) */}
                        {!isCollabClosed && status === "pending" && (
                          <>
                             <button
                                className="btn btn-sm btn-outline-success px-2 py-0"
                                onClick={() => handleManagement(userId, "accepted")}
                                title="Aceptar colaborador"
                              >
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger px-2 py-0"
                                onClick={() => handleManagement(userId, "rejected")}
                                title="Rechazar solicitud"
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                          </>
                        )}
                        
                        <button
                          className="btn btn-sm btn-link text-secondary"
                          onClick={() => openInterestChat(interest)}
                          disabled={loading}
                          title="Enviar mensaje"
                        >
                          <i className="bi bi-chat-dots"></i>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}