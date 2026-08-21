export const getVideoEmbed = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(raw)) return { type: 'video', src: raw };
  if (raw.includes('imagekit.io')) return { type: 'video', src: raw };
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.replace(/\//g, '').trim();
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
    }
    if (host.includes('youtube.com')) {
      const id = url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).pop();
      if (id) return { type: 'iframe', src: `https://www.youtube.com/embed/${id}` };
    }
    if (host.includes('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean).pop();
      if (id) return { type: 'iframe', src: `https://player.vimeo.com/video/${id}` };
    }
  } catch {}
  return { type: 'iframe', src: raw };
};
