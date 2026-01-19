// src/pages/SearchPage.jsx
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import axios from "../api/axiosInstance";
import PostCard from "../components/PostCard";

const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

const TABS = [
  { key: "destacados", label: "Destacados" },
  { key: "recientes", label: "Más recientes" },
  { key: "personas", label: "Personas" },
  { key: "multimedia", label: "Multimedia" },
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || "";
  const tab = searchParams.get("tab") || "destacados";

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [media, setMedia] = useState([]);

  const withBaseUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `${baseUrl}${url}`;
  };

  // Cargar resultados según tab
  useEffect(() => {
    if (!q.trim()) {
      setPosts([]);
      setUsers([]);
      setMedia([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        if (tab === "destacados" || tab === "recientes") {
          const { data } = await axios.get("/search/posts", {
            params: { q, tab },
          });
          setPosts(data);
        } else if (tab === "personas") {
          const { data } = await axios.get("/search/users", {
            params: { q },
          });
          setUsers(data);
        } else if (tab === "multimedia") {
          const { data } = await axios.get("/search/media", {
            params: { q },
          });
          setMedia(data);
        }
      } catch (err) {
        console.error("Error en SearchPage:", err);
        setErrorMsg(
          err.response?.data?.message || "No se pudieron cargar los resultados."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [q, tab]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const value = e.target.elements.search.value.trim();
    if (!value) return;
    setSearchParams({ q: value, tab: "destacados" });
  };

  const handleTabChange = (key) => {
    setSearchParams({ q, tab: key });
  };

  return (
    <div className="container py-4">
      {/* Buscador superior */}
      <form onSubmit={handleSubmit} className="mb-3">
        <div className="input-group">
          <span className="input-group-text">
            <i className="bi bi-search" />
          </span>
          <input
            type="text"
            name="search"
            defaultValue={q}
            placeholder="Prueba a buscar personas, carreras o palabras clave"
            className="form-control"
          />
          <button className="btn btn-primary" type="submit">
            Buscar
          </button>
        </div>
      </form>

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        {TABS.map((t) => (
          <li className="nav-item" key={t.key}>
            <button
              type="button"
              className={`nav-link ${tab === t.key ? "active" : ""}`}
              onClick={() => handleTabChange(t.key)}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Estado */}
      {q && (
        <p className="text-muted mb-2">
          Resultados para <strong>"{q}"</strong> · Sección{" "}
          <strong>
            {TABS.find((t) => t.key === tab)?.label || "Destacados"}
          </strong>
        </p>
      )}

      {loading && <p>Cargando resultados…</p>}
      {errorMsg && <p className="text-danger">{errorMsg}</p>}

      {/* CONTENIDO POR TAB */}
      {!loading && !errorMsg && q.trim() && (
        <>
          {(tab === "destacados" || tab === "recientes") &&
            (posts.length ? (
              posts.map((p) => {
                const likesCount = Array.isArray(p.likedBy)
                  ? p.likedBy.length
                  : typeof p.likesCount === "number"
                  ? p.likesCount
                  : 0;

                const commentsCount = Array.isArray(p.comments)
                  ? p.comments.length
                  : typeof p.commentsCount === "number"
                  ? p.commentsCount
                  : 0;

                return (
                  <div key={p._id} className="mb-3">
                    {/* Tarjeta normal del post */}
                    <PostCard post={p} />
                  </div>
                );
              })
            ) : (
              <p className="text-muted">
                No hay publicaciones para esta búsqueda.
              </p>
            ))}

          {tab === "personas" && (
            <>
              {users.length ? (
                <div className="list-group">
                  {users.map((u) => {
                    const avatarUrl = withBaseUrl(u.profilePicture);
                    return (
                      <Link
                        key={u._id}
                        to={`/profile/${u._id}`}
                        className="list-group-item list-group-item-action d-flex align-items-center gap-3"
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={u.username || "usuario"}
                            className="rounded-circle border"
                            style={{ width: 56, height: 56, objectFit: "cover" }}
                          />
                        ) : (
                          <div
                            className="rounded-circle bg-light border d-flex align-items-center justify-content-center"
                            style={{ width: 56, height: 56 }}
                          >
                            <i className="bi bi-person fs-4 text-muted" />
                          </div>
                        )}

                        <div className="flex-grow-1">
                          <div className="fw-semibold">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="text-muted small">@{u.username}</div>
                          {Array.isArray(u.degrees) && u.degrees.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mt-1">
                              {u.degrees.map((d) => (
                                <span
                                  key={d._id || d.slug || d}
                                  className="badge bg-light text-dark border"
                                >
                                  {d.name || d.slug || "Carrera"}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted">
                  No hay personas que coincidan con esta busqueda.
                </p>
              )}
            </>
          )}

          {tab === "multimedia" && (
            <>
              {media.length ? (
                <div className="row g-3">
                  {media.map((m, idx) => (
                    <div
                      className="col-6 col-md-4 col-lg-3"
                      key={`${m.postId}-${idx}`}
                    >
                      <div className="card h-100">
                        {m.type === "image" ? (
                          <img
                            src={withBaseUrl(m.url)}
                            alt={m.title || "archivo"}
                            className="card-img-top"
                            style={{ objectFit: "cover", height: 140 }}
                          />
                        ) : (
                          <div className="card-body d-flex flex-column justify-content-center align-items-center text-center">
                            <i
                              className={`bi ${
                                m.type === "pdf"
                                  ? "bi-file-earmark-pdf"
                                  : "bi-file-earmark-text"
                              }`}
                              style={{ fontSize: "2rem" }}
                            />
                            <small className="mt-2 text-truncate w-100">
                              {m.url.split("/").pop()}
                            </small>
                          </div>
                        )}
                        <div className="card-footer">
                          <small className="d-block text-truncate">
                            {m.title || "Publicación"}
                          </small>
                          <a
                            href={withBaseUrl(m.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="small"
                          >
                            Ver archivo
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted">
                  No hay archivos multimedia que coincidan con esta búsqueda.
                </p>
              )}
            </>
          )}
        </>
      )}

      {!q.trim() && !loading && (
        <p className="text-muted">
          Escribe algo en el buscador de arriba para empezar.
        </p>
      )}
    </div>
  );
}
