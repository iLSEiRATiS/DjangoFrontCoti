import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Container, Row, Col, Button, Dropdown, Badge, Pagination, Form, Spinner, InputGroup, Modal
} from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import productosData from '../data/productos.json';
import api, { API_BASE } from '../lib/api';

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
  const isHiloOro = (name = '') => {
    const s = norm(name);
    return s.includes('hilo') && s.includes('oro') && s.includes('x50mts');
  };
  const isHiloPlata = (name = '') => {
    const s = norm(name);
    return s.includes('hilo') && s.includes('plata') && s.includes('x50mts');
  };

  const oro = products.find((p) => isHiloOro(p?.nombre));
  const plata = products.find((p) => isHiloPlata(p?.nombre));
  if (!oro || !plata) return products;

  const colorAttrName =
    Object.keys(oro.atributos || {}).find((k) => norm(k).includes('color')) ||
    Object.keys(plata.atributos || {}).find((k) => norm(k).includes('color')) ||
    'Color';

  const mergedColors = [];
  const pushColor = (val) => {
    const v = String(val || '').trim();
    if (!v) return;
    if (!mergedColors.some((x) => norm(x) === norm(v))) mergedColors.push(v);
  };

  (oro.atributos?.[colorAttrName] || []).forEach(pushColor);
  (plata.atributos?.[colorAttrName] || []).forEach(pushColor);
  pushColor('Dorado');
  pushColor('Plateado');

  const merged = {
    ...oro,
    id: `merged-${oro.id || 'hilo-oro-plata'}`,
    nombre: 'Hilo Oro/Plata x50mts (Elegir Color)',
    atributos: {
      ...(oro.atributos || {}),
      ...(plata.atributos || {}),
      [colorAttrName]: mergedColors,
    },
  };

  return [merged, ...products.filter((p) => p !== oro && p !== plata)];
}

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

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
  'Decoración Led',
  'Luminoso',
  'Librería',
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
  'Artículos Para Manualidades',
  'Artículos Para Comunión',
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
  'Vela Escudo de Fútbol',
  'Velas Estrellita',
];

const GLOBOS_ORDER = [
  'Número Metalizados',
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
  'Tutús',
  'Alas',
];

