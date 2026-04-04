import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Container, Row, Col, Button, Dropdown, Badge, Pagination, Form, Spinner, InputGroup, Modal
} from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import productosData from '../data/productos.json';
import api, { API_BASE } from '../lib/api';
import Seo from '../components/Seo';
import { getGenericVariantPrice } from '../lib/productVariants';
import { normalizeText, toAbsoluteUrl } from '../lib/seo';

const slugify = (str = '') =>
  str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const norm = (s = '') =>
  s
    .toString()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normEq = (a, b) => norm(a) === norm(b);

const isSizeGroupLabel = (label = '') =>
  ['9 pulgadas', '10 pulgadas', '12 pulgadas'].includes(norm(label));

const sizeGroupMatch = (product, label) => {
  if (!isSizeGroupLabel(label)) return false;
  const key = norm(label);
  const path = product?.categoria_path || [];
  if (Array.isArray(path) && path.some((p) => norm(p).includes(key))) return true;
  const catName = (product?.categoria || product?.category || '').toString();
  const subName = (product?.subcategoria || product?.subcategory || '').toString();
  return norm(catName).includes(key) || norm(subName).includes(key);
};

const matchInPath = (path, target) => {
  if (!target) return true;
  if (!Array.isArray(path) || path.length === 0) return false;
  return path.some((p) => normEq(p, target));
};

function mergeSpecialColorProducts(products = []) {
  if (!Array.isArray(products) || products.length === 0) return products;
  const mergeBySize = (items, size) => {
    const isHiloOro = (name = '') => {
      const s = norm(name);
      return s.includes('hilo') && s.includes('oro') && (s.includes(`x${size}mts`) || s.includes(`x${size} mts`));
    };
    const isHiloPlata = (name = '') => {
      const s = norm(name);
      return s.includes('hilo') && s.includes('plata') && (s.includes(`x${size}mts`) || s.includes(`x${size} mts`));
    };

    const oro = items.find((p) => isHiloOro(p?.nombre));
    const plata = items.find((p) => isHiloPlata(p?.nombre));
    if (!oro || !plata) return items;

    const colorAttrName =
      Object.keys(oro.atributos || {}).find((k) => norm(k).includes('color')) ||
      Object.keys(plata.atributos || {}).find((k) => norm(k).includes('color')) ||
      'Color';

    const merged = {
      ...oro,
      id: `merged-${size}-${oro.id || 'hilo-oro-plata'}`,
      sourceProductId: oro.id || oro._id || null,
      nombre: `Hilo Oro/Plata x${size}mts (Elegir Color)`,
      // Si una variante esta activa y la otra no, mantener visible el producto combinado.
      activo: (oro?.activo ?? true) || (plata?.activo ?? true),
      atributos: {
        ...(oro.atributos || {}),
        ...(plata.atributos || {}),
        [colorAttrName]: ['Oro', 'Plata'],
      },
    };

    return [merged, ...items.filter((p) => p !== oro && p !== plata)];
  };

  let out = [...products];
  out = mergeBySize(out, '50');
  out = mergeBySize(out, '10');
  return out;
}

function fixSpecificGloboDuplicate(products = []) {
  if (!Array.isArray(products) || products.length < 2) return products;
  const targetName = norm('Globo Metalizado Dorado 32" Sueltos X50 Unidades (ELEGIR NUMERO)');
  const targetCat = norm('Numero Metalizados');
  const targetTop = norm('Globos y Piñatas');
  const idxs = [];
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    const nameOk = norm(p?.nombre || '') === targetName;
    const catOk = norm(p?.categoria || '') === targetCat;
    const pathOk = Array.isArray(p?.categoria_path) && p.categoria_path.some((x) => norm(x) === targetTop);
    if (nameOk && catOk && pathOk) idxs.push(i);
  }
  if (idxs.length < 2) return products;
  const copy = [...products];
  const i = idxs[1];
  copy[i] = {
    ...copy[i],
    nombre: 'Globo Metalizado Dorado 32" Sueltos X1 Unidades (ELEGIR NUMERO)',
    precio: 494,
    precioOriginal: 494,
    descuento: copy[i]?.descuento || null,
  };
  return copy;
}

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

const normalizeImageUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/')) return `${API_BASE}${raw}`;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return '';
};

const getVideoEmbed = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(raw)) return { type: 'video', src: raw };
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

const normalizeProductName = (name = '') => {
  const raw = String(name || '').trim();
  if (!raw) return raw;
  // Corrige casos importados como "X0 Unidades (ELEGIR NUMERO)" -> "X50 ..."
  return raw.replace(/X0(\s*Unidades\s*\(ELEGIR N[ÚU]MERO\))/i, 'X50$1');
};

const shouldHideKnownBadGloboVariant = (name = '') => {
  const n = norm(name);
  return (
    n === norm('Globo Metalizado Dorado 32" x (ELEGIR NUMERO)') ||
    n === norm('Globo Metalizado Dorado 32" Sueltos X5 Unidades (ELEGIR NUMERO)')
  );
};

function dedupeSpecificGloboX1(products = []) {
  if (!Array.isArray(products) || products.length < 2) return products;
  const isTarget = (name = '') => {
    const n = norm(name);
    return (
      n === norm('Globo Metalizado Dorado 32" x1 (ELEGIR NUMERO)') ||
      (n.includes('globo metalizado dorado 32') && n.includes('x1') && n.includes('elegir numero'))
    );
  };
  let seen = false;
  return products.filter((p) => {
    if (!isTarget(p?.nombre || '')) return true;
    if (!seen) {
      seen = true;
      return true;
    }
    return false;
  });
}

function mergeSpecificUnitAndDozenProducts(products = []) {
  if (!Array.isArray(products) || !products.length) return products;
  const stripPresentationFromName = (name = '') =>
    String(name || '')
      // x50, x 50, x50u, 50 unidades
      .replace(/\bx\s*\d+\s*(u|ud|uds|unidades?)?\b/gi, '')
      .replace(/\b\d+\s*(u|ud|uds|unidades?)\b/gi, '')
      // x unidad / x unidades
      .replace(/\bx\s*(unidad|unidades|u|ud|uds)\b/gi, '')
      // docena / unidad
      .replace(/\b(docena|unidad|unidades)\b/gi, '')
      // limpia "x" suelta residual al final
      .replace(/\bx\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizeNameForGroup = (name = '') => stripPresentationFromName(name);

  const labelFromQty = (qty) => {
    const n = Number(qty);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n === 1 ? '1 unidad' : `${n} unidades`;
  };

  const parsePresentation = (text = '') => {
    const source = String(text || '').toLowerCase();
    if (!source) return null;
    if (/\bdocena\b/.test(source)) return '12 unidades';
    if (/\bx\s*unidad\b|\b1\s*unidad\b|\bunidad\b/.test(source)) return '1 unidad';
    const match = source.match(/\bx\s*(\d+)\s*(u|uds|unidades?)?\b|\b(\d+)\s*unidades?\b/);
    const rawQty = match ? (match[1] || match[3]) : '';
    const qty = Number(rawQty);
    return labelFromQty(qty);
  };

  const getPresentationLabel = (item) => {
    const attrs = item?.atributos || {};
    const key = Object.keys(attrs).find((k) => {
      const nk = norm(k);
      return nk.includes('cantidad') || nk.includes('presentacion');
    });
    const rawAttr = key ? (Array.isArray(attrs[key]) ? attrs[key][0] : attrs[key]) : '';
    return parsePresentation(rawAttr) || parsePresentation(item?.nombre || '');
  };

  const groups = new Map();
  const singles = [];
  for (const item of products) {
    const baseName = normalizeNameForGroup(item?.nombre || '');
    const groupKey = norm(baseName);
    if (!groupKey) {
      singles.push(item);
      continue;
    }
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey).push(item);
  }

  const output = [...singles];
  groups.forEach((items, groupKey) => {
    if (items.length < 2) {
      output.push(...items);
      return;
    }

    const rows = items.map((item) => ({
      item,
      presentation: getPresentationLabel(item),
      baseName: stripPresentationFromName(item?.nombre || ''),
    }));
    const validRows = rows.filter((r) => !!r.presentation);
    if (validRows.length < 2) {
      output.push(...items);
      return;
    }

    const sortedRows = [...validRows].sort((a, b) => {
      const qa = Number((a.presentation || '').split(' ')[0]) || 9999;
      const qb = Number((b.presentation || '').split(' ')[0]) || 9999;
      return qa - qb;
    });
    const uniqueLabels = [...new Set(sortedRows.map((r) => r.presentation))];
    if (uniqueLabels.length < 2) {
      output.push(...items);
      return;
    }
    const primary = sortedRows[0]?.item || items[0];
    const primaryBaseName = sortedRows[0]?.baseName || stripPresentationFromName(primary?.nombre || '');

    const images = [...new Set(items.flatMap((x) => x?.imagenes || []).filter(Boolean))];
    const priceMap = {};
    const idMap = {};
    const stockMap = {};

    for (const row of sortedRows) {
      priceMap[row.presentation] = Number(row.item?.precio ?? 0);
      idMap[row.presentation] = row.item?.id || row.item?._id || null;
      stockMap[row.presentation] = Number(row.item?.stock ?? 0);
    }

    output.push({
      ...primary,
      id: `merged-presentation-${primary?.id || primary?._id || groupKey}`,
      sourceProductId: primary?.id || primary?._id || null,
      nombre: primaryBaseName || primary?.nombre || 'Producto',
      imagen: images[0] || primary?.imagen || '',
      imagenes: images.length ? images : [primary?.imagen].filter(Boolean),
      precio: Number(priceMap[uniqueLabels[0]] ?? primary?.precio ?? 0),
      precioOriginal: Number(priceMap[uniqueLabels[0]] ?? primary?.precioOriginal ?? primary?.precio ?? 0),
      descuento: primary?.descuento || null,
      atributos: {
        ...Object.fromEntries(
          Object.entries(primary?.atributos || {}).filter(([k]) => {
            const nk = norm(k);
            return !(nk.includes('cantidad') || nk.includes('presentacion'));
          })
        ),
        Cantidad: uniqueLabels,
      },
      precio_por_presentacion: priceMap,
      product_id_por_presentacion: idMap,
      stock_por_presentacion: stockMap,
      stock: Number(stockMap[uniqueLabels[0]] ?? primary?.stock ?? 0),
    });
  });

  return output;
}

