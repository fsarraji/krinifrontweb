const API_BASE = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/').replace(/\/+$/, '');
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function resolveImage(img) {
  if (!img) return null;
  if (/^https?:\/\//i.test(img)) return img;
  return `${API_ORIGIN}${img.startsWith('/') ? '' : '/'}${img}`;
}
