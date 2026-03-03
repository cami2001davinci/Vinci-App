import { useState, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "../api/axiosInstance";
import UserAvatar from "./UserAvatar"; // 👈 TU COMPONENTE MAESTRO
import "../styles/PostForm.css";

const PostForm = ({ onNewPost }) => {
  const { user, refreshUserProfile } = useAuth();
  const { slug } = useParams(); 

  const [content, setContent] = useState("");
  const [category, setCategory] = useState("comunidad");
  
  // Estados para Colaboradores y Links
  const [title, setTitle] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [docFiles, setDocFiles] = useState([]);

  const imageInputRef = useRef(null);
  const docInputRef = useRef(null);

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

    if (category === "colaboradores" && (!title.trim() || title.trim().length < 3)) {
      setError("Los proyectos colaborativos requieren un Título descriptivo (mín. 3 letras).");
      return;
    }

    let degreeDataToSend = null;
    let degreeKey = null;

    if (slug) {
        degreeDataToSend = slug;
        degreeKey = "degreeSlug";
    } else if (user?.degrees && user.degrees.length > 0) {
        degreeDataToSend = user.degrees[0]._id || user.degrees[0];
        degreeKey = "degreeId"; 
    } else {
        setError("Necesitas estar inscrito en una carrera para publicar.");
        return;
    }

    const formData = new FormData();
    formData.append("title", category === "colaboradores" ? title.trim() : "Publicación"); 
    formData.append("content", content.trim());
    formData.append("category", category);
    
    if (degreeDataToSend && degreeKey) {
        formData.append(degreeKey, degreeDataToSend);
    }

    if (linkUrl.trim()) {
      const linksArray = [{ url: linkUrl.trim() }];
      formData.append("links", JSON.stringify(linksArray));
    }
    
    imageFiles.forEach((file) => formData.append("files", file));
    docFiles.forEach((file) => formData.append("files", file));

    setSaving(true);
    setError(""); 

    try {
      const res = await axios.post("/posts", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onNewPost?.(res.data);
      window.dispatchEvent(
        new CustomEvent("vinci:post:created", { detail: res.data })
      );

      setContent("");
      setTitle("");
      setLinkUrl("");
      setShowLinkInput(false);
      setCategory("comunidad");
      setImageFiles([]);
      setImagePreviews([]);
      setDocFiles([]);
    } catch (err) {
      console.error("Error al postear:", err.response?.data || err.message);
      
      const responseData = err.response?.data;
      if (responseData) {
        if (responseData.errors && Array.isArray(responseData.errors)) {
          setError(responseData.errors[0]); 
        } else if (responseData.message) {
          setError(responseData.message);
        } else {
          setError("Error al publicar. Por favor, revisa los datos.");
        }
      } else {
        setError("No se pudo conectar con el servidor.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="post-form-card">
      <div className="pf-header">
        
        {/* 👇 LA MAGIA DEL COMPONENTE REUTILIZABLE */}
        <UserAvatar user={user} className="neo-post-card__avatar" />

        <div>
            <h6 className="pf-username">HOLA, {user?.firstName || 'USUARIO'}</h6>
            <span className="pf-prompt">
                {slug ? "Publicando en esta carrera" : `Publicando en ${user?.degrees?.[0]?.name || "tu muro"}`}
            </span>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', border: '2px solid #000', borderRadius: '8px', padding: '10px', marginBottom: '1rem', fontWeight: 'bold', color: '#b91c1c', boxShadow: '2px 2px 0px #000' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        
        {category === "colaboradores" && (
          <input 
            type="text" 
            className="pf-textarea" 
            placeholder="Título de tu proyecto colaborativo..." 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ fontWeight: '800', textTransform: 'uppercase' }}
          />
        )}

        <textarea
          className="pf-textarea"
          rows="3"
          placeholder={category === "colaboradores" ? "Describe qué buscas, tecnologías, y objetivos de tu proyecto..." : "Comparte tu idea, proyecto o duda..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        ></textarea>

        {showLinkInput && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
             <input 
               type="url" 
               className="pf-textarea" 
               placeholder="Enlace a tu GitHub o Portfolio..." 
               value={linkUrl}
               onChange={(e) => setLinkUrl(e.target.value)}
               style={{ marginBottom: 0 }}
             />
             <button 
               type="button" 
               className="pf-submit-btn" 
               onClick={() => {setShowLinkInput(false); setLinkUrl("");}}
               style={{ backgroundColor: '#ef4444' }}
               title="Cancelar link"
             >
               <i className="bi bi-x-lg"></i>
             </button>
          </div>
        )}

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
              <i className="bi bi-image pf-icon-btn" onClick={() => imageInputRef.current?.click()} title="Subir imagen"></i>
              <i className="bi bi-paperclip pf-icon-btn" onClick={() => docInputRef.current?.click()} title="Adjuntar documento"></i>
              <i 
                className="bi bi-link-45deg pf-icon-btn" 
                onClick={() => setShowLinkInput(!showLinkInput)} 
                title="Adjuntar URL (GitHub/Portfolio)"
                style={{ color: showLinkInput ? '#000' : '' }}
              ></i>
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