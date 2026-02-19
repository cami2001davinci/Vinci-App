import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axiosInstance";
import "../styles/PostForm.css";

const PostForm = ({ onNewPost }) => {
  const { user, refreshUserProfile } = useAuth();
  const { slug } = useParams(); // Puede ser undefined si estamos en Home

  const [content, setContent] = useState("");
  const [category, setCategory] = useState("comunidad");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
  const maxFileSize = 2 * 1024 * 1024;

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

    if (!content.trim()) {
      setError("Escribe algo antes de publicar");
      return;
    }

    // --- LÓGICA DE SELECCIÓN DE CARRERA CORREGIDA ---
    let degreeDataToSend = null;
    let degreeKey = null;

    if (slug) {
        // Estamos en la página de una carrera específica
        degreeDataToSend = slug;
        degreeKey = "degreeSlug";
    } else if (user?.degrees && user.degrees.length > 0) {
        // Estamos en Home: Usamos el ID de la primera carrera del usuario
        degreeDataToSend = user.degrees[0]._id || user.degrees[0];
        // 👇 AQUÍ ESTABA EL ERROR: Cambiado de "degree" a "degreeId"
        degreeKey = "degreeId"; 
    } else {
        setError("Necesitas estar inscrito en una carrera para publicar.");
        return;
    }
    // --------------------------------------------------------

    const formData = new FormData();
    // Título automático porque el modelo lo requiere (required: true)
    formData.append("title", "Publicación"); 
    formData.append("content", content.trim());
    formData.append("category", category);
    
    // Enviamos la clave correcta (degreeSlug o degreeId)
    if (degreeDataToSend && degreeKey) {
        formData.append(degreeKey, degreeDataToSend);
    }
    
    imageFiles.forEach((file) => formData.append("files", file));
    docFiles.forEach((file) => formData.append("files", file));

    setSaving(true);

    try {
      const res = await axios.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onNewPost?.(res.data);
      window.dispatchEvent(
        new CustomEvent("vinci:post:created", { detail: res.data })
      );

      setContent("");
      setCategory("comunidad");
      setImageFiles([]);
      setImagePreviews([]);
      setDocFiles([]);
      setError("");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Error al publicar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="post-form-card">
      <div className="pf-header">
        <img
          src={
            user?.profilePicture
              ? `${baseUrl}${user.profilePicture}`
              : "https://via.placeholder.com/50"
          }
          alt="Usuario"
          className="pf-avatar"
        />
        <div>
            <h6 className="pf-username">HOLA, {user?.firstName || 'Usuario'}</h6>
            <span className="pf-prompt">
                {slug ? "Publicando en esta carrera" : `Publicando en ${user?.degrees?.[0]?.name || "tu muro"}`}
            </span>
        </div>
      </div>

      {error && <div className="alert alert-danger border-2 border-dark mb-3">{error}</div>}

      <form onSubmit={handleSubmit}>
        <textarea
          className="pf-textarea"
          rows="3"
          placeholder="Comparte tu idea, proyecto o duda..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        ></textarea>

        <input type="file" accept="image/*" multiple ref={imageInputRef} style={{ display: "none" }} onChange={handleImageChange} />
        <input type="file" accept=".pdf,.doc,.docx" multiple ref={docInputRef} style={{ display: "none" }} onChange={handleDocChange} />

        {imagePreviews.length > 0 && (
          <div className="pf-previews">
            {imagePreviews.map((src, idx) => (
              <div key={idx} className="pf-preview-item">
                <img src={src} alt="preview" className="pf-preview-img" />
                <button type="button" onClick={() => removeImage(idx)} className="pf-remove-btn">×</button>
              </div>
            ))}
          </div>
        )}

        {docFiles.length > 0 && (
          <ul className="pf-doc-list">
            {docFiles.map((file, idx) => (
              <li key={idx} className="pf-doc-item">
                <i className="bi bi-file-earmark"></i> {file.name}
                <button type="button" onClick={() => removeDoc(idx)} className="pf-doc-remove">×</button>
              </li>
            ))}
          </ul>
        )}

        <div className="pf-actions">
           <div className="pf-icons">
              <i className="bi bi-image pf-icon-btn" onClick={() => imageInputRef.current?.click()}></i>
              <i className="bi bi-paperclip pf-icon-btn" onClick={() => docInputRef.current?.click()}></i>
           </div>

           <div className="pf-controls">
              <select className="pf-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="comunidad">Comunidad</option>
                <option value="colaboradores">Colaboradores</option>
                <option value="ayuda">Ayuda</option>
                <option value="feedback">Feedback</option>
                <option value="ideas">Ideas</option>
              </select>

              <button type="submit" className="pf-submit-btn" disabled={saving}>
                {saving ? "..." : "POSTEAR"}
              </button>
           </div>
        </div>
      </form>
    </div>
  );
};

export default PostForm;