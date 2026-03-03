import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export default function PostContent({ post, accentColor = '#000000' }) {
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!post) return null;

  const content = post.content || "";
  const images = post.images || [];
  const documents = post.documents || [];
  const links = post.links || [];

  const shouldTruncate = content.length > 350;
  const displayContent = isExpanded || !shouldTruncate 
    ? content 
    : content.substring(0, 350) + "...";

  // Helper para sacar el nombre de la página (ej: github.com)
  const getDomain = (url) => {
    try { return new URL(url).hostname.replace('www.', ''); } 
    catch { return url; }
  };

  return (
    <div className="post-content">
      
      {/* 1. TEXTO DEL POST */}
      <div className="neo-post-content-text" style={{ borderLeftColor: accentColor }}>
        {displayContent}
        {shouldTruncate && (
          <button 
            className="btn btn-link p-0 fw-bold text-dark ms-2"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Leer menos" : "Leer más"}
          </button>
        )}
      </div>

      {/* 2. IMÁGENES (Formato Showcase Neobrutalista Dinámico) */}
      {images.length > 0 && (
        <div className={`neo-showcase-grid ${images.length === 1 ? 'neo-showcase-grid--1' : 'neo-showcase-grid--2'}`}>
          {images.map((img, idx) => (
            <div key={idx} className="neo-image-showcase">
              {/* Badge flotante de la esquina superior */}
              <div className="neo-image-floating-badge">IMG 0{idx + 1}</div>
              
              <img 
                src={`${baseUrl}${img}`} 
                alt={`Adjunto ${idx}`}
                onClick={() => {
                  setPhotoIndex(idx);
                  setLightboxOpen(true);
                }}
              />
              
              <div className="neo-image-showcase-footer">
                <div style={{ minWidth: 0, paddingRight: '10px' }}>
                   {/* text-truncate previene que el texto rompa el layout si es muy largo */}
                   <div className="neo-image-title text-truncate">RECURSO VISUAL 0{idx + 1}</div>
                   <div className="neo-image-subtitle text-truncate">ARCHIVO ADJUNTO</div>
                </div>
                <button 
                  className="neo-image-btn"
                  onClick={() => {
                    setPhotoIndex(idx);
                    setLightboxOpen(true);
                  }}
                  title="Ampliar imagen"
                >
                  <i className="bi bi-arrows-fullscreen" style={{ fontSize: '1rem' }}></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIGHTBOX (Pantalla completa de fotos) */}
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={photoIndex}
          slides={images.map((img) => ({ src: `${baseUrl}${img}` }))}
        />
      )}

      {/* 3. LINKS Y REPOSITORIOS (Tarjetas ricas) */}
      {links.length > 0 && (
        <div className="d-flex flex-column mb-3">
          {links.map((link, idx) => {
            const domain = getDomain(link.url);
            const isGithub = domain.includes('github.com');
            const title = link.preview?.title || link.url.split('/').pop() || domain;

            return (
              <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="neo-attach-card">
                <div className="neo-attach-icon" style={{ backgroundColor: isGithub ? '#1f2937' : '#e5e7eb', color: isGithub ? '#fff' : '#000' }}>
                  {isGithub ? <i className="bi bi-github"></i> : <i className="bi bi-link-45deg"></i>}
                </div>
                <div className="neo-attach-body">
                  <div className="neo-attach-meta">
                     <span className="neo-attach-type">{isGithub ? 'REPOSITORIO' : 'ENLACE EXTERNO'}</span>
                     <span className="neo-attach-badge">{isGithub ? 'GITHUB' : 'LINK'}</span>
                  </div>
                  <div className="neo-attach-title" title={title}>{title}</div>
                  <div className="neo-attach-url">{domain}</div>
                </div>
                <div className="neo-attach-action">
                  <i className="bi bi-arrow-right"></i>
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* 4. DOCUMENTOS Y PDFS (Tarjetas ricas) */}
      {documents.length > 0 && (
        <div className="d-flex flex-column mb-4">
          {documents.map((doc, idx) => {
            const docUrl = `${baseUrl}${doc}`;
            const fileName = doc.split('/').pop() || `Documento ${idx + 1}`;
            const isPdf = docUrl.toLowerCase().includes('.pdf');
            // Quitamos la extensión para el título grande
            const cleanTitle = fileName.replace(/\.[^/.]+$/, "");

            return (
              <a key={idx} href={docUrl} target="_blank" rel="noreferrer" className="neo-attach-card">
                <div className="neo-attach-icon" style={{ backgroundColor: isPdf ? '#ff4d4d' : '#3b82f6', color: '#fff' }}>
                  {isPdf ? <i className="bi bi-file-earmark-pdf-fill"></i> : <i className="bi bi-file-earmark-word-fill"></i>}
                </div>
                <div className="neo-attach-body">
                  <div className="neo-attach-meta">
                     <span className="neo-attach-type">{isPdf ? 'DOCUMENTO PDF' : 'DOCUMENTO DE TEXTO'}</span>
                     <span className="neo-attach-badge">{isPdf ? 'PDF' : 'DOC'}</span>
                  </div>
                  <div className="neo-attach-title" title={cleanTitle}>{cleanTitle}</div>
                  <div className="neo-attach-url">{`vinci.edu.ar/assets/docs`}</div>
                </div>
                <div className="neo-attach-action">
                  <i className="bi bi-arrow-right"></i>
                </div>
              </a>
            );
          })}
        </div>
      )}

    </div>
  );
}