function shouldHideUnitDozenVariant(product) {
  return false;
}

function mergeAntifazVenecianoFamily(products = []) {
  if (!Array.isArray(products) || !products.length) return products;

  const familyBases = new Map([
    [norm('Antifaz Veneciano'), 'Clasico'],
    [norm('Antifaz Veneciano Modelo 2'), 'Modelo 2'],
    [norm('Antifaz Veneciano Modelo 3'), 'Modelo 3'],
  ]);

  const detectQty = (item) => {
    const byName = String(item?.nombre || '');
    if (/\b(12\s*unidades?|x\s*12|docena)\b/i.test(byName)) return '12 unidades';
    const attrs = item?.atributos || {};
    const key = Object.keys(attrs).find((k) => norm(k).includes('cantidad') || norm(k).includes('presentacion'));
    const raw = key ? (Array.isArray(attrs[key]) ? attrs[key][0] : attrs[key]) : '';
    return /12|docena/i.test(String(raw || '')) ? '12 unidades' : '1 unidad';
  };

  const passthrough = [];
  const candidates = [];

  for (const p of products) {
    const base = norm(String(p?.nombre || '').replace(/\b(12\s*unidades?|x\s*12|docena)\b/gi, '').trim());
    const modelLabel = familyBases.get(base);
    if (!modelLabel) {
      passthrough.push(p);
      continue;
    }
    candidates.push({ item: p, modelLabel, qtyLabel: detectQty(p) });
  }

  if (!candidates.length) return products;

  const comboPrice = {};
  const comboProduct = {};
  const comboStock = {};
  const models = ['Clasico', 'Modelo 2', 'Modelo 3'];
  const qtys = ['1 unidad', '12 unidades'];

  for (const c of candidates) {
    const key = `${c.modelLabel}||${c.qtyLabel}`;
    comboPrice[key] = Number(c.item?.precio ?? 0);
    comboProduct[key] = c.item?.id || c.item?._id || null;
    comboStock[key] = Number(c.item?.stock ?? 0);
  }

  // Si falta alguna combinacion, dejamos esos productos sin fusionar para no romper compra.
  const hasAll = models.every((m) => qtys.every((q) => Object.prototype.hasOwnProperty.call(comboPrice, `${m}||${q}`)));
  if (!hasAll) return products;

  const ref = candidates.find((x) => x.modelLabel === 'Clasico' && x.qtyLabel === '1 unidad')?.item || candidates[0].item;
  const images = [...new Set(candidates.flatMap((x) => x.item?.imagenes || []).filter(Boolean))];

  const merged = {
    ...ref,
    id: 'merged-antifaz-veneciano-family',
    sourceProductId: comboProduct['Clasico||1 unidad'] || ref.id || ref._id || null,
    nombre: 'Antifaz Veneciano',
    imagen: images[0] || ref.imagen || '',
    imagenes: images.length ? images : [ref.imagen].filter(Boolean),
    precio: Number(comboPrice['Clasico||1 unidad'] ?? ref.precio ?? 0),
    precioOriginal: Number(comboPrice['Clasico||1 unidad'] ?? ref.precioOriginal ?? ref.precio ?? 0),
    descuento: ref?.descuento || null,
    atributos: {
      ...Object.fromEntries(
        Object.entries(ref.atributos || {}).filter(([k]) => {
          const nk = norm(k);
          return !nk.includes('cantidad') && !nk.includes('presentacion') && !nk.includes('modelo');
        })
      ),
      Modelo: models,
      Cantidad: qtys,
    },
    precio_por_combinacion: comboPrice,
    product_id_por_combinacion: comboProduct,
    stock_por_combinacion: comboStock,
    stock: Number(comboStock['Clasico||1 unidad'] ?? ref.stock ?? 0),
  };

  return [...passthrough, merged];
}

function shouldHideAntifazVenecianoFamilyOriginal(product) {
  const id = String(product?.id || '');
  if (id === 'merged-antifaz-veneciano-family') return false;
  const base = norm(String(product?.nombre || '').replace(/\b(12\s*unidades?|x\s*12|docena)\b/gi, '').trim());
  return [
    norm('Antifaz Veneciano'),
    norm('Antifaz Veneciano Modelo 2'),
    norm('Antifaz Veneciano Modelo 3'),
  ].includes(base);
}

const SORTERS = {
  relevancia: { label: 'Relevancia', fn: () => 0 },
  precio_asc: { label: 'Precio: menor a mayor', fn: (a, b) => Number(a.precio ?? 0) - Number(b.precio ?? 0) },
  precio_desc: { label: 'Precio: mayor a menor', fn: (a, b) => Number(b.precio ?? 0) - Number(a.precio ?? 0) },
  nombre_asc: { label: 'Nombre: A-Z', fn: (a, b) => a.nombre.localeCompare(b.nombre) },
  nombre_desc: { label: 'Nombre: Z-A', fn: (a, b) => b.nombre.localeCompare(a.nombre) }
};

const TOP_CATEGORY_ORDER = [
  'Cotillon',
  'Globos y Piñatas',
  'Guirnaldas y Decoración',
  'Decoracion para Tortas',
  'Decoracion Led',
  'Luminoso',
  'Libreria',
  'Disfraces',
  'Descartables',
  'Reposteria',
  'Juguetes',
  'Miniaturas-Juguetitos',
  'Fechas Especiales',
  'Lanzapapelitos',
  'Papelera',
  'Articulos con Sonido',
  'Articulos en telgopor',
  'Articulos Para Manualidades',
  'Articulos Para Comunion',
];

const COTILLON_ORDER = [
  'Velas',
  'Vinchas y Coronas',
  'Gorros y Sombreros',
  'Antifaces',
  'Carioca',
];

const VELAS_ORDER = [
  'Velas con Palito',
  'Velas Importadas',
  'Bengalas',
  'Velas con Luz',
  'Vela Escudo de Futbol',
  'Velas Estrellita',
];

const GLOBOS_ORDER = [
  'Numero Metalizados',
  'Globos con Forma',
  'Set de Globos',
  '9 Pulgadas',
  '10 Pulgadas',
  '12 Pulgadas',
  'Globologia',
  'Piñatas',
  'Accesorios',
];

const SIZE_ORDER = [
  'Perlado',
  'Liso',
];

const DISFRACES_ORDER = [
  'Extensiones Pelucas y Pintura',
  'Maquillaje',
  'Caretas',
  'Tutus',
  'Alas',
];

const DESCARTABLES_ORDER = [
  'Bandejas Carton',
  'Bandejas Plasticas',
  'Manteles',
  'Cubiertos',
  'Platos',
  'Potes',
  'Servilletas',
  'Vasos y Copas',
  'Blondas',
];

