import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

// Imports para PDF (opcionales)
import { pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

// 👇 Recibimos 'accentColor' como prop, con negro como fallback
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

  return (
    <div className="post-content">
      
      {/* 👇 AQUÍ ESTÁ EL CAMBIO PRINCIPAL */}
      <div 
        // Usamos la nueva clase CSS para tipografía y espaciado
        className="neo-post-content-text"
        // Aplicamos el color dinámico solo al borde izquierdo
        style={{ borderLeftColor: accentColor }}
      >
        {displayContent}
        {shouldTruncate && (
          <button 
            className="btn btn-link p-0 fw-bold text-dark"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Leer menos" : "Leer más"}
          </button>
        )}
      </div>

      {/* --- IMÁGENES (Sin cambios) --- */}
      {images.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-4">
          {images.map((img, idx) => (
            <img 
              key={idx}
              src={`${baseUrl}${img}`} 
              alt={`Adjunto ${idx}`}
              className="border border-2 border-dark"
              style={{ 
                width: images.length === 1 ? '100%' : '140px', 
                height: images.length === 1 ? 'auto' : '140px', 
                objectFit: 'cover',
                borderRadius: '12px',
                cursor: 'pointer',
                maxHeight: '500px'
              }}
              onClick={() => {
                setPhotoIndex(idx);
                setLightboxOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* --- LIGHTBOX (Sin cambios) --- */}
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={photoIndex}
          slides={images.map((img) => ({ src: `${baseUrl}${img}` }))}
        />
      )}

      {/* --- DOCUMENTOS (Sin cambios) --- */}
      {documents.length > 0 && (
        <div className="d-flex flex-column gap-2 mb-3">
          {documents.map((doc, idx) => (
            <a 
              key={idx}
              href={`${baseUrl}${doc}`} 
              target="_blank" 
              rel="noreferrer"
              className="d-flex align-items-center gap-3 p-3 border-2 border-dark rounded-3 text-decoration-none bg-light"
              style={{ borderStyle: 'dashed' }}
            >
              <div className="bg-white border border-dark rounded-circle d-flex align-items-center justify-content-center" style={{width: 40, height: 40}}>
                 <i className="bi bi-file-earmark-text fs-5 text-dark"></i>
              </div>
              <span className="fw-bold text-dark text-truncate" style={{ maxWidth: '80%' }}>
                {doc.split('/').pop() || `Documento ${idx + 1}`}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* --- LINKS (Sin cambios) --- */}
      {links.length > 0 && (
        <div className="d-flex flex-column gap-2">
          {links.map((link, idx) => (
            <a 
              key={idx} 
              href={link.url} 
              target="_blank" 
              rel="noreferrer"
              className="card border-dark text-decoration-none overflow-hidden"
              style={{ borderWidth: '2px' }}
            >
              <div className="row g-0">
                {link.preview?.image && (
                  <div className="col-3" style={{ backgroundColor: '#f0f0f0' }}>
                    <img 
                        src={link.preview.image} 
                        alt="" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                )}
                <div className={link.preview?.image ? "col-9" : "col-12"}>
                  <div className="card-body py-2 px-3">
                    <div className="card-title fw-bold small mb-1 text-dark text-truncate">
                        {link.preview?.title || link.url}
                    </div>
                    <div className="card-text small text-muted text-truncate">
                        {link.preview?.description || link.provider || "Enlace externo"}
                    </div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}