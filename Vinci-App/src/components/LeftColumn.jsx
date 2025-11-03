import { useEffect, useState, useRef } from 'react';
import axios from '../api/axiosInstance';

const LABELS = {
  comunidad: 'Comunidad',
  colaboradores: 'Colaboradores',
  ayuda: 'Ayuda',
  feedback: 'Feedback',
  ideas: 'Ideas',
};
const ORDER = ['comunidad','colaboradores','ayuda','feedback','ideas'];

function timeAgo(iso) {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return 'hace unos segundos';
  const m = Math.floor(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} días`;
  const mo = Math.floor(d / 30);
  return `hace ${mo} meses`;
}

export default function LeftColumn({ degree, slug }) {
  const [activity, setActivity] = useState(
    ORDER.map(k => ({ category:k, count:0, lastPostAt:null, authors:[] }))
  );
  const fetching = useRef(false);
  const baseUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

  const refetch = async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const r = await axios.get(`/posts/degree/${slug}/category-activity`);
      const items = Array.isArray(r.data?.items) ? r.data.items : [];
      const map = Object.fromEntries(items.map(i => [i.category, i]));
      const normalized = ORDER.map(k => ({
        category: k,
        count: map[k]?.count || 0,
        lastPostAt: map[k]?.lastPostAt || null,
        authors: Array.isArray(map[k]?.authors) ? map[k].authors.slice(0,3) : []
      }));
      setActivity(normalized);
    } catch {
      /* silencio */
    } finally {
      fetching.current = false;
    }
  };

  useEffect(() => { refetch(); }, [slug]);

  // LIVE: cuando se crea un post actualizamos conteo/fecha/avatars
  useEffect(() => {
    const onCreated = (e) => {
      const post = e?.detail;
      if (!post?.degree?.slug || post.degree.slug !== slug) return;

      setActivity(prev => {
        const items = prev.map(x => ({ ...x, authors: [...(x.authors||[])] }));
        const idx = items.findIndex(i => i.category === post.category);
        if (idx >= 0) {
          items[idx].count = (items[idx].count || 0) + 1;
          items[idx].lastPostAt = post.createdAt || new Date().toISOString();

          // avatar del autor (si viene en el payload)
          const a = post.author || {};
          const exists = items[idx].authors.some(u => String(u._id) === String(a._id));
          if (a._id && !exists) {
            items[idx].authors.unshift({
              _id: a._id,
              username: a.username,
              profilePicture: a.profilePicture
            });
            // tope 3
            items[idx].authors = items[idx].authors.slice(0,3);
          }
        }
        return items;
      });

      // re-sync con backend un momento después
      setTimeout(refetch, 1200);
    };

    window.addEventListener('vinci:post:created', onCreated);

    let bc;
    try {
      bc = new BroadcastChannel('vinci-posts');
      bc.onmessage = (msg) => {
        if (msg?.data?.type !== 'created') return;
        onCreated({ detail: msg.data.payload });
      };
    } catch {}

    const onStorage = (ev) => {
      if (ev.key !== 'vinci:newPost') return;
      try { const data = JSON.parse(ev.newValue || '{}'); onCreated({ detail: data.post }); } catch {}
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('vinci:post:created', onCreated);
      window.removeEventListener('storage', onStorage);
      try { bc && bc.close(); } catch {}
    };
  }, [slug]);

  return (
    <div className="d-flex flex-column gap-3">
      <div className="card p-3">
        <h6 className="mb-2 fw-bold">{degree?.name || 'Carrera'}</h6>
        <p className="mb-0 small text-muted">
          {degree?.name || 'Carrera'} en Escuela Multimedial Da Vinci. Compartí proyectos,
          pedí ayuda y conectá con otras áreas.
        </p>
      </div>

      <div className="card p-3">
        <h6 className="mb-2">Actividad por categoría</h6>

        <ul className="list-unstyled mb-0">
          {activity.map(item => (
            <li key={item.category} className="py-1">
              {/* título categoría en negrita */}
              <div className="fw-semibold mb-1">{LABELS[item.category] || item.category}</div>

              {/* línea compacta: 💬 count · 🕒 last · avatars */}
              <div className="small text-muted d-flex align-items-center gap-3">
                <span className="d-inline-flex align-items-center gap-1">
                  <i className="bi bi-chat-dots" />
                  {item.count} posts
                </span>
                <span className="d-inline-flex align-items-center gap-1">
                  <i className="bi bi-clock" />
                  {item.lastPostAt ? timeAgo(item.lastPostAt) : 'sin actividad'}
                </span>

                {/* avatars (hasta 3) */}
                <span className="ms-auto d-inline-flex align-items-center" style={{ gap: '4px' }}>
                  {item.authors.slice(0,3).map(u => (
                    <img
                      key={u._id}
                      src={u.profilePicture ? `${baseUrl}${u.profilePicture}` : '/default-avatar.png'}
                      alt={u.username || ''}
                      title={u.username || ''}
                      className="rounded-circle border"
                      style={{ width: 20, height: 20, objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