function buildTreeFromApi(categories = []) {
  const byId = new Map();
  categories.forEach((c) => {
    const label = c.nombre || c.name || c.label || `Categoria ${c.id}`;
    const slugVal = c.slug || slugify(label);
    byId.set(c.id, { label, slug: slugVal, id: c.id, children: [] });
  });
  const roots = [];
  byId.forEach((node, id) => {
    const cat = categories.find((c) => c.id === id);
    const parentId = cat?.parent || cat?.parent_id || cat?.parentId;
    if (parentId) {
      const parent = byId.get(parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortTree = (nodes) => {
    nodes.sort((a, b) => a.label.localeCompare(b.label, 'es'));
    nodes.forEach((n) => {
      if (n.children?.length) sortTree(n.children);
    });
  };
  // Ordena subcategorias alfabeticamente, pero respeta el orden fijo del nivel raiz.
  sortTree(roots);
  const orderChildren = (parentSlug, orderList) => {
    const order = orderList.map((name) => slugify(name));
    const idx = new Map(order.map((s, i) => [s, i]));
    return (a, b) => {
      const ia = idx.has(a.slug) ? idx.get(a.slug) : 9999;
      const ib = idx.has(b.slug) ? idx.get(b.slug) : 9999;
      if (ia !== ib) return ia - ib;
      return a.label.localeCompare(b.label, 'es');
    };
  };
  roots.forEach((r) => {
    if (r.slug === slugify('Cotillon') && r.children?.length) {
      r.children.sort(orderChildren(r.slug, COTILLON_ORDER));
      r.children.forEach((c) => {
        if (c.slug === slugify('Velas') && c.children?.length) {
          c.children.sort(orderChildren(c.slug, VELAS_ORDER));
        }
      });
    }
    if (r.slug === slugify('Globos y Piñatas') && r.children?.length) {
      r.children.sort(orderChildren(r.slug, GLOBOS_ORDER));
      r.children.forEach((c) => {
        if (['9-pulgadas', '10-pulgadas', '12-pulgadas'].includes(c.slug) && c.children?.length) {
          c.children.sort(orderChildren(c.slug, SIZE_ORDER));
        }
      });
    }
    if (r.slug === slugify('Disfraces') && r.children?.length) {
      r.children.sort(orderChildren(r.slug, DISFRACES_ORDER));
    }
    if (r.slug === slugify('Descartables') && r.children?.length) {
      r.children.sort(orderChildren(r.slug, DESCARTABLES_ORDER));
    }
  });
  const orderBySlug = TOP_CATEGORY_ORDER.map((name) => slugify(name));
  const ordered = orderBySlug
    .map((slug) => roots.find((r) => r.slug === slug))
    .filter(Boolean);
  const orderedSlugs = new Set(ordered.map((r) => r.slug));
  const rest = roots.filter((r) => !orderedSlugs.has(r.slug));
  return [...ordered, ...rest];
}

const findBySlug = (nodes, slug) => {
  if (!Array.isArray(nodes) || !slug) return null;
  for (const n of nodes) {
    if (n.slug === slug) return n;
    if (n.children) {
      const f = findBySlug(n.children, slug);
      if (f) return f;
    }
  }
  return null;
};
const getTopLevel = (tree) => tree || [];
const leafSlugs = (node) => {
  if (!node?.children || node.children.length === 0) return [node.slug];
  return node.children.flatMap(leafSlugs);
};

function buildCategoryTreeFromProducts(products) {
  const map = new Map();
  for (const p of products) {
    const c = p.category || p.categoria || 'Sin categoria';
    const s = p.subcategory || p.subcategoria || 'General';
    if (!map.has(c)) map.set(c, new Set());
    map.get(c).add(s);
  }
  const obj = {};
  Array.from(map.keys()).sort().forEach((c) => {
    obj[c] = Array.from(map.get(c)).sort().map((label) => ({ label, children: [] }));
  });
  return obj;
}

function buildCategoryIndex(categories = []) {
  const byId = new Map();
  categories.forEach((c) => {
    const id = c.id ?? c._id;
    if (!id) return;
    byId.set(id, {
      id,
      nombre: c.nombre || c.name || c.label || `Categoria ${id}`,
      parent: c.parent || c.parent_id || c.parentId || null,
    });
  });

  const cache = new Map();
  const getPath = (id) => {
    if (!id) return [];
    if (cache.has(id)) return cache.get(id);
    const node = byId.get(id);
    if (!node) return [];
    const parentPath = node.parent ? getPath(node.parent) : [];
    const path = [...parentPath, node.nombre];
    cache.set(id, path);
    return path;
  };

  return { getPath };
}

function findCategoryIdForSelection(categories = [], catLabel, subLabel) {
  const byId = new Map();
  const byName = new Map();
  const bySlug = new Map();
  categories.forEach((c) => {
    const id = c.id ?? c._id;
    if (!id) return;
    const name = c.nombre || c.name || c.label || c.slug || `Categoria ${id}`;
    const slug = c.slug || slugify(name);
    const parent = c.parent || c.parent_id || c.parentId || null;
    byId.set(id, { id, name, parent });
    const key = norm(name);
    const slugKey = norm(slug);
    if (!byName.has(key)) byName.set(key, []);
    if (!bySlug.has(slugKey)) bySlug.set(slugKey, []);
    byName.get(key).push(id);
    bySlug.get(slugKey).push(id);
  });

  const cache = new Map();
  const getPath = (id) => {
    if (!id) return [];
    if (cache.has(id)) return cache.get(id);
    const node = byId.get(id);
    if (!node) return [];
    const parentPath = node.parent ? getPath(node.parent) : [];
    const path = [...parentPath, node.name];
    cache.set(id, path);
    return path;
  };

  const hasAncestorNamed = (id, ancestorName) => {
    if (!ancestorName) return false;
    const normalizedAncestor = norm(ancestorName);
    const path = getPath(id).map((x) => norm(x));
    return path.includes(normalizedAncestor);
  };

  const candidateCandidates = (value) => {
    if (!value) return [];
    const normalized = norm(value);
    const slug = norm(slugify(value));
    const seen = new Set();
    const out = [];
    const append = (list) => {
      if (!list) return;
      for (const id of list) {
        if (!seen.has(id)) {
          seen.add(id);
          out.push(id);
        }
      }
    };
    append(byName.get(normalized) || []);
    append(bySlug.get(slug) || []);
    for (const [key, ids] of byName.entries()) {
      if (key.includes(normalized) || normalized.includes(key)) append(ids);
    }
    for (const [key, ids] of bySlug.entries()) {
      if (key.includes(slug) || slug.includes(key)) append(ids);
    }
    return out;
  };

  const bestMatchInCandidates = (candidates = [], wantParent) => {
    if (!candidates.length) return null;
    const normalizedParent = norm(wantParent);
    if (!normalizedParent) return candidates[0];
    const withParent = [];
    const withoutParent = [];
    for (const id of candidates) {
      if (hasAncestorNamed(id, normalizedParent)) {
        withParent.push(id);
      } else {
        withoutParent.push(id);
      }
    }
    return withParent[0] || withoutParent[0] || candidates[0];
  };

  if (subLabel) {
    const candidates = candidateCandidates(subLabel);
    return bestMatchInCandidates(candidates, catLabel);
  }

  if (catLabel) {
    const candidates = candidateCandidates(catLabel);
    for (const id of candidates) {
      const node = byId.get(id);
      if (node && !node.parent) return id;
    }
    return candidates[0] || null;
  }
  return null;
}

function applyFiltersToProducts(products, filters) {
  const q = norm((filters.q || '').trim());
  const cat = filters.category || '';
  const sub = filters.subcategory || '';
  return products
    .filter((p) => {
      if (q) {
        const fields = [
          p.nombre,
          p.descripcion,
          p.descripcionCorta,
          p.category,
          p.categoria,
          p.subcategoria,
          p.subsubcategoria,
          p.nombre ? String(p.nombre).toLowerCase() : '',
          p.slug,
          p._id,
          p.id,
          ...(Array.isArray(p.categoria_path) ? p.categoria_path : []),
        ]
          .filter(Boolean)
          .map((f) => norm(f));
        const tokens = q.split(/\s+/).filter(Boolean);
        const matchTokens = tokens.every((token) =>
          fields.some((field) => field.includes(token))
        );
        const idMatch = fields.some((field) => field.includes(q));
        if (!matchTokens && !idMatch) {
          return false;
        }
      }
      const path = Array.isArray(p.categoria_path) && p.categoria_path.length
        ? p.categoria_path
        : [p.category || p.categoria || p.subcategoria || p.subcategory];
      if (cat && !matchInPath(path, cat)) return false;
      if (!sub) return true;
      return matchInPath(path, sub) || sizeGroupMatch(p, sub);
    });
}

function FiltersSidebar({ tree, products, value, onChange, onClear, isMobile }) {
  const categories = Object.keys(tree);

  const setCategory = (cat) => {
    onChange((prev) => ({
      ...prev,
      // Toggle: si se toca la categoria activa, se repliega todo.
      category: prev.category === cat ? '' : cat,
      subcategory: '',
    }));
  };

  const setSubcategory = (cat, sub) => {
    onChange((prev) => ({
      ...prev,
      category: cat,
      // Toggle: si se vuelve a tocar la misma subcategoria, se repliega.
      subcategory: prev.category === cat && prev.subcategory === sub ? '' : sub,
    }));
  };

  const isActiveCat = (cat) => value.category === cat;
  const isActiveSub = (cat, sub) => value.category === cat && value.subcategory === sub;

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="fw-bold">Filtrar</div>
          <button type="button" className="btn btn-link p-0 text-decoration-none" onClick={onClear}>
            Limpiar
          </button>
        </div>

        <div className="mb-3">
          <label className="form-label small text-muted mb-1">Buscar producto</label>
          <div className="input-group">
            <input
              className="form-control"
              placeholder="Por nombre..."
              value={value.q}
              onChange={(e) => onChange((prev) => ({ ...prev, q: e.target.value }))}
            />
            <span className="input-group-text">&#128269;</span>
          </div>
        </div>

        <div className="mb-2 d-flex align-items-center justify-content-between">
          <div className="small text-muted fw-semibold">Categorías</div>
        </div>

        <div className="accordion accordion-flush" id={isMobile ? "accMobile" : "accDesktop"}>
          {categories.map((cat, idx) => {
            const collapseId = `${isMobile ? "m" : "d"}-collapse-${idx}`;
            const headerId = `${isMobile ? "m" : "d"}-head-${idx}`;
            const open = isActiveCat(cat);

            return (
              <div className="accordion-item" key={cat}>
                <h2 className="accordion-header" id={headerId}>
                  <button
                    className={`accordion-button ${open ? "" : "collapsed"} py-2`}
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#${collapseId}`}
                    aria-expanded={open ? "true" : "false"}
                    aria-controls={collapseId}
                    onClick={() => setCategory(cat)}
                  >
                    <span className="me-auto fw-semibold">{cat}</span>
                  </button>
                </h2>

                <div
                  id={collapseId}
                  className={`accordion-collapse collapse ${open ? "show" : ""}`}
                  aria-labelledby={headerId}
                  data-bs-parent={`#${isMobile ? "accMobile" : "accDesktop"}`}
                >
                  <div className="accordion-body py-2">
                    <div className="list-group list-group-flush">
                      <button
                        type="button"
                        className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                          value.category === cat && value.subcategory === "" ? "active" : ""
                        }`}
                        onClick={() => setCategory(cat)}
                      >
                        <span>Ver todo</span>
                      </button>

                      {tree[cat].map((subNode, subIdx) => {
                        const sub = subNode.label;
                        const key = `${cat}::${sub}`;
                        const hasChildren = Array.isArray(subNode.children) && subNode.children.length > 0;
                        const subCollapseId = `${isMobile ? "m" : "d"}-${idx}-sub-${subIdx}`;
                        const subHeaderId = `${isMobile ? "m" : "d"}-${idx}-sub-head-${subIdx}`;
                        const subOpen = isActiveSub(cat, sub);

                        if (!hasChildren) {
                          return (
                            <button
                              key={key}
                              type="button"
                              className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                                isActiveSub(cat, sub) ? "active" : ""
                              }`}
                              onClick={() => setSubcategory(cat, sub)}
                            >
                              <span className="text-truncate" style={{ maxWidth: 180 }}>
                                {sub}
                              </span>
                            </button>
                          );
                        }

                        return (
                          <div className="accordion accordion-flush ms-2" key={key}>
                            <div className="accordion-item">
                              <h2 className="accordion-header" id={subHeaderId}>
                                <button
                                  className={`accordion-button ${subOpen ? "" : "collapsed"} py-2`}
                                  type="button"
                                  data-bs-toggle="collapse"
                                  data-bs-target={`#${subCollapseId}`}
                                  aria-expanded={subOpen ? "true" : "false"}
                                  aria-controls={subCollapseId}
                                  onClick={() => setSubcategory(cat, sub)}
                                >
                                  <span className="me-auto">{sub}</span>
                                </button>
                              </h2>
                              <div
                                id={subCollapseId}
                                className={`accordion-collapse collapse ${subOpen ? "show" : ""}`}
                                aria-labelledby={subHeaderId}
                              >
                                <div className="accordion-body py-2">
                                  <div className="list-group list-group-flush">
                                    {subNode.children.map((leaf) => {
                                      const leafKey = `${cat}::${leaf}`;
                                      return (
                                        <button
                                          key={leafKey}
                                          type="button"
                                          className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                                            isActiveSub(cat, leaf) ? "active" : ""
                                          }`}
                                          onClick={() => setSubcategory(cat, leaf)}
                                        >
                                          <span className="text-truncate" style={{ maxWidth: 170 }}>
                                            {leaf}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 small text-muted">
          <div className="fw-semibold mb-1">Seleccion:</div>
          <div>
            {value.category ? (
              <>
                <span className="badge text-bg-dark me-2">{value.category}</span>
                {value.subcategory && <span className="badge text-bg-secondary">{value.subcategory}</span>}
              </>
            ) : (
              <span>Ninguna</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  ));

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, [query]);

  return matches;
}

export default function Productos() {
  const { addToCart } = useCart();
  const { isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const gridTopRef = useRef(null);
  const resultsScrollRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 992px)');
  const [scrollProgress, setScrollProgress] = useState(0);

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [search, setSearch] = useState(qs.get('search') || '');
  const [searchDebounced, setSearchDebounced] = useState((qs.get('search') || '').trim());
  const [sortKey, setSortKey] = useState(qs.get('sort') || 'relevancia');
  const [cat, setCat] = useState(qs.get('cat') || '');
  const [subcat, setSubcat] = useState(qs.get('subcat') || '');
  const [catTree, setCatTree] = useState(null);
  const categoryIndex = useMemo(() => buildCategoryIndex(catTree || []), [catTree]);
  const [offers, setOffers] = useState([]);
  const [filterTick, setFilterTick] = useState(0);
  const [consultOpen, setConsultOpen] = useState(false);
  const [consultProduct, setConsultProduct] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [detailImage, setDetailImage] = useState('');
  const [detailImageIndex, setDetailImageIndex] = useState(0);
  const [detailQty, setDetailQty] = useState('1');
  const [consultForm, setConsultForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [cardQtyByKey, setCardQtyByKey] = useState({});
  const [selectedAttrs, setSelectedAttrs] = useState({});
  const [remote, setRemote] = useState([]);
  const [totalRemote, setTotalRemote] = useState(0);
  const [pagesRemote, setPagesRemote] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const lastSearchRef = useRef(search);
  const lastDebouncedRef = useRef(searchDebounced);
  const searchDebounceRef = useRef(null);
  const remoteRequestRef = useRef(0);

  const initialPer = Number(qs.get('per') || 12);
  const initialPage = Number(qs.get('page') || 1);
  const [per, setPer] = useState([12, 24, 48].includes(initialPer) ? initialPer : 12);
  const [page, setPage] = useState(initialPage > 0 ? initialPage : 1);

  // Sincroniza filtros con la URL
  useEffect(() => {
    const params = new URLSearchParams();
    const debouncedSearch = searchDebounced.trim();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (cat) params.set('cat', cat);
    if (subcat) params.set('subcat', subcat);
    if (sortKey !== 'relevancia') params.set('sort', sortKey);
    if (per !== 12) params.set('per', String(per));
    if (page !== 1) params.set('page', String(page));
    navigate({ pathname: '/productos', search: params.toString() }, { replace: true });
  }, [searchDebounced, cat, subcat, sortKey, per, page, navigate]);

  // Debounce de b?squeda: evita request en cada key
  useEffect(() => {
    const searchValue = search.trim();
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchDebounced(searchValue);
    }, 260);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search]);

  useEffect(() => {
    if (lastDebouncedRef.current === searchDebounced) return;
    lastDebouncedRef.current = searchDebounced;
    setPage(1);
  }, [searchDebounced]);

  // Actualiza estado al cambiar la URL (p. ej. b?squedas desde el header)
  useEffect(() => {
    const nextSearch = (qs.get('search') || '').trim();
    const nextCat = qs.get('cat') || '';
    const nextSubcat = qs.get('subcat') || '';
    const nextSort = qs.get('sort') || 'relevancia';
    const perParam = Number(qs.get('per') || 12);
    const nextPer = [12, 24, 48].includes(perParam) ? perParam : 12;
    const pageParam = Number(qs.get('page') || 1);
    const nextPage = pageParam > 0 ? pageParam : 1;

    const searchChanged = nextSearch !== lastSearchRef.current;
    const categoryChanged = nextCat !== cat || nextSubcat !== subcat;

    setSearch(nextSearch);
    setSearchDebounced(nextSearch);
    setCat(nextCat);
    setSubcat(nextSubcat);
    setSortKey(nextSort);
    setPer(nextPer);
    setPage(searchChanged || categoryChanged ? 1 : nextPage);
    lastSearchRef.current = nextSearch;
  }, [location.search]);

  // Carga categor?as para ?rbol y resoluci?n por id
  useEffect(() => {
    let alive = true;
    async function run() {
      try {
        const data = await api.products.categories();
        const list = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        if (alive) setCatTree(list);
      } catch {
        if (alive) setCatTree([]);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, []);

  // Ofertas activas
  useEffect(() => {
    let alive = true;
    async function loadOffers() {
      try {
        const data = await api.products.offers();
        const list = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        if (alive) setOffers(list);
      } catch {
        if (alive) setOffers([]);
      }
    }
    loadOffers();
    return () => {
      alive = false;
    };
  }, []);

  // Carga remota con paginado (r?pido)
  useEffect(() => {
    const requestId = ++remoteRequestRef.current;
    let alive = true;
    async function run() {
      setErr('');
      setLoading(true);
      try {
        const q = searchDebounced.trim() || undefined;
        const categoryIdParam = findCategoryIdForSelection(catTree || [], cat, subcat);
        const data = await api.products.list({
          q,
          page,
          limit: per,
          sort: sortKey,
          category_id: categoryIdParam || undefined,
          category: categoryIdParam ? undefined : (cat ? slugify(cat) : undefined),
          filter_tick: filterTick || undefined,
        });
        if (!alive || requestId !== remoteRequestRef.current) return;

        const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        const mapped = items.map((p) => {
          const remoteImages = Array.isArray(p.images) ? p.images : [];
          const normalizedImages = remoteImages
            .map((x) => normalizeImageUrl(x))
            .filter(Boolean);
          const singleFallback = normalizeImageUrl(p.imageUrl || p.image_url || p.imagen || '');
          const images = [...new Set([singleFallback, ...normalizedImages].filter(Boolean))];
          const img = images[0] || `https://placehold.co/600x400?text=${encodeURIComponent(p.name || 'Producto')}`;
          const offer = offers.find((o) => {
            const pid = o.producto ?? o.product;
            const cid = o.categoria ?? o.category;
            const now = Date.now();
            const startsOk = !o.empieza || new Date(o.empieza).getTime() <= now;
            const endsOk = !o.termina || new Date(o.termina).getTime() >= now;
            const active = o.activo !== false && startsOk && endsOk;
            if (!active) return false;
            if (pid && (String(pid) === String(p._id) || String(pid) === String(p.id))) return true;
            if (cid && p.category?.id && String(cid) === String(p.category.id)) return true;
            return false;
          });
          const precioOriginal = Number(p.priceOriginal ?? p.precioOriginal ?? p.price ?? p.precio ?? 0);
          const precioBaseRaw = Number(p.price ?? p.precio ?? precioOriginal);
          const precioBase = precioBaseRaw > 0 ? precioBaseRaw : precioOriginal;
          let descuentoPct = Number(p.discount?.percent ?? p.descuento?.percent ?? offer?.porcentaje ?? 0);
          if (!descuentoPct && precioOriginal > 0 && precioBase < precioOriginal) {
            descuentoPct = Math.max(0, Math.round((1 - (precioBase / precioOriginal)) * 100));
          }
          const precio = descuentoPct ? +(precioOriginal * (1 - descuentoPct / 100)).toFixed(2) : precioBase;
          const descuento = descuentoPct
            ? { percent: descuentoPct, ...(p.discount || p.descuento || {}), offerId: offer?.id || offer?._id }
            : null;
          const categoryObj = p.categoria || p.category || null;
          const rawAttributes = p.attributes || p.atributos || {};
          const rawAttributesStock = p.attributes_stock || p.atributos_stock || {};
          const rawAttributesPrice = p.attributes_price || p.atributos_precio || {};
          const attributes = Object.entries(rawAttributes).reduce((acc, [k, v]) => {
            if (!k) return acc;
            const values = Array.isArray(v) ? v : (v ? [v] : []);
            const cleaned = values.map((x) => String(x).trim()).filter(Boolean);
            if (cleaned.length) acc[k] = cleaned;
            return acc;
          }, {});
          const categoryId = categoryObj?.id || p.categoria_id || p.category_id || null;
          const categoryPath = categoryIndex.getPath(categoryId);
          const categoryName = categoryObj?.nombre || categoryObj?.name || categoryObj?.label || categoryPath[categoryPath.length - 1] || '';
          const subcategoryName = categoryPath.length > 1 ? categoryPath[categoryPath.length - 2] : (p.subcategory?.name || p.subcategory || p.subcategoria || '');
          const activo = (p.active ?? p.activo ?? true) !== false;
          return {
            id: p._id || p.id || p.slug,
            nombre: normalizeProductName(p.name || p.nombre || 'Producto'),
            precio,
            precioOriginal,
            descuento,
            videoUrl: p.videoUrl || p.video_url || '',
            imagen: img,
            imagenes: images.length ? images : [img],
            categoria: categoryName || 'General',
            categoria_id: categoryId,
            categoria_slug: categoryObj?.slug || (categoryName ? slugify(categoryName) : 'general'),
            subcategoria: subcategoryName,
            subcategoria_slug: '',
            categoria_path: categoryPath.length ? categoryPath : (categoryName ? [categoryName] : []),
            activo,
            atributos: attributes,
            atributos_stock: rawAttributesStock,
            atributos_precio: rawAttributesPrice,
            stock: Number(p.stock ?? 0),
          };
        });
        const mergedMapped = mergeSpecificUnitAndDozenProducts(
          fixSpecificGloboDuplicate(mergeSpecialColorProducts(mapped))
        );
        const cleanedMapped = dedupeSpecificGloboX1(mergedMapped);
        if (!alive || requestId !== remoteRequestRef.current) return;
        setRemote(
          cleanedMapped.filter(
            (p) =>
              p.activo &&
              !shouldHideKnownBadGloboVariant(p.nombre) &&
              !shouldHideUnitDozenVariant(p)
          )
        );
        setTotalRemote(Number(data?.total) || cleanedMapped.length || 0);
        setPagesRemote(
          Number(data?.pages) || Math.max(1, Math.ceil((Number(data?.total) || cleanedMapped.length || 0) / per))
        );
      } catch (e) {
        if (alive && requestId === remoteRequestRef.current) {
          setErr(e?.message || 'No se pudieron cargar productos');
          setRemote([]);
          setTotalRemote(0);
          setPagesRemote(1);
        }
      } finally {
        if (alive && requestId === remoteRequestRef.current) {
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [searchDebounced, page, per, categoryIndex, cat, subcat, filterTick, sortKey, offers.length]);

  // Fallback local (solo si falla backend)
  const localFiltered = useMemo(
    () => applyFiltersToProducts(productosData, { q: searchDebounced, category: cat, subcategory: subcat }),
    [searchDebounced, cat, subcat]
  );
  const usingFallback = !!err;
  const baseListRaw = usingFallback ? localFiltered : remote;
  const baseList = useMemo(
    () => mergeSpecificUnitAndDozenProducts(dedupeSpecificGloboX1(baseListRaw)).filter((p) => !shouldHideUnitDozenVariant(p)),
    [baseListRaw]
  );
  const appliedFilters = { q: searchDebounced, category: cat, subcategory: subcat };
  const filteredByFacets = usingFallback
    ? applyFiltersToProducts(baseList, appliedFilters)
    : baseList;
  const sortedByFacets = useMemo(() => {
    if (!usingFallback) return filteredByFacets;
    const sorter = SORTERS[sortKey]?.fn;
    if (!sorter || sortKey === 'relevancia') return filteredByFacets;
    return [...filteredByFacets].sort(sorter);
  }, [filteredByFacets, sortKey, usingFallback]);
  const categoryTree = useMemo(() => {
    if (catTree?.length) {
      const byId = new Map();
      catTree.forEach((c) => {
        const label = c.nombre || c.name || c.label;
        if (!label) return;
        byId.set(c.id, { label, children: [] });
      });
      const roots = [];
      byId.forEach((node, id) => {
        const cat = catTree.find((c) => c.id === id);
        const parentId = cat?.parent || cat?.parent_id || cat?.parentId;
        if (parentId) {
          const parent = byId.get(parentId);
          if (parent) parent.children.push(node);
        } else {
          roots.push(node);
        }
      });
      const obj = {};
      const cotillonOrder = [
        'Velas',
        'Vinchas y Coronas',
        'Gorros y Sombreros',
        'Antifaces',
        'Carioca',
      ];
      const velasOrder = [
        'Velas con Palito',
        'Velas Importadas',
        'Bengalas',
        'Velas con Luz',
        'Vela Escudo de Futbol',
        'Velas Estrellita',
      ];
      const globosOrder = [
        'Numero Metalizados',
        'Globos con Forma',
        'Set de Globos',
        '9 Pulgadas',
        '10 Pulgadas',
        '12 Pulgadas',
        'Globologia',
        'Piñatas',
        'Accesorios',
      ];
      const sizeOrder = ['Perlado', 'Liso'];
      const disfracesOrder = [
        'Extensiones Pelucas y Pintura',
        'Maquillaje',
        'Caretas',
        'Tutus',
        'Alas',
      ];
      const descartablesOrder = [
        'Bandejas Carton',
        'Bandejas Plasticas',
        'Manteles',
        'Cubiertos',
        'Platos',
        'Potes',
        'Servilletas',
        'Vasos y Copas',
        'Blondas',
      ];
      const reposteriaOrder = [
        'Parpen',
        'Lodiser',
        'Ballina',
        'Dewey',
        'Comestibles',
        'Placas Plasticas',
        'Decoracion Tortas-Topper',
        'Moldes',
      ];
      const decoTopperChildren = [
        'Adornos Telgopor',
      ];
      const normKey = (v) =>
        String(v || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
      roots.forEach((r) => {
        if (normKey(r.label) === 'cotillon') {
          const ordered = [];
          const byLabel = new Map(r.children.map((c) => [normKey(c.label), c]));
          if (!byLabel.has(normKey('Velas'))) {
            byLabel.set(normKey('Velas'), { label: 'Velas', children: [] });
          }
          cotillonOrder.forEach((name) => {
            if (!byLabel.has(normKey(name))) {
              byLabel.set(normKey(name), { label: name, children: [] });
            }
          });
          cotillonOrder.forEach((name) => {
            const node = byLabel.get(normKey(name));
            if (node) ordered.push(node);
          });
          const remaining = r.children.filter((c) => !ordered.includes(c));
          r.children = [...ordered, ...remaining];
          r.children.forEach((c) => {
            if (normKey(c.label) === 'velas') {
              const byLabel2 = new Map((c.children || []).map((cc) => [normKey(cc.label), cc]));
              velasOrder.forEach((name) => {
                if (!byLabel2.has(normKey(name))) {
                  byLabel2.set(normKey(name), { label: name, children: [] });
                }
              });
              const orderedVelas = velasOrder.map((name) => byLabel2.get(normKey(name))).filter(Boolean);
              const restVelas = c.children.filter((cc) => !orderedVelas.includes(cc));
              c.children = [...orderedVelas, ...restVelas];
            }
          });
        } else if (normKey(r.label) === 'globos y pinatas') {
          const ordered = [];
          const byLabel = new Map(r.children.map((c) => [normKey(c.label), c]));
          globosOrder.forEach((name) => {
            const node = byLabel.get(normKey(name));
            if (node) ordered.push(node);
          });
          const remaining = r.children.filter((c) => !ordered.includes(c));
          r.children = [...ordered, ...remaining];
          r.children.forEach((c) => {
            if (['9 pulgadas', '10 pulgadas', '12 pulgadas'].includes(normKey(c.label))) {
              const byLabel2 = new Map(c.children.map((cc) => [normKey(cc.label), cc]));
              const orderedSizes = sizeOrder.map((name) => byLabel2.get(normKey(name))).filter(Boolean);
              const restSizes = c.children.filter((cc) => !orderedSizes.includes(cc));
              c.children = [...orderedSizes, ...restSizes];
            }
          });
        } else if (normKey(r.label) === 'disfraces') {
          const ordered = [];
          const byLabel = new Map(r.children.map((c) => [normKey(c.label), c]));
          disfracesOrder.forEach((name) => {
            if (!byLabel.has(normKey(name))) {
              byLabel.set(normKey(name), { label: name, children: [] });
            }
          });
          disfracesOrder.forEach((name) => {
            const node = byLabel.get(normKey(name));
            if (node) ordered.push(node);
          });
          const remaining = r.children.filter((c) => !ordered.includes(c));
          r.children = [...ordered, ...remaining];
        } else if (normKey(r.label) === 'descartables') {
          const ordered = [];
          const byLabel = new Map(r.children.map((c) => [normKey(c.label), c]));
          descartablesOrder.forEach((name) => {
            if (!byLabel.has(normKey(name))) {
              byLabel.set(normKey(name), { label: name, children: [] });
            }
          });
          descartablesOrder.forEach((name) => {
            const node = byLabel.get(normKey(name));
            if (node) ordered.push(node);
          });
          const remaining = r.children.filter((c) => !ordered.includes(c));
          r.children = [...ordered, ...remaining];
        } else if (normKey(r.label) === 'reposteria') {
          const ordered = [];
          const byLabel = new Map(r.children.map((c) => [normKey(c.label), c]));
          reposteriaOrder.forEach((name) => {
            if (!byLabel.has(normKey(name))) {
              byLabel.set(normKey(name), { label: name, children: [] });
            }
          });
          reposteriaOrder.forEach((name) => {
            const node = byLabel.get(normKey(name));
            if (node) ordered.push(node);
          });
          const remaining = r.children.filter((c) => !ordered.includes(c));
          r.children = [...ordered, ...remaining];
          r.children.forEach((c) => {
            if (normKey(c.label) === normKey('Decoracion Tortas-Topper')) {
              const byLabel2 = new Map((c.children || []).map((cc) => [normKey(cc.label), cc]));
              decoTopperChildren.forEach((name) => {
                if (!byLabel2.has(normKey(name))) {
                  byLabel2.set(normKey(name), { label: name, children: [] });
                }
              });
              c.children = decoTopperChildren.map((name) => byLabel2.get(normKey(name))).filter(Boolean);
            }
          });
        } else {
          r.children.sort((a, b) => a.label.localeCompare(b.label, 'es'));
        }
      });
      roots.forEach((r) => {
        obj[r.label] = r.children.map((c) => ({
          label: c.label,
          children: (c.children || []).map((cc) => cc.label),
        }));
      });
      if (Object.keys(obj).length > 0) return obj;
    }
    return buildCategoryTreeFromProducts(baseList);
  }, [baseList, catTree]);
  const handleAppliedChange = (updater) => {
    const next = typeof updater === 'function' ? updater(appliedFilters) : updater;
    setSearch(next.q ?? '');
    setSearchDebounced((next.q || '').trim());
    setCat(next.category ?? '');
    setSubcat(next.subcategory ?? '');
    setPage(1);
    setFilterTick((t) => t + 1);
  };
  const clearAll = () => {
    handleAppliedChange({ q: '', category: '', subcategory: '' });
  };
  const total = usingFallback ? filteredByFacets.length : totalRemote;
  const totalPages = usingFallback ? Math.max(1, Math.ceil(total / per)) : Math.max(1, pagesRemote || 1);
  const safePage = Math.min(page, totalPages);
  const startIdx = total === 0 ? 0 : ((safePage - 1) * per + 1);
  const paginated = usingFallback
    ? sortedByFacets.slice((safePage - 1) * per, safePage * per)
    : sortedByFacets;
  const endIdx = total === 0 ? 0 : ((safePage - 1) * per + paginated.length);
  const seoTree = Array.isArray(categoryTree) ? categoryTree : [];
  const seoCategoryNode = cat ? findBySlug(seoTree, cat) : null;
  const seoSubcategoryNode = subcat ? findBySlug(seoTree, subcat) : null;
  const seoCategoryLabel = seoSubcategoryNode?.label || seoCategoryNode?.label || '';
  const seoTitle = seoCategoryLabel
    ? `Catalogo mayorista ${seoCategoryLabel}`
    : 'Catalogo mayorista de cotillon';
  const seoDescription = normalizeText(
    `${seoTitle}. ${total} productos disponibles${searchDebounced ? ` para "${searchDebounced}"` : ''}.`
  );
  const seoPath = `/productos${location.search || ''}`;
  const seoSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: seoTitle,
      description: seoDescription,
      url: toAbsoluteUrl(seoPath),
      isPartOf: {
        '@type': 'WebSite',
        name: 'CotiStore',
        url: toAbsoluteUrl('/'),
      },
    }),
    [seoDescription, seoPath, seoTitle]
  );

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  useEffect(() => {
    if (resultsScrollRef.current) {
      resultsScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (gridTopRef.current) {
      const y = gridTopRef.current.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, [safePage]);

  useEffect(() => {
    const el = resultsScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      const pct = maxScroll > 0 ? (el.scrollTop / maxScroll) * 100 : 0;
      setScrollProgress(Math.max(0, Math.min(100, pct)));
    };
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [paginated.length, loading, total, safePage, cat, subcat, search]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const items = [];
    const maxButtons = 11; // muestra mas paginas para navegar mejor
    const side = 2; // cuantas a cada lado
    const go = (p) => setPage(Math.max(1, Math.min(totalPages, p)));

    items.push(
      <Pagination.First key="first" disabled={safePage === 1} onClick={() => go(1)} />,
      <Pagination.Prev key="prev" disabled={safePage === 1} onClick={() => go(safePage - 1)} />
    );

    if (totalPages <= maxButtons) {
      for (let p = 1; p <= totalPages; p++) {
        items.push(
          <Pagination.Item key={p} active={p === safePage} onClick={() => go(p)}>
            {p}
          </Pagination.Item>
        );
      }
    } else {
      const start = Math.max(2, safePage - side);
      const end = Math.min(totalPages - 1, safePage + side);

      items.push(
        <Pagination.Item key={1} active={safePage === 1} onClick={() => go(1)}>
          1
        </Pagination.Item>
      );
      if (start > 2) items.push(<Pagination.Ellipsis key="ell-start" disabled />);

      for (let p = start; p <= end; p++) {
        items.push(
          <Pagination.Item key={p} active={p === safePage} onClick={() => go(p)}>
            {p}
          </Pagination.Item>
        );
      }

      if (end < totalPages - 1) items.push(<Pagination.Ellipsis key="ell-end" disabled />);
      items.push(
        <Pagination.Item key={totalPages} active={safePage === totalPages} onClick={() => go(totalPages)}>
          {totalPages}
        </Pagination.Item>
      );
    }

    items.push(
      <Pagination.Next key="next" disabled={safePage === totalPages} onClick={() => go(safePage + 1)} />,
      <Pagination.Last key="last" disabled={safePage === totalPages} onClick={() => go(totalPages)} />
    );

    return (
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div className="text-muted small">
          Pagina {safePage} de {totalPages} · {total} productos
        </div>
        <Pagination className="mb-0">{items}</Pagination>
      </div>
    );
  };

  const openConsult = (product) => {
    setConsultProduct(product);
    setConsultForm({
      name: '',
      email: '',
      phone: '',
      message: product?.nombre ? `Consulta por: ${product.nombre}` : ''
    });
    setConsultOpen(true);
  };

  const openDetail = (product) => {
    const imgs = Array.isArray(product?.imagenes) && product.imagenes.length
      ? product.imagenes
      : [product?.imagen].filter(Boolean);
    setDetailProduct(product);
    setDetailImage(imgs[0] || '');
    setDetailImageIndex(0);
    setDetailQty('1');
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailProduct(null);
    setDetailImage('');
    setDetailImageIndex(0);
  };

  const moveDetailImage = (step) => {
    if (!detailProduct?.imagenes?.length) return;
    const total = detailProduct.imagenes.length;
    const next = ((detailImageIndex + step) % total + total) % total;
    setDetailImageIndex(next);
    setDetailImage(detailProduct.imagenes[next] || '');
  };

  const getProductKey = (p) => String(p?.id || `${p?.categoria}-${p?.nombre}`);

  const getCardQty = (p, max = 999) => {
      const key = getProductKey(p);
      const raw = Number(cardQtyByKey[key]);
      const safe = Number.isFinite(raw) ? Math.trunc(raw) : 1;
      return Math.max(1, Math.min(max, safe || 1));
    };

  const getCardQtyInputValue = (p) => {
    const key = getProductKey(p);
    const raw = cardQtyByKey[key];
    if (raw === '') return '';
    if (raw === null || raw === undefined) return '1';
    return String(raw);
  };

  const getAttributeOptions = (attrName, values, product) => {
    const list = Array.isArray(values) ? values : (values ? [values] : []);
    const cleaned = list.map((v) => String(v).trim()).filter(Boolean);
    const normalizedName = norm(attrName || '');
    const hasNumberName = normalizedName.includes('numero');
    const productName = norm(product?.nombre || '');
    const asksNumberInName = productName.includes('elegir numero');
    const placeholderLike =
      cleaned.length <= 1 &&
      cleaned.some((v) => /elegir|numero|n[úu]mero/i.test(v));
    // Si el producto es de "elegir numero", forzamos 0..9 aunque llegue solo un valor.
    if (hasNumberName && (asksNumberInName || placeholderLike || cleaned.length <= 1)) {
      return Array.from({ length: 10 }, (_, i) => String(i));
    }
    return cleaned;
  };

  const getSelectedAttributes = (p) => {
    const key = getProductKey(p);
    const current = selectedAttrs[key] || {};
    const out = {};
    const attrs = p?.atributos || {};
    Object.entries(attrs).forEach(([attrName, values]) => {
      const list = getAttributeOptions(attrName, values, p);
      if (!list.length) return;
      out[attrName] = current[attrName] || String(list[0]);
    });
    return out;
  };

  const getEffectiveBasePrice = (product, attrs = {}) => {
    const genericVariantPrice = getGenericVariantPrice(product, attrs);
    if (Number.isFinite(Number(genericVariantPrice)) && Number(genericVariantPrice) > 0) return Number(genericVariantPrice);
    const modelSel = attrs?.Modelo || attrs?.modelo;
    const qtySel = attrs?.Cantidad || attrs?.cantidad || attrs?.Presentacion || attrs?.presentacion;
    const comboMap = product?.precio_por_combinacion;
    if (comboMap && typeof comboMap === 'object' && modelSel && qtySel) {
      const comboKey = `${modelSel}||${qtySel}`;
      const comboPrice = Number(comboMap[comboKey]);
      if (Number.isFinite(comboPrice) && comboPrice > 0) return comboPrice;
    }
    const map = product?.precio_por_presentacion;
    if (!map || typeof map !== 'object') {
      const base = Number(product?.precio ?? 0);
      const original = Number(product?.precioOriginal ?? 0);
      return base > 0 ? base : original;
    }
    const selected = qtySel;
    const bySelection = selected ? Number(map[selected]) : NaN;
    if (Number.isFinite(bySelection) && bySelection > 0) return bySelection;
    const first = Object.values(map).find((v) => Number.isFinite(Number(v)));
    if (Number.isFinite(Number(first)) && Number(first) > 0) return Number(first);
    const base = Number(product?.precio ?? 0);
    const original = Number(product?.precioOriginal ?? 0);
    return base > 0 ? base : original;
  };

  const getEffectiveOriginalPrice = (product, attrs = {}) => {
    const basePrice = getEffectiveBasePrice(product, attrs);
    return basePrice > 0 ? basePrice : Number(product?.precioOriginal ?? product?.precio ?? 0);
  };

  const getEffectivePrice = (product, attrs = {}) => {
    const original = getEffectiveOriginalPrice(product, attrs);
    const discountPct = Number(product?.descuento?.percent ?? 0);
    if (discountPct > 0 && original > 0) {
      return +(original * (1 - discountPct / 100)).toFixed(2);
    }
    return original;
  };

  const resolveProductForCart = (product, attrs = {}) => {
    const selectedModel = attrs?.Modelo || attrs?.modelo;
    const selectedPresentation = attrs?.Cantidad || attrs?.cantidad || attrs?.Presentacion || attrs?.presentacion;
    const price = getEffectivePrice(product, attrs);
    const originalPrice = getEffectiveOriginalPrice(product, attrs);
    const comboKey = selectedModel && selectedPresentation ? `${selectedModel}||${selectedPresentation}` : null;
    const comboIds = product?.product_id_por_combinacion || {};
    const comboStock = product?.stock_por_combinacion || {};
    const mapIds = product?.product_id_por_presentacion || {};
    const mapStock = product?.stock_por_presentacion || {};
    const resolvedProductId = comboKey ? (comboIds[comboKey] ?? null) : (selectedPresentation ? mapIds[selectedPresentation] : null);
    const resolvedStock = comboKey ? (comboStock[comboKey] ?? null) : (selectedPresentation ? mapStock[selectedPresentation] : null);
    return {
      ...product,
      precio: Number(price),
      precioOriginal: Number(originalPrice),
      sourceProductId: resolvedProductId || product.sourceProductId || product.id || product._id || null,
      maxStock: Number.isFinite(Number(resolvedStock)) ? Number(resolvedStock) : Number(product.stock ?? 0),
    };
  };

  const getVariantStock = (p, attrs) => {
    const stockMap = p?.atributos_stock;
    if (!stockMap || typeof stockMap !== 'object') return null;
    let min = null;
    Object.entries(attrs || {}).forEach(([k, v]) => {
      const byAttr = stockMap[k];
      if (!byAttr || typeof byAttr !== 'object') return;
      const val = byAttr[v];
      if (val === undefined || val === null) return;
      const num = Number(val);
      if (!Number.isFinite(num)) return;
      if (min === null) min = num;
      else min = Math.min(min, num);
    });
    return min;
  };

  const closeConsult = () => {
    setConsultOpen(false);
    setConsultProduct(null);
  };

  const submitConsult = (e) => {
    e.preventDefault();
    // Placeholder: integracion futura (email / WhatsApp / backend)
    setConsultOpen(false);
  };

  const detailAttrs = detailProduct ? getSelectedAttributes(detailProduct) : {};
  const detailPriceValue = detailProduct ? getEffectivePrice(detailProduct, detailAttrs) : 0;
  const detailPriceOriginalValue = detailProduct ? getEffectiveOriginalPrice(detailProduct, detailAttrs) : 0;

  return (
    <>
      <Seo
        title={seoTitle}
        description={seoDescription}
        path={seoPath}
        jsonLd={seoSchema}
      />
      <Container className="catalog-page py-4">
      <div className="catalog-toolbar">
        <div className="catalog-summary">
          <h2 className="catalog-title">Catálogo</h2>
          <div className="catalog-subtitle">Mostrando {total} productos</div>
        </div>
        <div className="catalog-controls">
          {err && <span className="text-danger small me-2">{err}</span>}
          <Dropdown align="end">
            <Dropdown.Toggle size="sm" variant="light" className="catalog-select">
              {SORTERS[sortKey].label}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              {Object.entries(SORTERS).map(([k, v]) => (
                <Dropdown.Item key={k} active={k === sortKey} onClick={() => setSortKey(k)}>
                  {v.label}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
          <Form.Select
            size="sm"
            value={per}
            onChange={(e) => setPer(Number(e.target.value))}
            className="catalog-select"
            aria-label="Cantidad por pagina"
          >
            <option value={12}>12 / pag</option>
            <option value={24}>24 / pag</option>
            <option value={48}>48 / pag</option>
          </Form.Select>
        </div>
      </div>

      <Row className="g-4 catalog-body">
        <Col xs={12} lg={3}>
          <div className="catalog-filters-sticky">
            <FiltersSidebar
              tree={categoryTree}
              products={baseList}
              value={appliedFilters}
              onChange={handleAppliedChange}
              onClear={clearAll}
              isMobile={isMobile}
            />
          </div>
        </Col>

        <Col xs={12} lg={9}>
          <div className="catalog-scroll-shell" ref={resultsScrollRef}>
          <div className="catalog-progress-track" aria-hidden="true">
            <div className="catalog-progress-fill" style={{ height: `${scrollProgress}%` }} />
          </div>
          <div ref={gridTopRef} />
          {loading && (
            <div className="text-center py-4"><Spinner animation="border" /></div>
          )}
        {(() => {
          const chips = [];
          if (cat) chips.push(cat);
          if (subcat) chips.push(subcat);
          if (searchDebounced.trim()) chips.push(`"${searchDebounced.trim()}"`);

          if (!chips.length) return null;
          return (
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              {chips.map((c, i) => (
                <Badge key={`${c}-${i}`} bg="warning" text="dark" className="filter-chip">{c}</Badge>
              ))}
              <Button
                size="sm"
                variant="outline-secondary"
                onClick={() => handleAppliedChange({ q: '', category: '', subcategory: '' })}
              >
                Quitar filtros
              </Button>
            </div>
          );
        })()}

          <div className="catalog-results-summary">
            {total === 0
              ? 'Sin resultados'
              : `Mostrando ${startIdx}-${endIdx} de ${total}`}
          </div>

          <Row className="g-4">
            {paginated.map((p) => {
              const attrs = getSelectedAttributes(p);
              const priceValue = getEffectivePrice(p, attrs);
              const priceOriginalValue = getEffectiveOriginalPrice(p, attrs);
              const qtyMax = 999;
              const productKey = getProductKey(p);

              return (
              <Col key={p.id || `${p.categoria}-${p.nombre}`} xs={6} md={4} lg={3}>
                <div
                  className="product-card h-100 d-flex flex-column"
                  onClick={() => openDetail(p)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openDetail(p);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="product-img-wrap">
                    {p.imagen ? (
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/600x400?text=Imagen'; }}
                      />
                    ) : (
                      <div
                        className="d-flex align-items-center justify-content-center bg-light"
                        style={{ height: 160, borderRadius: 8, color: '#9aa' }}
                      >
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <div className="p-3 d-flex flex-column flex-grow-1">
                    <h6 className="product-card-title mb-2">{p.nombre}</h6>
                    {/* Categoria/subcategoria oculta en card para una vista mas limpia */}
                    {p.atributos && Object.keys(p.atributos).length > 0 && (
                      <div className="mb-2">
                        {Object.entries(p.atributos).map(([attrName, values]) => {
                          const list = getAttributeOptions(attrName, values, p);
                          if (!list.length) return null;
                          const key = getProductKey(p);
                          const currentValue = selectedAttrs[key]?.[attrName] || String(list[0]);
                          return (
                            <div key={attrName} className="mb-2">
                              <div className="small text-muted">{attrName}</div>
                              <Form.Select
                                size="sm"
                                value={currentValue}
                                onChange={(e) => {
                                  const nextVal = e.target.value;
                                  setSelectedAttrs((prev) => ({
                                    ...prev,
                                    [key]: { ...(prev[key] || {}), [attrName]: nextVal }
                                  }));
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {list.map((v) => (
                                  <option key={`${attrName}-${v}`} value={String(v)}>
                                    {v}
                                  </option>
                                ))}
                              </Form.Select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <>
                      <div className="product-price mb-3">
                        {!isLoggedIn ? (
                          <span className="text-muted small">Inicia sesion para ver precios</span>
                        ) : p.descuento?.percent ? (
                          <div>
                            <div className="text-muted text-decoration-line-through small">
                              {money.format(Number(priceOriginalValue ?? 0))}
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span>{money.format(Number(priceValue ?? 0))}</span>
                              <Badge bg="success">-{p.descuento.percent}%</Badge>
                            </div>
                          </div>
                        ) : (
                          money.format(Number(priceValue ?? 0))
                        )}
                      </div>

                      <div className="mt-auto">
                        <div className="small text-muted mb-1 product-qty-label">Cantidad</div>
                        <div className="product-add-row">
                          <Form.Control
                            type="number"
                            min={1}
                            max={qtyMax}
                            value={getCardQtyInputValue(p)}
                            size="sm"
                            className="product-qty-input"
                            disabled={!isLoggedIn}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setCardQtyByKey((prev) => ({ ...prev, [productKey]: '' }));
                                return;
                              }
                              const val = Math.max(1, Math.min(qtyMax, Number(raw) || 1));
                              setCardQtyByKey((prev) => ({ ...prev, [productKey]: String(val) }));
                            }}
                            onBlur={() => {
                              const qty = getCardQty(p, qtyMax);
                              setCardQtyByKey((prev) => ({ ...prev, [productKey]: String(qty) }));
                            }}
                            onClick={(e) => e.stopPropagation()}
                            aria-label="Cantidad"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={!isLoggedIn}
                            onClick={(e) => {
                              e.stopPropagation();
                              const qty = getCardQty(p, qtyMax);
                              addToCart(resolveProductForCart(p, attrs), Math.max(1, Math.min(qtyMax, qty)), attrs);
                            }}
                          >
                            {!isLoggedIn ? 'Inicia sesion' : 'Agregar al carrito'}
                          </Button>
                        </div>
                      </div>
                    </>
                  </div>
                </div>
              </Col>
            );
          })}
            {paginated.length === 0 && (
              <Col>
                <div className="empty-state text-center py-5">
                  <div className="display-6 mb-2">:)</div>
                  <p>No hay productos con esos filtros.</p>
                  <Button variant="outline-secondary" size="sm" onClick={() => { setSearch(''); }}>
                    Ver todo
                  </Button>
                </div>
              </Col>
            )}
          </Row>

          <div className="d-flex justify-content-center mt-4">
            {renderPagination()}
          </div>
          </div>
        </Col>
      </Row>

      <Modal
        show={detailOpen}
        onHide={closeDetail}
        size="xl"
        centered={!isMobile}
        fullscreen={isMobile ? true : undefined}
        scrollable
        className="product-detail-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title className="text-truncate">{detailProduct?.nombre || 'Producto'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {detailProduct && (
            <Row className="g-3">
              <Col lg={7}>
                <div className="detail-gallery">
                  <div className="detail-thumbs">
                    {detailProduct.videoUrl ? (
                      <button
                        type="button"
                        className={`detail-thumb-btn ${!detailImage ? 'is-active' : ''}`}
                        onClick={() => setDetailImage('')}
                      >
                        <div className="detail-video-thumb">Video</div>
                      </button>
                    ) : null}
                    {(detailProduct.imagenes || []).map((img, idx) => (
                      <button
                        key={`detail-thumb-${idx}`}
                        type="button"
                        className={`detail-thumb-btn ${detailImage === img ? 'is-active' : ''}`}
                        onClick={() => {
                          setDetailImageIndex(idx);
                          setDetailImage(img);
                        }}
                      >
                        <img src={img} alt={`${detailProduct.nombre} ${idx + 1}`} />
                      </button>
                    ))}
                  </div>
                  <div className="detail-main-image">
                    {detailImage ? (
                      <>
                        {(detailProduct.imagenes || []).length > 1 && (
                          <button type="button" className="detail-main-nav detail-main-prev" onClick={() => moveDetailImage(-1)}>‹</button>
                        )}
                        <img src={detailImage} alt={detailProduct.nombre} />
                        {(detailProduct.imagenes || []).length > 1 && (
                          <button type="button" className="detail-main-nav detail-main-next" onClick={() => moveDetailImage(1)}>›</button>
                        )}
                      </>
                    ) : detailProduct.videoUrl ? (
                      (() => {
                        const embed = getVideoEmbed(detailProduct.videoUrl);
                        if (!embed) return <div className="detail-empty-image">Sin video</div>;
                        if (embed.type === 'video') {
                          return (
                            <video className="detail-video-player" controls preload="metadata">
                              <source src={embed.src} />
                              Tu navegador no soporta video HTML5.
                            </video>
                          );
                        }
                        return (
                          <iframe
                            className="detail-video-player"
                            src={embed.src}
                            title={`Video de ${detailProduct.nombre}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        );
                      })()
                    ) : (
                      <div className="detail-empty-image">Sin imagen</div>
                    )}
                  </div>
                </div>
                {!!(detailProduct.imagenes || []).length && (
                  <div className="small text-muted mt-1">
                    Foto {detailImageIndex + 1} de {(detailProduct.imagenes || []).length}
                  </div>
                )}
              </Col>
              <Col lg={5}>
                <div className="detail-info">
                  <div className="text-muted small mb-1">{detailProduct.categoria || '-'}</div>
                  <h4 className="detail-title mb-2">{detailProduct.nombre}</h4>
                  <div className="fw-bold mb-3">
                    {!isLoggedIn ? (
                      <span className="text-muted small">Inicia sesion para ver precios</span>
                    ) : detailProduct.descuento?.percent ? (
                      <div>
                        <div className="text-muted text-decoration-line-through small">
                          {money.format(Number(detailPriceOriginalValue ?? 0))}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span>{money.format(Number(detailPriceValue ?? 0))}</span>
                          <Badge bg="success">-{detailProduct.descuento.percent}%</Badge>
                        </div>
                      </div>
                    ) : (
                      money.format(Number(detailPriceValue ?? 0))
                    )}
                  </div>

                  {detailProduct.atributos && Object.keys(detailProduct.atributos).length > 0 && (
                    <div className="mb-2">
                      {Object.entries(detailProduct.atributos).map(([attrName, values]) => {
                        const list = getAttributeOptions(attrName, values, detailProduct);
                        if (!list.length) return null;
                        const key = getProductKey(detailProduct);
                        const currentValue = selectedAttrs[key]?.[attrName] || String(list[0]);
                        return (
                          <div key={attrName} className="mb-2">
                            <div className="small text-muted">{attrName}</div>
                            <Form.Select
                              size="sm"
                              value={currentValue}
                              onChange={(e) => {
                                const nextVal = e.target.value;
                                setSelectedAttrs((prev) => ({
                                  ...prev,
                                  [key]: { ...(prev[key] || {}), [attrName]: nextVal }
                                }));
                              }}
                            >
                              {list.map((v) => (
                                <option key={`${attrName}-modal-${v}`} value={String(v)}>{v}</option>
                              ))}
                            </Form.Select>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="small text-muted mb-1">Cantidad</div>
                    <InputGroup style={{ maxWidth: 170 }}>
                        <Form.Control
                          type="number"
                          min={1}
                          value={detailQty}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setDetailQty('');
                              return;
                            }
                            const next = Math.max(1, Number(raw) || 1);
                            setDetailQty(String(next));
                          }}
                          onBlur={() => {
                            const safe = Math.max(1, Number(detailQty) || 1);
                            setDetailQty(String(safe));
                          }}
                        />
                    </InputGroup>
                  </div>

                  <Button
                    variant="primary"
                    className={isMobile ? 'w-100' : ''}
                      disabled={!isLoggedIn}
                      onClick={() => {
                       const safeQty = Math.max(1, Number(detailQty) || 1);
                       addToCart(resolveProductForCart(detailProduct, detailAttrs), safeQty, detailAttrs);
                      }}
                    >
                    {!isLoggedIn ? 'Inicia sesion' : 'Agregar al carrito'}
                  </Button>
                </div>
              </Col>
            </Row>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={consultOpen} onHide={closeConsult} centered>
        <Form onSubmit={submitConsult}>
          <Modal.Header closeButton>
            <Modal.Title>Consultar producto</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="d-flex gap-3 align-items-center mb-3">
              <div className="consult-thumb">
                {consultProduct?.imagen ? (
                  <img
                    src={consultProduct.imagen}
                    alt={consultProduct?.nombre || 'Producto'}
                  />
                ) : (
                  <div className="consult-thumb-placeholder">Sin imagen</div>
                )}
              </div>
              <div className="small text-muted">
                {consultProduct?.nombre || 'Producto sin nombre'}
              </div>
            </div>
            <Form.Group className="mb-3">
              <Form.Label>Nombre completo</Form.Label>
              <Form.Control
                required
                value={consultForm.name}
                onChange={(e) => setConsultForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                required
                value={consultForm.email}
                onChange={(e) => setConsultForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Teléfono (opcional)</Form.Label>
              <Form.Control
                value={consultForm.phone}
                onChange={(e) => setConsultForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Mensaje</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={consultForm.message}
                onChange={(e) => setConsultForm((f) => ({ ...f, message: e.target.value }))}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeConsult}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Enviar
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      </Container>
    </>
  );
}




