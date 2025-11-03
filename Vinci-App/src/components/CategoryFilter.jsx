import { useEffect, useState, useRef } from 'react';
import axios from '../api/axiosInstance';

const LABELS = {
  comunidad: 'Comunidad',
  colaboradores: 'Colaboradores',
  ayuda: 'Ayuda',
  feedback: 'Feedback',
  ideas: 'Ideas',
};

export default function CategoryFilter({ degreeSlug, value, onChange }) {
  const [stats, setStats] = useState([]);
  const [open, setOpen] = useState(false); // 👈 cerrado por defecto
  const fetching = useRef(false);

  const total = stats.reduce((a, s) => a + (s.count || 0), 0);
  const getCount = (k) => stats.find(s => s.category === k)?.count || 0;

  const refetch = async () => {
    if (fetching.current) return;
    fetching.current = true;
    try {
      const r = await axios.get(`/posts/degree/${degreeSlug}/category-stats`);
      setStats(Array.isArray(r.data?.items) ? r.data.items : []);
    } catch {}
    finally { fetching.current = false; }
  };

  useEffect(() => { refetch(); }, [degreeSlug]);

  // LIVE
  useEffect(() => {
    const onCreated = (e) => {
      const post = e?.detail;
      if (!post?.degree?.slug || post.degree.slug !== degreeSlug) return;
      setStats(prev => {
        const items = prev.length ? [...prev] : [];
        const idx = items.findIndex(i => i.category === post.category);
        if (idx >= 0) items[idx] = { ...items[idx], count: (items[idx].count || 0) + 1 };
        else items.push({ category: post.category, count: 1 });
        return items;
      });
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
  }, [degreeSlug]);

  const choose = (k) => {
    onChange(k);
    setOpen(false); // 👈 se cierra al elegir
  };

  return (
    <div className="mb-3">
      <button
        className="btn btn-outline-secondary"
        type="button"
        onClick={() => setOpen(o => !o)}
      >
        {open ? 'Ocultar filtros ▲' : 'Filtrar por categoría ▼'}
      </button>

      {open && (
        <div className="mt-2 border rounded p-2 d-flex flex-wrap gap-2">
          <button
            className={`btn btn-sm ${value === '' ? 'btn-primary' : 'btn-light'}`}
            onClick={() => choose('')}
          >
            Todas ({total})
          </button>

          {Object.keys(LABELS).map((k) => (
            <button
              key={k}
              className={`btn btn-sm ${value === k ? 'btn-primary' : 'btn-light'}`}
              onClick={() => choose(k)}
            >
              {LABELS[k]} ({getCount(k)})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
