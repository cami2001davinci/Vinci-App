// controllers/metaController.js
import ogs from 'open-graph-scraper';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function providerFrom(host) {
  return (host || '').replace(/^www\./, '');
}

function humanizeSlug(slug = '') {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, c => c.toUpperCase());
}

function faviconFor(host) {
  if (!host) return '';
  // servicio liviano de favicons de Google
  return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
}

// ---- fallbacks por proveedor ----
function githubOgImage(u) {
  // https://github.com/owner/repo -> https://opengraph.githubassets.com/1/owner/repo
  try {
    const url = new URL(u);
    const parts = url.pathname.split('/').filter(Boolean);
    if (url.hostname.includes('github.com') && parts.length >= 2) {
      const owner = parts[0];
      const repo  = parts[1];
      return `https://opengraph.githubassets.com/1/${owner}/${repo}`;
    }
  } catch {}
  return '';
}

async function behanceOEmbedIfProject(u) {
  // Sólo funciona para /gallery/… (no moodboards)
  try {
    const url = new URL(u);
    if (url.hostname.includes('behance.net') && url.pathname.includes('/gallery/')) {
      const resp = await fetch('https://www.behance.net/oembed?format=json&url=' + encodeURIComponent(u), {
        headers: { 'user-agent': UA }
      });
      if (resp.ok) {
        const data = await resp.json(); // { title, thumbnail_url, ... }
        return {
          title: data.title || '',
          image: data.thumbnail_url || ''
        };
      }
    }
  } catch {}
  return null;
}

export const getLinkPreview = async (req, res) => {
  try {
    // 1) Sanitizar URL
    let target = (req.query.url || '').trim();
    if (!target) return res.status(400).json({ message: 'Falta url' });
    if (!/^https?:\/\//i.test(target)) {
      return res.status(400).json({ message: 'URL inválida (debe empezar con http/https)' });
    }

    let host = '';
    let path = '';
    try {
      const u = new URL(target);
      host = u.hostname || '';
      path = u.pathname || '';
    } catch {
      return res.json({ url: target, provider: '', preview: { title: '', description: '', image: '' } });
    }

    const provider = providerFrom(host);

    // 2) Intento principal con OG
    let ogTitle = '';
    let ogDesc  = '';
    let ogImg   = '';

    try {
      const { result } = await ogs({
        url: target,
        timeout: 8000,
        headers: { 'user-agent': UA },
        followAllRedirects: true,
      });
      ogTitle = result.ogTitle || result.twitterTitle || '';
      ogDesc  = result.ogDescription || result.twitterDescription || '';
      ogImg   = Array.isArray(result.ogImage)
        ? (result.ogImage[0]?.url || '')
        : (result.ogImage?.url || result.twitterImage || '');
    } catch {
      // seguimos con fallbacks
    }

    // 3) Fallback específico: Behance PROJECT (no moodboard)
    if (provider.includes('behance.net') && (!ogImg || !ogTitle)) {
      const emb = await behanceOEmbedIfProject(target);
      if (emb) {
        ogTitle = ogTitle || emb.title || '';
        ogImg   = ogImg   || emb.image || '';
      }
    }

    // 4) Fallback específico: GitHub repo OG image
    if (provider.includes('github.com') && !ogImg) {
      ogImg = githubOgImage(target) || '';
    }

    // 5) Si no hay nada aún, último recurso: favicon + título del slug
    if (!ogImg) ogImg = faviconFor(host);
    if (!ogTitle) {
      // toma la última parte del path como título aproximado
      const parts = path.split('/').filter(Boolean);
      ogTitle = parts.length ? humanizeSlug(parts[parts.length - 1]) : provider || target;
    }

    return res.json({
      url: target,
      provider,
      preview: {
        title: ogTitle || '',
        description: ogDesc || '',
        image: ogImg || ''
      }
    });
  } catch {
    return res.json({
      url: req.query.url || '',
      provider: '',
      preview: { title: '', description: '', image: '' }
    });
  }
};
