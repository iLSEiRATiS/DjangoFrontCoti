import { useEffect } from 'react';
import { toAbsoluteUrl } from '../lib/seo';

const BRAND = 'CotiStore';

function upsertMeta(attr, key, value) {
  if (!value) return;
  let node = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attr, key);
    document.head.appendChild(node);
  }
  node.setAttribute('content', value);
}

function upsertCanonical(url) {
  let node = document.head.querySelector('link[rel="canonical"]');
  if (!node) {
    node = document.createElement('link');
    node.setAttribute('rel', 'canonical');
    document.head.appendChild(node);
  }
  node.setAttribute('href', url);
}

export default function Seo({
  title,
  description,
  path = '/',
  image,
  type = 'website',
  noindex = false,
  jsonLd = null,
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BRAND}` : BRAND;
    const canonicalUrl = toAbsoluteUrl(path);
    const imageUrl = image ? toAbsoluteUrl(image) : '';

    document.title = fullTitle;
    upsertCanonical(canonicalUrl);
    upsertMeta('name', 'description', description || '');
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', BRAND);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description || '');
    upsertMeta('property', 'og:url', canonicalUrl);
    if (imageUrl) upsertMeta('property', 'og:image', imageUrl);

    upsertMeta('name', 'twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description || '');
    if (imageUrl) upsertMeta('name', 'twitter:image', imageUrl);

    const schemaId = 'seo-jsonld';
    const prev = document.getElementById(schemaId);
    if (prev) prev.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = schemaId;
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
  }, [title, description, path, image, type, noindex, jsonLd]);

  return null;
}

