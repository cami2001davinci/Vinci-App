import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axiosInstance";
import { useAuth } from "../context/AuthContext";

const getId = (entity) =>
  typeof entity === "object" && entity !== null
    ? entity._id || entity.id
    : entity;

// Nuevo: opcionalmente recibimos onPostUpdate para propagar cambios al padre
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

  const initialInterested = Array.isArray(post?.interestedUsers)
    ? post.interestedUsers.some(
        (id) => getId(id)?.toString() === currentUserId?.toString()
      )
    : false;

  const [interestStatus, setInterestStatus] = useState(
    initialInterested ? "pending" : null
  );
  const [interestedCount, setInterestedCount] = useState(
    Array.isArray(post?.interestedUsers) ? post.interestedUsers.length : 0
  );
  // Nuevo: estado local del post para cerrar equipo y mostrar seleccionados
  const [collabStatus, setCollabStatus] = useState(
    post?.collabStatus || "open"
  );
  const [selectedCollaborators, setSelectedCollaborators] = useState(
    Array.isArray(post?.selectedCollaborators) ? post.selectedCollaborators : []
  );
  // NEW: selección manual de colaboradores aceptados
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  const [listOpen, setListOpen] = useState(false);
  const [interestedUsers, setInterestedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState("");
  const interested =
    interestStatus === "pending" || interestStatus === "accepted";
  const sentRequest = interestStatus === "pending";
  const isCollabClosed = collabStatus === "team_chosen";
  const collaboratorNames = (selectedCollaborators || []).map((u) => u?.username).filter(Boolean);

  useEffect(() => {
    setCollabStatus(post?.collabStatus || "open");
    setSelectedCollaborators(
      Array.isArray(post?.selectedCollaborators) ? post.selectedCollaborators : []
    );
  }, [post?.collabStatus, post?.selectedCollaborators]);

  useEffect(() => {
    if (!postId || !isCollabPost) return;
    fetchInterested();
  }, [postId, isCollabPost, isAuthor, currentUserId]);

  useEffect(() => {
    if (!postId || !isCollabPost) return;

    const shouldHandle = (detail = {}) => {
      const targetPostId =
        detail.postId ||
        detail?.conversation?.post?._id ||
        detail?.conversation?.post ||
        detail?.post?.id ||
        detail?.post?._id;
      return targetPostId && targetPostId.toString() === postId.toString();
    };

    const handleRealtimeInterest = (e) => {
      if (!shouldHandle(e.detail || {})) return;
      fetchInterested();
    };

    const handlePostUpdated = (e) => {
      const payload = e.detail || {};
      if (!payload?.postId || payload.postId.toString() !== postId.toString()) {
        return;
      }
      if (payload.post) {
        setCollabStatus(payload.post.collabStatus || "open");
        setSelectedCollaborators(
          Array.isArray(payload.post.selectedCollaborators)
            ? payload.post.selectedCollaborators
            : []
        );
        if (Array.isArray(payload.post.interestedUsers)) {
          setInterestedCount(payload.post.interestedUsers.length);
        }
      }
    };

    window.addEventListener("vinci:collab-request", handleRealtimeInterest);
    window.addEventListener("vinci:project-match", handleRealtimeInterest);
    window.addEventListener("vinci:collab-ignored", handleRealtimeInterest);
    window.addEventListener("vinci:post-updated", handlePostUpdated);

    return () => {
      window.removeEventListener("vinci:collab-request", handleRealtimeInterest);
      window.removeEventListener("vinci:project-match", handleRealtimeInterest);
      window.removeEventListener("vinci:collab-ignored", handleRealtimeInterest);
      window.removeEventListener("vinci:post-updated", handlePostUpdated);
    };
  }, [postId, isCollabPost]);

  const fetchInterested = async () => {
    try {
      const { data } = await axios.get(`/posts/${postId}/interested`);
      const myInterest = data?.myInterest || data?.interest;
      // Ajuste: el contador se alimenta solo del valor real devuelto por el backend
      if (typeof data?.count === "number") {
        setInterestedCount(data.count);
      }
      setInterestStatus(myInterest?.status || null);
      setConversationId(myInterest?.conversation || null);

      if (Array.isArray(data?.interests)) {
        setInterestedUsers(data.interests);
        // por defecto seleccionamos solo los aceptados mientras este abierto
        if (!isCollabClosed) {
          const acceptedIds = data.interests
            .filter((i) => (i?.status || "").toLowerCase() === "accepted")
            .map((i) => getId(i.user || i))
            .filter(Boolean);
          setSelectedUserIds(acceptedIds);
        } else if (Array.isArray(data?.post?.selectedCollaborators)) {
          setSelectedUserIds(
            data.post.selectedCollaborators
              .map((u) => getId(u))
              .filter(Boolean)
          );
        }
      } else if (Array.isArray(data?.interested)) {
        const mapped = data.interested.map((user) => ({
          user,
          status: "pending",
          conversation: null,
        }));
        setInterestedUsers(mapped);
        setSelectedUserIds([]);
      } else {
        setInterestedUsers([]);
        setSelectedUserIds([]);
      }
    } catch (err) {
      console.error("Error cargando interesados:", err);
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
      const nextStatus = data?.interest?.status || null;
      setInterestStatus(nextStatus);
      if (data?.interest?.conversation) {
        setConversationId(data.interest.conversation);
      }
      if (typeof data?.count === "number") {
        setInterestedCount(data.count);
      }
      if (isAuthor) {
        fetchInterested();
      }
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

  // Ajuste: abre el chat correcto segun el interes (post + owner + interesado)
  const openInterestChat = (interest) => {
    const convoId = interest?.conversation || conversationId;
    const status = interest?.status || interestStatus;
    if (convoId) {
      const tab = status === "pending" ? "requests" : "chats";
      navigate(`/chats?conversationId=${convoId}&tab=${tab}`);
      return;
    }
    const target = getId(interest?.user || interest);
    if (target) {
      openChatDirect(target);
    } else {
      navigate("/chats");
    }
  };

  const acceptedInterests = interestedUsers.filter(
    (i) => (i?.status || "").toLowerCase() === "accepted"
  );

  const toggleSelectedUser = (userId) => {
    if (!userId || isCollabClosed) return;
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Nuevo: confirma el equipo con los usuarios aceptados
  const handleFinalizeTeam = async () => {
    if (!postId || !selectedUserIds.length) return;
    setFinalizing(true);
    setError("");
    try {
      const { data } = await axios.post(
        `/posts/${postId}/collab/finalize-team`,
        { selectedUserIds }
      );
      const updatedPost = data?.post;
      setCollabStatus(updatedPost?.collabStatus || "team_chosen");
      setSelectedCollaborators(updatedPost?.selectedCollaborators || []);
      onPostUpdate?.(updatedPost || post);
      setSelectedUserIds(
        (updatedPost?.selectedCollaborators || [])
          .map((u) => getId(u))
          .filter(Boolean)
      );
      // Bloqueamos mas solicitudes y cerramos la lista para evitar reenvios
      setListOpen(false);
      fetchInterested();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "No se pudo confirmar el equipo. Intenta de nuevo.";
      setError(msg);
    } finally {
      setFinalizing(false);
    }
  };

  if (!isCollabPost) return null;

  return (
    <div className="mt-2">
      {error && <div className="text-danger small mb-1">{error}</div>}
      {isCollabClosed && collaboratorNames.length > 0 && (
        <div className="small text-success mb-2">
          <strong>Trabajando con:</strong>{" "}
          {collaboratorNames.join(" · ")}
        </div>
      )}

      {!isAuthor ? (
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <button
            className={`btn btn-sm ${
              sentRequest || interested ? "btn-outline-success" : "btn-primary"
            }`}
            onClick={toggleInterest}
            disabled={loading || sentRequest || isCollabClosed}
          >
            {isCollabClosed
              ? "Equipo cerrado"
              : sentRequest || interested
              ? "Solicitud enviada"
              : "Quiero colaborar"}
          </button>
          <span className="text-muted small">
            {interestedCount} interesados
          </span>
        </div>
      ) : (
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
                >
                  {finalizing ? "Confirmando..." : "Confirmar equipo"}
                </button>
              )}
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setListOpen((v) => !v)}
              >
                {listOpen ? "Cerrar" : "Ver interesados"}
              </button>
            </div>
          </div>

          {listOpen && (
            <div className="mt-2">
              {interestedUsers.length === 0 ? (
                <p className="text-muted small m-0">
                  Todavia no hay interesados.
                </p>
              ) : (
                interestedUsers.map((interest) => {
                  const userItem = interest?.user || interest;
                  const status = interest?.status || "pending";
                  const statusLabel =
                    status === "accepted"
                      ? "Aceptado"
                      : status === "rejected"
                      ? "Rechazado"
                      : "Pendiente";
                  const badgeClass =
                    status === "accepted"
                      ? "bg-success"
                      : status === "rejected"
                      ? "bg-secondary"
                      : "bg-warning text-dark";
                  const avatar = userItem?.profilePicture
                    ? `${
                        import.meta.env.VITE_SERVER_URL ||
                        "http://localhost:3000"
                      }${userItem.profilePicture}`
                    : null;
                  return (
                    <div
                      key={interest?._id || getId(userItem)}
                      className="d-flex align-items-center justify-content-between border-bottom py-1"
                    >
                      <div className="d-flex align-items-center gap-2">
                        {!isCollabClosed && status === "accepted" && (
                          <input
                            type="checkbox"
                            className="form-check-input me-2"
                            checked={selectedUserIds.includes(getId(userItem))}
                            onChange={() => toggleSelectedUser(getId(userItem))}
                          />
                        )}
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={userItem?.username}
                            className="rounded-circle"
                            style={{ width: 32, height: 32, objectFit: "cover" }}
                          />
                        ) : null}
                        <div className="d-flex align-items-center gap-2">
                          <span>@{userItem?.username || "Usuario"}</span>
                          <span className={`badge ${badgeClass}`}>{statusLabel}</span>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => openInterestChat(interest)}
                          disabled={loading}
                        >
                          Abrir chat
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