const DESCARTABLES_ORDER = [
  'Bandejas Cartón',
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
  // Ordena subcategorías alfabéticamente, pero respeta el orden fijo del nivel raíz.
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
    const c = p.category || p.categoria || 'Sin categoría';
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
  categories.forEach((c) => {
    const id = c.id ?? c._id;
    if (!id) return;
    const name = c.nombre || c.name || c.label || `Categoria ${id}`;
    const parent = c.parent || c.parent_id || c.parentId || null;
    byId.set(id, { id, name, parent });
    const key = norm(name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(id);
  });

  const hasAncestorNamed = (id, ancestorName) => {
    let current = byId.get(id);
    while (current && current.parent) {
      const parent = byId.get(current.parent);
      if (!parent) break;
      if (norm(parent.name) === norm(ancestorName)) return true;
      current = parent;
    }
    return false;
  };

  if (subLabel) {
    const candidates = byName.get(norm(subLabel)) || [];
    if (!catLabel) return candidates[0] || null;
    for (const id of candidates) {
      if (hasAncestorNamed(id, catLabel)) return id;
    }
    return candidates[0] || null;
  }

  if (catLabel) {
    const candidates = byName.get(norm(catLabel)) || [];
    // prefer root category
    for (const id of candidates) {
      const node = byId.get(id);
      if (node && !node.parent) return id;
    }
    return candidates[0] || null;
  }
  return null;
}

function applyFiltersToProducts(products, filters, skipCategoryFilter = false) {
  const q = (filters.q || '').trim().toLowerCase();
  const cat = filters.category || '';
  const sub = filters.subcategory || '';
  return products
    .filter((p) => (q ? String(p.nombre || p.name || '').toLowerCase().includes(q) : true))
    .filter((p) => {
      const priceOk = Number(p.precio ?? 0) > 0;
      if (priceOk) return true;
      // Sin precio: solo mostrar cuando hay categoría seleccionada que coincide
      if (!cat) return false;
      const path = p.categoria_path || [p.category || p.categoria];
      const catMatch = matchInPath(path, cat);
      const subMatch = sub ? matchInPath(path, sub) : true;
      return catMatch && subMatch;
    })
    .filter((p) => (skipCategoryFilter ? true : (cat ? matchInPath(p.categoria_path || [p.category || p.categoria], cat) : true)))
    .filter((p) => {
      if (skipCategoryFilter) return true;
      if (!sub) return true;
      const path = p.categoria_path || [p.subcategory || p.subcategoria];
      return matchInPath(path, sub) || sizeGroupMatch(p, sub);
    });
}

function FiltersSidebar({ tree, products, value, onChange, onClear, isMobile }) {
  const categories = Object.keys(tree);

  const setCategory = (cat) => {
    onChange((prev) => ({
      ...prev,
      category: cat,
      subcategory: '',
    }));
  };

  const setSubcategory = (cat, sub) => {
    onChange((prev) => ({
      ...prev,
      category: cat,
      subcategory: sub,
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
            <span className="input-group-text">🔎</span>
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
          <div className="fw-semibold mb-1">Selección:</div>
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
  const location = useLocation();
  const navigate = useNavigate();

  const gridTopRef = useRef(null);
  const resultsScrollRef = useRef(null);
  const isMobile = useMediaQuery('(max-width: 992px)');
  const [scrollProgress, setScrollProgress] = useState(0);

  const qs = new URLSearchParams(location.search);
  const [search, setSearch] = useState(qs.get('search') || '');
  const [sortKey, setSortKey] = useState(qs.get('sort') || 'relevancia');
  const [cat, setCat] = useState('');
  const [subcat, setSubcat] = useState('');
  const [catTree, setCatTree] = useState(null);
  const [offers, setOffers] = useState([]);
  const [filterTick, setFilterTick] = useState(0);
  const [consultOpen, setConsultOpen] = useState(false);
  const [consultProduct, setConsultProduct] = useState(null);
  const [consultForm, setConsultForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [selectedAttrs, setSelectedAttrs] = useState({});

  const [draftCat, setDraftCat] = useState(cat);
  const [draftSubcat, setDraftSubcat] = useState(subcat);
  const [draftFilterQ, setDraftFilterQ] = useState(search);

  const initialPer = Number(qs.get('per') || 12);
  const initialPage = Number(qs.get('page') || 1);
  const [per, setPer] = useState([12, 24, 48].includes(initialPer) ? initialPer : 12);
  const [page, setPage] = useState(initialPage > 0 ? initialPage : 1);

  // Productos desde API (fuente principal)
  const [remote, setRemote] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [totalRemote, setTotalRemote] = useState(0);
  const [pagesRemote, setPagesRemote] = useState(1);

  // Sincroniza filtros con la URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (sortKey !== 'relevancia') params.set('sort', sortKey);
    if (per !== 12) params.set('per', String(per));
    if (page !== 1) params.set('page', String(page));
    navigate({ pathname: '/productos', search: params.toString() }, { replace: true });
  }, [search, sortKey, per, page, navigate]);

  // Actualiza estado al cambiar la URL (p. ej. búsquedas desde el header)
  useEffect(() => {
    const qsLatest = new URLSearchParams(location.search);
    const nextSearch = qsLatest.get('search') || '';
    const nextSort = qsLatest.get('sort') || 'relevancia';
    const perParam = Number(qsLatest.get('per') || 12);
    const nextPer = [12, 24, 48].includes(perParam) ? perParam : 12;
    const pageParam = Number(qsLatest.get('page') || 1);
    const nextPage = pageParam > 0 ? pageParam : 1;

    setSearch(nextSearch);
    setSortKey(nextSort);
    setPer(nextPer);
    setPage(nextPage);
  }, [location.search]);

  useEffect(() => {
    let alive = true;
    async function loadCats() {
      try {
        const data = await api.products.categories();
        const raw = Array.isArray(data?.results) ? data.results : data;
        if (alive) setCatTree(Array.isArray(raw) ? raw : []);
      } catch {
        if (alive) setCatTree([]);
      }
    }
    loadCats();
    return () => { alive = false; };
  }, []);

  const categoryIndex = useMemo(() => buildCategoryIndex(catTree || []), [catTree]);

  useEffect(() => {
    if (!isMobile) {
      setDraftCat(cat);
      setDraftSubcat(subcat);
      setDraftFilterQ(search);
    }
  }, [cat, subcat, search, isMobile]);

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
    return () => { alive = false; };
  }, []);

  // Carga remota con paginado (rápido)
  useEffect(() => {
    let alive = true;
    async function run() {
      setErr(''); setLoading(true);
      try {
        const q = search.trim() || undefined;
        const categoryIdParam = findCategoryIdForSelection(catTree || [], cat, subcat);
        const data = await api.products.list({
          q,
          page,
          limit: per,
          sort: sortKey,
          category_id: categoryIdParam || undefined,
          category: categoryIdParam ? undefined : (subcat ? slugify(subcat) : (cat ? slugify(cat) : undefined))
        });
        const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        const mapped = items.map(p => {
          let img =
            p.imageUrl ||
            p.image_url ||
            p.imagen ||
            (Array.isArray(p.images) && p.images[0]) ||
            `https://placehold.co/600x400?text=${encodeURIComponent(p.name || 'Producto')}`;
          if (typeof img === 'string') {
            if (img.startsWith('/')) img = `${API_BASE}${img}`;
            else if (!img.startsWith('http://') && !img.startsWith('https://')) img = '';
          } else {
            img = '';
          }
          const offer = offers.find(o => {
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
          const precioBase = Number(p.price ?? p.precio ?? precioOriginal);
          let descuentoPct = Number(p.discount?.percent ?? p.descuento?.percent ?? offer?.porcentaje ?? 0);
          if (!descuentoPct && precioOriginal > 0 && precioBase < precioOriginal) {
            descuentoPct = Math.max(0, Math.round((1 - (precioBase / precioOriginal)) * 100));
          }
          const precio = descuentoPct ? +(precioOriginal * (1 - descuentoPct / 100)).toFixed(2) : precioBase;
          const descuento = descuentoPct ? { percent: descuentoPct, ...(p.discount || p.descuento || {}), offerId: offer?.id || offer?._id } : null;
          const categoryObj = p.categoria || p.category || null;
          const rawAttributes = p.attributes || p.atributos || {};
          const rawAttributesStock = p.attributes_stock || p.atributos_stock || {};
          const attributes = Object.entries(rawAttributes).reduce((acc, [k, v]) => {
            if (!k) return acc;
            const values = Array.isArray(v) ? v : (v ? [v] : []);
            const cleaned = values.map(x => String(x).trim()).filter(Boolean);
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
            nombre: p.name || p.nombre || 'Producto',
            precio,
            precioOriginal,
            descuento,
            imagen: img,
            categoria: categoryName || 'General',
            categoria_id: categoryId,
            categoria_slug: categoryObj?.slug || (categoryName ? slugify(categoryName) : 'general'),
            subcategoria: subcategoryName,
            subcategoria_slug: '',
            categoria_path: categoryPath.length ? categoryPath : (categoryName ? [categoryName] : []),
            activo,
            atributos: attributes,
            atributos_stock: rawAttributesStock,
            stock: Number(p.stock ?? 0),
          };
        });
        if (alive) {
          const mergedMapped = mergeSpecialColorProducts(mapped);
          setRemote(mergedMapped.filter((p) => p.activo));
          setTotalRemote(Number(data?.total) || mergedMapped.length || 0);
          setPagesRemote(Number(data?.pages) || Math.max(1, Math.ceil((Number(data?.total) || mergedMapped.length || 0) / per)));
        }
      } catch (e) {
        if (alive) setErr(e?.message || 'No se pudieron cargar productos');
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => { alive = false; };
  }, [search, page, per, categoryIndex, cat, subcat, filterTick]);

  useEffect(() => {
    const handler = (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); setPage(prev => Math.max(1, prev - 1)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setPage(prev => prev + 1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Fallback local (solo si falla backend)
  const localFiltered = useMemo(() => {
    const q = norm(search);
    const matchesText = (p) => {
      const fields = [p.nombre, p.categoria, p.subcategoria, p.subsubcategoria]
        .filter(Boolean).map(norm);
      if (!q) return true;
      return fields.some(f => f.includes(q));
    };
    return productosData.filter(p => matchesText(p)).sort(SORTERS[sortKey]?.fn || SORTERS.relevancia.fn);
  }, [search, sortKey]);

  const usingFallback = !!err;
  const baseList = usingFallback ? localFiltered : remote;
  const appliedFilters = { q: search, category: cat, subcategory: subcat };
  const draftFilters = { q: draftFilterQ, category: draftCat, subcategory: draftSubcat };
  const skipCategoryFilter = !usingFallback && !isSizeGroupLabel(subcat);
  const filteredByFacets = applyFiltersToProducts(baseList, appliedFilters, skipCategoryFilter);
  const sortedByFacets = useMemo(() => {
    const sorter = SORTERS[sortKey]?.fn;
    if (!sorter || sortKey === 'relevancia') return filteredByFacets;
    return [...filteredByFacets].sort(sorter);
  }, [filteredByFacets, sortKey]);
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
        'Vela Escudo de Fútbol',
        'Velas Estrellita',
      ];
      const globosOrder = [
        'Número Metalizados',
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
        'Tutús',
        'Alas',
      ];
      const descartablesOrder = [
        'Bandejas Cartón',
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
        'Placas Plásticas',
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
      return obj;
    }
    return buildCategoryTreeFromProducts(baseList);
  }, [baseList, catTree]);
  const handleAppliedChange = (updater) => {
    const next = typeof updater === 'function' ? updater(appliedFilters) : updater;
    setSearch(next.q ?? '');
    setCat(next.category ?? '');
    setSubcat(next.subcategory ?? '');
    setPage(1);
    setFilterTick((t) => t + 1);
  };
  const handleDraftChange = (updater) => {
    const next = typeof updater === 'function' ? updater(draftFilters) : updater;
    setDraftFilterQ(next.q ?? '');
    setDraftCat(next.category ?? '');
    setDraftSubcat(next.subcategory ?? '');
  };

  const clearAll = () => {
    const empty = { q: '', category: '', subcategory: '' };
    if (isMobile) {
      setDraftFilterQ('');
      setDraftCat('');
      setDraftSubcat('');
    } else {
      handleAppliedChange(empty);
    }
  };
  const total = totalRemote || filteredByFacets.length;
  const totalPages = Math.max(1, pagesRemote || 1);
  const safePage = Math.min(page, totalPages);
  const startIdx = total === 0 ? 0 : ((safePage - 1) * per + 1);
  const endIdx = total === 0 ? 0 : ((safePage - 1) * per + filteredByFacets.length);
  const paginated = sortedByFacets;

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
          Página {safePage} de {totalPages} · {total} productos
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

  const getProductKey = (p) => String(p?.id || `${p?.categoria}-${p?.nombre}`);

  const getAttributeOptions = (attrName, values) => {
    const list = Array.isArray(values) ? values : (values ? [values] : []);
    const cleaned = list.map((v) => String(v).trim()).filter(Boolean);
    const normalizedName = norm(attrName || '');
    const hasNumberName = normalizedName.includes('numero');
    const placeholderLike =
      cleaned.length <= 1 &&
      cleaned.some((v) => /elegir|numero|n[úu]mero/i.test(v));
    if (hasNumberName && (placeholderLike || cleaned.length === 0)) {
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
      const list = getAttributeOptions(attrName, values);
      if (!list.length) return;
      out[attrName] = current[attrName] || String(list[0]);
    });
    return out;
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
    // Placeholder: integración futura (email / WhatsApp / backend)
    setConsultOpen(false);
  };

  return (
    <Container className="catalog-page py-4">
      <div className="catalog-toolbar">
        <div className="catalog-summary">
          <h2 className="catalog-title">Catálogo</h2>
          <div className="catalog-subtitle">Mostrando {total} productos</div>
        </div>
        <div className="catalog-controls">
          {err && <span className="text-danger small me-2">{err}</span>}
          {isMobile && (
            <button
              className="btn btn-dark"
              type="button"
              data-bs-toggle="offcanvas"
              data-bs-target="#filtersOffcanvas"
              aria-controls="filtersOffcanvas"
              onClick={() => {
                setDraftFilterQ(search);
                setDraftCat(cat);
                setDraftSubcat(subcat);
              }}
            >
              Filtrar
            </button>
          )}
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
            <option value={12}>12 / pág</option>
            <option value={24}>24 / pág</option>
            <option value={48}>48 / pág</option>
          </Form.Select>
        </div>
      </div>

      <Row className="g-4 catalog-body">
        <Col lg={3} className="d-none d-lg-block">
          <div className="catalog-filters-sticky">
            <FiltersSidebar
              tree={categoryTree}
              products={baseList}
              value={appliedFilters}
              onChange={handleAppliedChange}
              onClear={clearAll}
              isMobile={false}
            />
          </div>
        </Col>

        <Col lg={9}>
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
          if (search.trim()) chips.push(`"${search.trim()}"`);

          if (!chips.length) return null;
          return (
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              {chips.map((c, i) => (
                <Badge key={`${c}-${i}`} bg="warning" text="dark" className="filter-chip">{c}</Badge>
              ))}
              <Button size="sm" variant="outline-secondary" onClick={() => { setSearch(''); setCat(''); setSubcat(''); setPage(1); }}>
                Quitar filtros
              </Button>
            </div>
          );
        })()}

          <div className="catalog-results-summary">
            {total === 0
              ? 'Sin resultados'
              : `Mostrando ${startIdx + 1}-${endIdx} de ${total}`}
          </div>

          <Row className="g-4">
            {paginated.map((p) => {
              const attrs = getSelectedAttributes(p);
              const qtyMax = 999;

              return (
              <Col key={p.id || `${p.categoria}-${p.nombre}`} xs={6} md={4} lg={3}>
                <div className="product-card h-100 d-flex flex-column">
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
                    <h6 className="mb-2" style={{ lineHeight: 1.2 }}>{p.nombre}</h6>
                    <div className="text-muted small mb-2">
                      {(p.categoria || '—')} · {(p.subcategoria || '—')}
                    </div>
                    {p.atributos && Object.keys(p.atributos).length > 0 && (
                      <div className="mb-2">
                        {Object.entries(p.atributos).map(([attrName, values]) => {
                          const list = getAttributeOptions(attrName, values);
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
                      <div className="fw-bold mb-3">
                        {Number(p.precio ?? 0) <= 0 ? (
                          <Button variant="outline-primary" size="sm" onClick={() => openConsult(p)}>
                            Consultar
                          </Button>
                        ) : p.descuento?.percent ? (
                          <div>
                            <div className="text-muted text-decoration-line-through small">
                              {money.format(Number(p.precioOriginal ?? 0))}
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span>{money.format(Number(p.precio ?? 0))}</span>
                              <Badge bg="success">-{p.descuento.percent}%</Badge>
                            </div>
                          </div>
                        ) : (
                          money.format(Number(p.precio ?? 0))
                        )}
                      </div>

                      <div className="mt-auto">
                        <div className="small text-muted mb-1">Cantidad</div>
                        <InputGroup className="product-add-row">
                          <Form.Control
                            type="number"
                            min={1}
                            max={qtyMax}
                            defaultValue={1}
                            size="sm"
                            disabled={Number(p.precio ?? 0) <= 0}
                            onChange={(e) => {
                              const val = Math.max(1, Math.min(qtyMax, Number(e.target.value) || 1));
                              e.target.value = val;
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: 120 }}
                            aria-label="Cantidad"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={Number(p.precio ?? 0) <= 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              const input = e.currentTarget.parentElement.querySelector('input[type=\"number\"]');
                              const qty = input ? Number(input.value) || 1 : 1;
                              addToCart(p, Math.max(1, Math.min(qtyMax, qty)), attrs);
                            }}
                          >
                            {Number(p.precio ?? 0) <= 0 ? 'Consultar' : 'Agregar al carrito'}
                          </Button>
                        </InputGroup>
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

      <div
        className="offcanvas offcanvas-bottom filters-sheet"
        tabIndex="-1"
        id="filtersOffcanvas"
        aria-labelledby="filtersOffcanvasLabel"
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title fw-bold" id="filtersOffcanvasLabel">
            Filtros
          </h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Cerrar" />
        </div>
        <div className="offcanvas-body d-flex flex-column gap-3">
          <FiltersSidebar
            tree={categoryTree}
            products={baseList}
            value={appliedFilters}
            onChange={handleAppliedChange}
            onClear={clearAll}
            isMobile={true}
          />
          <div className="d-grid gap-2 mt-auto">
            <button
              type="button"
              className="btn btn-dark"
              data-bs-dismiss="offcanvas"
              onClick={() => {
                handleAppliedChange(draftFilters);
                const el = document.getElementById('filtersOffcanvas');
                if (el && window.bootstrap?.Offcanvas) {
                  const inst = window.bootstrap.Offcanvas.getInstance(el) || new window.bootstrap.Offcanvas(el);
                  inst.hide();
                }
              }}
            >
              Aplicar filtros
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setDraftFilterQ(search);
                setDraftCat(cat);
                setDraftSubcat(subcat);
              }}
              data-bs-dismiss="offcanvas"
            >
              Cancelar
            </button>
          </div>
          <div className="text-muted small">
            En mobile los cambios no se aplican hasta tocar <b>“Aplicar filtros”</b>.
          </div>
        </div>
      </div>

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
  );
}
