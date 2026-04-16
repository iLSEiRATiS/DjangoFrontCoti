const ENV_SITE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SITE_URL) || '';

export function getSiteUrl() {
  const raw = String(ENV_SITE_URL || '').trim();
  if (raw) return raw.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }
  return 'https://www.cotistore.com.ar';
}

export function toAbsoluteUrl(pathOrUrl = '') {
  const value = String(pathOrUrl || '').trim();
  if (!value) return getSiteUrl();
  if (/^https?:\/\//i.test(value)) return value;
  return `${getSiteUrl()}${value.startsWith('/') ? '' : '/'}${value}`;
}

export function normalizeText(value = '', maxLen = 155) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}...` : text;
}

