// components/PostContent.jsx
import { useEffect, useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PostContent({ post, actionsSlot = null }) {
  const baseUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const isOpeningLightbox = useRef(false);

  const authorDegrees = Array.isArray(post.author?.degrees)
    ? post.author.degrees
    : [];
  const degreeNames = authorDegrees.map((d) => d?.name).filter(Boolean);
  const visibleDegrees = degreeNames.slice(0, 2);
  const extraDegreesCount = Math.max(
    degreeNames.length - visibleDegrees.length,
    0
  );

  const first = post.author?.firstName || "";
  const last = post.author?.lastName || "";
  const username = post.author?.username || "usuario";

  const isFavicon = (url) =>
    typeof url === "string" && url.includes("google.com/s2/favicons");
  const heroImageCandidate = post.links
    ?.find((l) => l?.preview?.image)
    ?.preview?.image;
  const heroImage =
    heroImageCandidate && !isFavicon(heroImageCandidate)
      ? heroImageCandidate
      : null;

  const openLightbox = (index) => {
    if (lightboxOpen || isOpeningLightbox.current) return;
    isOpeningLightbox.current = true;
    setPhotoIndex(index);
    setLightboxOpen(true);
    setTimeout(() => {
      isOpeningLightbox.current = false;
    }, 300);
  };

  return (
    <>
      {heroImage && (
        <img
          src={heroImage}
          alt=""
          className="mb-2 rounded"
          style={{ width: "100%", maxHeight: 360, objectFit: "cover" }}
          loading="lazy"
        />
      )}

      <div className="d-flex align-items-start justify-content-between gap-2 mb-2 position-relative">
        <div className="d-flex align-items-start">
          <img
            src={
              post.author?.profilePicture
                ? `${baseUrl}${post.author.profilePicture}`
                : "/default-avatar.png"
            }
            alt="avatar"
            className="rounded-circle me-2"
            style={{ width: 50, height: 50, objectFit: "cover" }}
          />
          <div>
            <div>
              <strong>{`${first} ${last}`.trim() || username}</strong> @{username}
            </div>
            {visibleDegrees.length > 0 && (
              <small className="text-muted meta-degree d-block">
                Estudia: {visibleDegrees.join(" �� ")}
                {extraDegreesCount > 0 ? ` +${extraDegreesCount}` : ""}
              </small>
            )}
            <small className="text-muted">
              {new Date(post.createdAt).toLocaleString()}
            </small>
          </div>
        </div>

        {actionsSlot}
      </div>

      {post.title && <h5 className="mt-2 mb-1">{post.title}</h5>}
      {post.content && <p className="mt-2">{post.content}</p>}

      {Array.isArray(post.images) && post.images.length > 0 && (
        <div className="mt-3 d-flex flex-wrap gap-2">
          {post.images.map((imgUrl, index) => (
            <img
              key={index}
              src={`${baseUrl}${imgUrl}`}
              alt={`imagen-${index}`}
              className="rounded cursor-pointer border"
              style={{ width: 120, height: 120, objectFit: "cover" }}
              onClick={() => openLightbox(index)}
            />
          ))}
        </div>
      )}

      {Array.isArray(post.documents) && post.documents.length > 0 && (
        <div className="mt-3">
          <strong>Documentos:</strong>
          <div className="d-flex flex-wrap gap-2 mt-2">
            {post.documents.map((docUrl, idx) => {
              const fileName = docUrl.split("/").pop();
              const ext = fileName.split(".").pop().toLowerCase();
              if (ext === "pdf") {
                return (
                  <div
                    key={idx}
                    className="border rounded p-2 text-center"
                    style={{ width: 150, height: 210, overflow: "hidden" }}
                  >
                    <Document
                      file={`${baseUrl}${docUrl}`}
                      onLoadError={(err) =>
                        console.error("Error al cargar PDF:", err)
                      }
                    >
                      <Page pageNumber={1} width={130} />
                    </Document>
                    <a
                      href={`${baseUrl}${docUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="small d-block mt-1 text-primary"
                    >
                      {fileName}
                    </a>
                  </div>
                );
              }
              return (
                <a
                  key={idx}
                  href={`${baseUrl}${docUrl}`}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border rounded px-2 py-1 d-flex align-items-center"
                  title={fileName}
                >
                  <span className="text-truncate" style={{ maxWidth: 150 }}>
                    {fileName}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {Array.isArray(post.links) && post.links.length > 0 && (
        <div className="mt-2 d-flex flex-wrap gap-2">
          {post.links.map((l, i) => (
            <a
              key={i}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-outline-primary"
            >
              <i className="bi bi-link-45deg" /> {l.provider || "Link"}
            </a>
          ))}
        </div>
      )}

      {lightboxOpen && Array.isArray(post.images) && post.images.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={photoIndex}
          slides={post.images.map((imgUrl) => ({ src: `${baseUrl}${imgUrl}` }))}
          on={{ view: ({ index }) => setPhotoIndex(index) }}
        />
      )}
    </>
  );
}
