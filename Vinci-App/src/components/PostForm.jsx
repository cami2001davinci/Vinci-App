// export default PostForm;
import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axiosInstance";

const PostForm = ({ onNewPost }) => {
  const { user, refreshUserProfile } = useAuth();
  const { slug } = useParams(); // carrera tomada desde /degrees/:slug

  const [content, setContent] = useState("");
  const [category, setCategory] = useState("comunidad");
  const [error, setError] = useState("");
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [docFiles, setDocFiles] = useState([]);

  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

  useEffect(() => {
    refreshUserProfile();
  }, []);

  const maxFiles = 5;
  const maxFileSize = 2 * 1024 * 1024; // 2MB

  const handleImageChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length + imageFiles.length > maxFiles) {
      setError(`Solo se pueden subir hasta ${maxFiles} imágenes`);
      return;
    }
    for (let file of selected) {
      if (!file.type.startsWith("image/")) {
        setError("Solo se permiten imágenes");
        return;
      }
      if (file.size > maxFileSize) {
        setError("Cada imagen debe pesar menos de 2MB");
        return;
      }
    }
    setError("");
    setImageFiles((prev) => [...prev, ...selected]);
    const newPreviews = selected.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleDocChange = (e) => {
    const selected = Array.from(e.target.files);
    for (let file of selected) {
      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Solo se permiten documentos PDF o Word");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Cada documento debe pesar menos de 5MB");
        return;
      }
    }
    setError("");
    setDocFiles((prev) => [...prev, ...selected]);
  };

  const removeImage = (index) => {
    setImageFiles((files) => files.filter((_, i) => i !== index));
    setImagePreviews((previews) => previews.filter((_, i) => i !== index));
  };

  const removeDoc = (index) => {
    setDocFiles((files) => files.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!slug) {
      setError("No hay carrera activa en esta página");
      return;
    }
    if (!content.trim()) {
      setError("Escribe algo antes de publicar");
      return;
    }

    const formData = new FormData();
    formData.append("content", content.trim());
    formData.append("category", category);
    formData.append("degreeSlug", slug); // 👈 clave: mandamos el slug
    imageFiles.forEach((file) => formData.append("files", file));
    docFiles.forEach((file) => formData.append("files", file));

    try {
      const res = await axios.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // notificar a quien nos pasó el callback
      onNewPost?.(res.data);

      // 👇 NOTIFICAR A TODA LA APP (Home incluido) — AHORA SÍ, DENTRO DEL try
      // 1) Evento local (misma pestaña)
      window.dispatchEvent(
        new CustomEvent("vinci:post:created", { detail: res.data })
      );

      // 2) Broadcast a otras pestañas/ventanas
      try {
        const bc = new BroadcastChannel("vinci-posts");
        bc.postMessage({ type: "created", payload: res.data });
        bc.close();
      } catch (_) {}

      // 3) Fallback por storage (por si el navegador no soporta BroadcastChannel)
      try {
        localStorage.setItem(
          "vinci:newPost",
          JSON.stringify({ ts: Date.now(), post: res.data })
        );
      } catch (_) {}

      // reset
      setContent("");
      setCategory("comunidad");
      setImageFiles([]);
      setImagePreviews([]);
      setDocFiles([]);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Error al publicar");
    }
  };

  return (
    <div className="card mb-4 p-3 position-relative">
      <div className="d-flex align-items-center mb-2">
        <img
          src={
            user?.profilePicture
              ? `${baseUrl}${user.profilePicture}`
              : "/default-avatar.png"
          }
          alt="Usuario"
          className="rounded-circle me-2"
          width="40"
          height="40"
          style={{ objectFit: "cover" }}
        />
        <span className="text-muted">¿Qué está pasando?</span>
      </div>

      {error && <p className="text-danger">{error}</p>}

      <form onSubmit={handleSubmit}>
        <textarea
          className="form-control mb-2"
          rows="3"
          placeholder="Escribe tu post..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        ></textarea>

        <input
          type="file"
          accept="image/*"
          multiple
          ref={imageInputRef}
          style={{ display: "none" }}
          onChange={handleImageChange}
        />

        <input
          type="file"
          accept=".pdf,.doc,.docx"
          multiple
          ref={docInputRef}
          style={{ display: "none" }}
          onChange={handleDocChange}
        />

        {imagePreviews.length > 0 && (
          <div className="mb-3 d-flex gap-2 flex-wrap position-relative">
            {imagePreviews.map((src, idx) => (
              <div
                key={idx}
                style={{ position: "relative", display: "inline-block" }}
              >
                <img
                  src={src}
                  alt={`preview-${idx}`}
                  className="rounded"
                  style={{
                    width: "80px",
                    height: "80px",
                    objectFit: "cover",
                    border: "1px solid #ccc",
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  style={{
                    position: "absolute",
                    top: "-8px",
                    right: "-8px",
                    background: "red",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    fontSize: "12px",
                    cursor: "pointer",
                    lineHeight: "18px",
                    textAlign: "center",
                  }}
                  title="Eliminar imagen"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {docFiles.length > 0 && (
          <div className="mb-3">
            <strong>Documentos para subir:</strong>
            <ul>
              {docFiles.map((file, idx) => (
                <li
                  key={idx}
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  {file.name}
                  <button
                    type="button"
                    onClick={() => removeDoc(idx)}
                    style={{
                      background: "red",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "0 6px",
                      cursor: "pointer",
                    }}
                    title="Eliminar documento"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="d-flex justify-content-end align-items-center gap-2">
          {/* SOLO categorías (las nuevas claves) */}
          <select
            className="form-select w-auto"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="comunidad">Comunidad</option>
            <option value="colaboradores">Colaboradores</option>
            <option value="ayuda">Ayuda</option>
            <option value="feedback">Feedback</option>
            <option value="ideas">Ideas</option>
          </select>

          <button type="submit" className="btn btn-primary">
            Postear
          </button>
        </div>

        <div className="d-flex gap-3 mt-3 text-primary fs-5 align-items-center">
          <i
            className="bi bi-image"
            style={{ cursor: "pointer" }}
            title="Subir imágenes"
            onClick={() => imageInputRef.current?.click()}
          ></i>

          <i
            className="bi bi-file-earmark-text"
            style={{ cursor: "pointer" }}
            title="Subir documentos"
            onClick={() => docInputRef.current?.click()}
          ></i>

          <i className="bi bi-emoji-smile"></i>
          <i className="bi bi-clock"></i>
          <i className="bi bi-geo-alt"></i>
        </div>
      </form>
    </div>
  );
};

export default PostForm;
