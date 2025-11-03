import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from '../api/axiosInstance';

// Extrae primera URL http/https de un texto
function extractFirstHttpUrl(str = '') {
  const r = /(https?:\/\/[^\s"'<>()]+)\b/i;
  const m = String(str).match(r);
  return m ? m[1] : '';
}

export default function DegreeComposer({ onNewPost }) {
  const { slug } = useParams();

  // collapsed
  const [expanded, setExpanded] = useState(false);

  // Paso 1
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(''); 
  const [links, setLinks] = useState([]);
  const [linkInput, setLinkInput] = useState('');

  // Adjuntos opcionales (imágenes/pdf)
  const [imageFiles, setImageFiles] = useState([]);
  const [docFiles, setDocFiles] = useState([]);
  const imgRef = useRef(null);
  const docRef = useRef(null);

  // Paso 2
  const [category, setCategory] = useState('comunidad');

  // UI
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  const addLink = async () => {
    const raw = linkInput.trim();
    const candidate = extractFirstHttpUrl(raw);
    if (!candidate) return setError('Pegá un link válido que empiece con http:// o https://');

    let cleanUrl = candidate;
    try { cleanUrl = new URL(candidate).toString(); }
    catch { return setError('El link no es válido'); }

    try {
      const res = await axios.get('/links/preview', { params: { url: cleanUrl } });
      setLinks(prev => [res.data, ...prev].slice(0, 3));
      setLinkInput('');
      setError('');
    } catch {
      setLinks(prev => [{ url: cleanUrl, provider: '', preview: {} }, ...prev].slice(0, 3));
      setLinkInput('');
      setError('No pudimos obtener la vista previa, pero igual agregamos el link.');
    }
  };

  const removeLink = (i) => setLinks(prev => prev.filter((_, idx) => idx !== i));

  const next = () => {
    if (!title.trim()) return setError('Poné un título 😊');
    if (!content.trim() || content.trim().length < 10) return setError('Escribí una descripción (mín. 10)');
    setError('');
    setStep(2);
  };

  const publish = async () => {
    if (!slug) return setError('No hay carrera activa');

    const safeLinks = Array.isArray(links)
      ? links.filter(l => l && typeof l.url === 'string' && /^https?:\/\//i.test(l.url))
      : [];

    const form = new FormData();
    form.append('title', title.trim());
    form.append('content', content.trim());
    form.append('category', category);
    form.append('degreeSlug', slug);
    form.append('links', JSON.stringify(safeLinks));

    imageFiles.forEach(f => form.append('files', f));
    docFiles.forEach(f => form.append('files', f));

    try {
      const res = await axios.post('/posts', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onNewPost?.(res.data);

      // Notificar a otras vistas (Home, etc.)
      window.dispatchEvent(new CustomEvent('vinci:post:created', { detail: res.data }));
      try { const bc = new BroadcastChannel('vinci-posts'); bc.postMessage({ type: 'created', payload: res.data }); bc.close(); } catch {}
      try { localStorage.setItem('vinci:newPost', JSON.stringify({ ts: Date.now(), post: res.data })); } catch {}

      // reset + colapsar
      setTitle(''); setContent(''); setLinks([]);
      setImageFiles([]); setDocFiles([]);
      setCategory('comunidad'); setError('');
      setStep(1); setExpanded(false);
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length) setError(apiErrors.join(' • '));
      else setError(err.response?.data?.message || 'Error al publicar');
    }
  };

  // ——— UI ———
  if (!expanded) {
    return (
      <div className="card p-3" role="button" onClick={() => setExpanded(true)}>
        <div className="form-control text-muted">¿Qué estás pensando?</div>
      </div>
    );
  }

  return (
    <div className="card p-3 mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Crear publicación</h6>
        <button className="btn btn-sm btn-outline-secondary" onClick={() => setExpanded(false)}>Cerrar</button>
      </div>

      {error && <p className="text-danger small">{error}</p>}

      {step === 1 && (
        <>
          <input
            className="form-control mb-2"
            placeholder="Título (ej: Busco ilustrador para videojuego)"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <textarea
            className="form-control mb-2"
            rows={4}
            placeholder='Escribe de qué trata tu post... (ej: "Miren chicos, les comparto mis diseños que subí a Behance…")'
            value={content}
            onChange={e => setContent(e.target.value)}
          />

          <div className="d-flex gap-2 mb-2">
            <button className="btn btn-light" type="button" onClick={() => imgRef.current?.click()}>
              <i className="bi bi-image" /> Imágenes
            </button>
            <button className="btn btn-light" type="button" onClick={() => docRef.current?.click()}>
              <i className="bi bi-file-earmark-text" /> PDFs/Docs
            </button>
          </div>
          <input
            ref={imgRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={(e) => setImageFiles(prev => [...prev, ...Array.from(e.target.files)])}
          />
          <input
            ref={docRef} type="file" accept=".pdf,.doc,.docx" multiple style={{ display: 'none' }}
            onChange={(e) => setDocFiles(prev => [...prev, ...Array.from(e.target.files)])}
          />

          {/* Links */}
          <div className="mb-2 d-flex gap-2">
            <input
              className="form-control"
              placeholder="Pega un link (Behance, Figma, GitHub, Drive, Discord, web...)"
              value={linkInput}
              onChange={e => setLinkInput(e.target.value)}
            />
            <button className="btn btn-outline-primary" type="button" onClick={addLink}>Agregar</button>
          </div>

          {links.length > 0 && (
            <div className="d-flex flex-column gap-2">
              {links.map((l, i) => (
                <div key={i} className="border rounded p-2 d-flex gap-2 align-items-center">
                  {l.preview?.image
                    ? <img src={l.preview.image} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6 }} loading="lazy" />
                    : <div className="bg-light" style={{ width: 64, height: 64, borderRadius: 6 }} />
                  }
                  <div className="flex-grow-1">
                    <div className="small text-muted">{l.provider || 'Enlace'}</div>
                    <div className="fw-semibold">{l.preview?.title || l.url}</div>
                    <div className="small text-muted text-truncate">{l.preview?.description}</div>
                  </div>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => removeLink(i)}>Quitar</button>
                </div>
              ))}
            </div>
          )}

          <div className="text-end mt-3">
            <button className="btn btn-primary" onClick={next}>Siguiente</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mb-2">
            <label className="form-label">Categoría</label>
            <select className="form-select w-auto" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="comunidad">Comunidad</option>
              <option value="colaboradores">Colaboradores</option>
              <option value="ayuda">Ayuda</option>
              <option value="feedback">Feedback</option>
              <option value="ideas">Ideas</option>
            </select>
          </div>
          <div className="d-flex justify-content-between">
            <button className="btn btn-secondary" onClick={() => setStep(1)}>Volver</button>
            <button className="btn btn-success" onClick={publish}>Publicar</button>
          </div>
        </>
      )}
    </div>
  );
}
