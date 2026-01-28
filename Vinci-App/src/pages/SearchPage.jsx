// src/pages/SearchPage.jsx
import { useEffect, useState, useRef } from "react";
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

// Hook de Debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const q = searchParams.get("q") || "";
  const tab = searchParams.get("tab") || "destacados";

  const [inputValue, setInputValue] = useState(q);
  const debouncedQuery = useDebounce(inputValue, 500);

  // ✅ NUEVO: Estados para paginación
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [media, setMedia] = useState([]);

  // ✅ TRUCO DE MENTOR: Ref para detectar si cambió la búsqueda real
  // Esto evita que pidamos la página 2 de una búsqueda vieja por error
  const prevSearch = useRef({ q, tab });

  const withBaseUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `${baseUrl}${url}`;
  };

  // EFECTO 1: Sincronizar URL (Input -> URL)
  useEffect(() => {
    if (debouncedQuery !== q) {
      const newParams = { tab };
      if (debouncedQuery) newParams.q = debouncedQuery;
      setSearchParams(newParams);
      // ✅ Al cambiar la búsqueda, reseteamos la página a 1
      setPage(1); 
    }
  }, [debouncedQuery, tab, q, setSearchParams]);

  // ✅ EFECTO 2: Resetear Data si cambian q o tab (Búsqueda Nueva)
  useEffect(() => {
    if (prevSearch.current.q !== q || prevSearch.current.tab !== tab) {
      setPage(1);
      setPosts([]);
      setUsers([]);
      setMedia([]);
      setHasMore(true);
      prevSearch.current = { q, tab };
    }
  }, [q, tab]);

  // ✅ EFECTO 3: Cargar datos (Paginación y Búsqueda)
  useEffect(() => {
    if (!q.trim()) return;

    const fetchData = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        // Definimos límites según backend (20 para posts/users, 30 media)
        const limit = tab === "multimedia" ? 30 : 20;

        let newData = [];
        
        if (tab === "destacados" || tab === "recientes") {
          const { data } = await axios.get("/search/posts", {
            params: { q, tab, page, limit }, // ✅ Enviamos page y limit
          });
          newData = data;
          
          setPosts((prev) => (page === 1 ? data : [...prev, ...data]));

        } else if (tab === "personas") {
          const { data } = await axios.get("/search/users", {
            params: { q, limit, page },
          });
          newData = data;
          
          setUsers((prev) => (page === 1 ? data : [...prev, ...data]));

        } else if (tab === "multimedia") {
          const { data } = await axios.get("/search/media", {
            params: { q, limit, page },
          });
          newData = data;
          
          setMedia((prev) => (page === 1 ? data : [...prev, ...data]));
        }

        // ✅ Si llegaron menos items que el límite, es que no hay más páginas
        if (newData.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
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
  }, [q, tab, page]); // ✅ Dependencias clave: q, tab Y page

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
       setSearchParams({ q: inputValue, tab });
       setPage(1); // ✅ Reset manual por si acaso
    }
  };

  const handleTabChange = (key) => {
    setSearchParams({ q, tab: key });
    setPage(1); // ✅ Reset al cambiar tab
  };

  // ✅ Función para el botón "Ver más"
  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  return (
    <div className="container py-4">
      {/* Buscador */}
      <form onSubmit={handleSubmit} className="mb-3">
        <div className="input-group">
          <span className="input-group-text">
            <i className="bi bi-search" />
          </span>
          <input
            type="text"
            name="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
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

      {/* Info Resultados */}
      {q && (
        <p className="text-muted mb-2">
          Resultados para <strong>"{q}"</strong> · Sección{" "}
          <strong>
            {TABS.find((t) => t.key === tab)?.label || "Destacados"}
          </strong>
        </p>
      )}

      {errorMsg && <p className="text-danger">{errorMsg}</p>}

      {/* CONTENIDO */}
      {!errorMsg && q.trim() && (
        <>
          {/* POSTS */}
          {(tab === "destacados" || tab === "recientes") && (
            <>
              {posts.length > 0 ? (
                posts.map((p) => (
                  <div key={p._id} className="mb-3">
                    <PostCard post={p} />
                  </div>
                ))
              ) : (
                !loading && <p className="text-muted">No hay publicaciones.</p>
              )}
            </>
          )}

          {/* USUARIOS */}
          {tab === "personas" && (
            <>
              {users.length > 0 ? (
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
                            alt={u.username}
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
                !loading && <p className="text-muted">No hay personas.</p>
              )}
            </>
          )}

          {/* MULTIMEDIA */}
          {tab === "multimedia" && (
            <>
              {media.length > 0 ? (
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
                            alt={m.title}
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
                            {m.title || "Archivo"}
                          </small>
                          <a
                            href={withBaseUrl(m.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="small"
                          >
                            Ver
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !loading && <p className="text-muted">No hay archivos multimedia.</p>
              )}
            </>
          )}

          {/* ✅ BOTÓN CARGAR MÁS */}
          {loading && <p className="text-center my-3">Cargando...</p>}
          
          {!loading && hasMore && (posts.length > 0 || users.length > 0 || media.length > 0) && (
            <div className="text-center mt-4">
              <button 
                className="btn btn-outline-primary" 
                onClick={handleLoadMore}
              >
                Cargar más resultados
              </button>
            </div>
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