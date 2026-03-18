// src/pages/Home.jsx
import { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Button, Carousel, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import velasImg from '../assets/velas-optimized.webp';
import decoImg from '../assets/deco-optimized.webp';
import luminososImg from '../assets/luminosos-optimized.webp';
import api, { API_BASE } from '../lib/api';
import Seo from '../components/Seo';
import { toAbsoluteUrl } from '../lib/seo';

/** Hero con imágenes locales */
const heroImages = [velasImg, decoImg, luminososImg];

/** Mosaico principal de categorías (enlaza a /productos con filtros) */
const tiles = [
  { key: 'tile-cotillon-velas', title: 'Cotillon / Velas', to: '/productos?cat=cotillon&subcat=velas', img: '' },
  { key: 'tile-globos-pinatas', title: 'Globos y Pinatas', to: '/productos?cat=globos-y-pinatas', img: '' },
  { key: 'tile-guirnaldas-led', title: 'Guirnaldas LED', to: '/productos?cat=decoracion-led', img: '' },
  { key: 'tile-disfraces', title: 'Disfraces', to: '/productos?cat=disfraces', img: '' },
  { key: 'tile-descartables', title: 'Descartables', to: '/productos?cat=descartables', img: '' },
  { key: 'tile-reposteria', title: 'Reposteria', to: '/productos?cat=reposteria', img: '' },
];

const heroOverrideKeys = ['hero-1', 'hero-2', 'hero-3'];
const TILE_POOL_CACHE_KEY = 'home_tile_image_pools_v1';
const FEATURED_POOL_CACHE_KEY = 'home_featured_image_pools_v1';

/** Tiras adicionales de colecciones destacadas */
const featured = [
  { key: 'featured-numeros-metalizados', title: 'Numeros metalizados', to: '/productos?cat=globos-y-pinatas&subcat=numero-metalizados', img: '' },
  { key: 'featured-set-de-globos', title: 'Set de globos', to: '/productos?cat=globos-y-pinatas&subcat=set-de-globos', img: '' },
  { key: 'featured-platos-bandejas', title: 'Platos y bandejas', to: '/productos?cat=descartables&subcat=platos', img: '' },
  { key: 'featured-maquillaje', title: 'Maquillaje', to: '/productos?cat=disfraces&subcat=maquillaje', img: '' },
];

const normalizeImageUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('/')) return `${API_BASE}${raw}`;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  return '';
};

const getTileQuery = (to = '') => {
  const q = String(to || '').split('?')[1] || '';
  return new URLSearchParams(q);
};

const fetchProductsForHomeSlot = async ({ category = '', search = '' }) => {
  const first = await api.products.list({
    category,
    q: search || undefined,
    page: 1,
    limit: 80,
  });
  const firstItems = Array.isArray(first?.items) ? first.items : [];
  if (firstItems.length || !search) return firstItems;

  // Fallback: si el subcat no matchea por slug/texto, usar solo categoria.
  const fallback = await api.products.list({
    category,
    page: 1,
    limit: 80,
  });
  return Array.isArray(fallback?.items) ? fallback.items : [];
};

const Home = () => {
  const navigate = useNavigate();
  const [imageOverrides, setImageOverrides] = useState({});
  const [targetOverrides, setTargetOverrides] = useState({});
  const [marquee, setMarquee] = useState({
    enabled: false,
    text: '',
    textColor: '#ffffff',
    backgroundColor: '#dc3545',
  });
  const [tileImagePools, setTileImagePools] = useState(() => {
    try {
      const raw = localStorage.getItem(TILE_POOL_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });
  const [featuredImagePools, setFeaturedImagePools] = useState(() => {
    try {
      const raw = localStorage.getItem(FEATURED_POOL_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });
  const [imageTick, setImageTick] = useState(0);

  useEffect(() => {
    let alive = true;
    async function loadImages() {
      try {
        const data = await api.products.homeImages();
        if (!alive) return;
        setImageOverrides(data?.byKey || {});
        setTargetOverrides(data?.byKeyTarget || {});
        setMarquee({
          enabled: Boolean(data?.marquee?.enabled),
          text: data?.marquee?.text || '',
          textColor: data?.marquee?.textColor || '#ffffff',
          backgroundColor: data?.marquee?.backgroundColor || '#dc3545',
        });
      } catch {
        if (!alive) return;
        setImageOverrides({});
        setTargetOverrides({});
        setMarquee({
          enabled: false,
          text: '',
          textColor: '#ffffff',
          backgroundColor: '#dc3545',
        });
      }
    }
    loadImages();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadFeaturedProductImages() {
      try {
        const entries = await Promise.all(
          featured.map(async (item) => {
            const params = getTileQuery(item.to);
            const category = params.get('cat') || '';
            const search = params.get('subcat') || '';
            const items = await fetchProductsForHomeSlot({ category, search });
            const images = [];
            const seen = new Set();
            for (const p of items) {
              const candidateList = [
                ...(Array.isArray(p.images) ? p.images : []),
                p.imageUrl,
                p.image_url,
                p.imagen,
              ];
              for (const c of candidateList) {
                const url = normalizeImageUrl(c);
                if (!url || seen.has(url)) continue;
                seen.add(url);
                images.push(url);
                if (images.length >= 16) break;
              }
              if (images.length >= 16) break;
            }
            return [item.key, images];
          })
        );
        if (!alive) return;
        const next = Object.fromEntries(entries);
        setFeaturedImagePools(next);
        try {
          localStorage.setItem(FEATURED_POOL_CACHE_KEY, JSON.stringify(next));
        } catch {}
      } catch {
        if (!alive) return;
        // Conserva cache previo para evitar flash de imagenes fallback.
      }
    }
    loadFeaturedProductImages();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadTileProductImages() {
      try {
        const entries = await Promise.all(
          tiles.map(async (tile) => {
            const params = getTileQuery(tile.to);
            const category = params.get('cat') || '';
            const search = params.get('subcat') || '';
            const items = await fetchProductsForHomeSlot({ category, search });
            const images = [];
            const seen = new Set();
            for (const p of items) {
              const candidateList = [
                ...(Array.isArray(p.images) ? p.images : []),
                p.imageUrl,
                p.image_url,
                p.imagen,
              ];
              for (const c of candidateList) {
                const url = normalizeImageUrl(c);
                if (!url || seen.has(url)) continue;
                seen.add(url);
                images.push(url);
                if (images.length >= 16) break;
              }
              if (images.length >= 16) break;
            }
            return [tile.key, images];
          })
        );
        if (!alive) return;
        const next = Object.fromEntries(entries);
        setTileImagePools(next);
        try {
          localStorage.setItem(TILE_POOL_CACHE_KEY, JSON.stringify(next));
        } catch {}
      } catch {
        if (!alive) return;
        // Conserva cache previo para evitar flash de imagenes fallback.
      }
    }
    loadTileProductImages();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setImageTick((prev) => prev + 1);
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  const heroImagesResolved = useMemo(
    () => heroImages.map((src, idx) => imageOverrides[heroOverrideKeys[idx]] || src),
    [imageOverrides]
  );

  const tilesResolved = useMemo(
    () =>
      tiles.map((tile) => ({
        ...tile,
        img: (() => {
          const pool = tileImagePools[tile.key] || [];
          if (pool.length) return pool[imageTick % pool.length];
          return '';
        })(),
      })),
    [tileImagePools, imageTick]
  );

  const featuredResolved = useMemo(
    () =>
      featured.map((item) => ({
        ...item,
        img: (() => {
          const pool = featuredImagePools[item.key] || [];
          if (pool.length) return pool[imageTick % pool.length];
          return '';
        })(),
        to: targetOverrides[item.key] || item.to,
      })),
    [targetOverrides, featuredImagePools, imageTick]
  );

  const heroActiveIndex = heroImagesResolved.length ? (imageTick % heroImagesResolved.length) : 0;
  const homeDescription =
    'Cotillon mayorista con envios a todo el pais. Globos, velas, disfraces, descartables y decoracion para fiestas.';
  const homeSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: 'CotiStore',
      description: homeDescription,
      url: toAbsoluteUrl('/'),
      image: toAbsoluteUrl(heroImagesResolved[0] || heroImages[0]),
    }),
    [heroImagesResolved]
  );


  return (
    <>
      <Seo
        title="Cotillon mayorista y articulos para fiestas"
        description={homeDescription}
        path="/"
        image={heroImagesResolved[0] || heroImages[0]}
        jsonLd={homeSchema}
      />
      <main role="main">
      {marquee.enabled && marquee.text ? (
        <div
          style={{
            backgroundColor: marquee.backgroundColor,
            color: marquee.textColor,
            padding: '10px 0',
            marginBottom: 16,
            fontWeight: 700,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              paddingLeft: '100%',
              animation: 'home-marquee-scroll 18s linear infinite',
            }}
          >
            {marquee.text}
          </div>
        </div>
      ) : null}
      <style>
        {`
          @keyframes home-marquee-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
        `}
      </style>
      {/* HERO */}
      <Carousel
        variant="dark"
        className="mb-4"
        fade
        interval={null}
        activeIndex={heroActiveIndex}
        onSelect={(idx) => setImageTick(idx)}
      >
        {heroImagesResolved.map((src, i) => (
          <Carousel.Item key={i}>
            <div style={{ maxHeight: 440, overflow: 'hidden' }}>
              <img
                src={src}
                alt={`Slide ${i + 1}`}
                className="d-block w-100"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                style={{ objectFit: 'cover', height: 440 }}
              />
            </div>
          </Carousel.Item>
        ))}
      </Carousel>

      {/* USPs / Beneficios */}
      <Container className="mb-4">
        <Row className="g-3">
          <Col sm={6} lg={4}>
            <Card className="h-100 shadow-sm">
              <Card.Body className="d-flex">
                <div className="me-3 display-6">💸</div>
                <div>
                  <Card.Title className="h6 mb-1">Precios mayoristas</Card.Title>
                  <Card.Text className="mb-0 text-muted small">
                    Lista optimizada para cotillones y revendedores. Pedidos grandes, mejores condiciones.
                  </Card.Text>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} lg={4}>
            <Card className="h-100 shadow-sm">
              <Card.Body className="d-flex">
                <div className="me-3 display-6">🚚</div>
                <div>
                  <Card.Title className="h6 mb-1">Envíos / Retiro</Card.Title>
                  <Card.Text className="mb-0 text-muted small">
                    Coordinamos envíos o retiro por el local. Opciones flexibles según tu necesidad.
                  </Card.Text>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col sm={6} lg={4}>
            <Card className="h-100 shadow-sm">
              <Card.Body className="d-flex">
                <div className="me-3 display-6">💬</div>
                <div>
                  <Card.Title className="h6 mb-1">Atención personalizada</Card.Title>
                  <Card.Text className="mb-0 text-muted small">
                    Te asesoramos por WhatsApp para armar tu pedido más rápido.
                  </Card.Text>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Mosaico de categorías principales */}
      <Container className="pb-4">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h2 className="h5 mb-0">Explorá por categoría</h2>
          <Badge bg="secondary">Mayorista</Badge>
        </div>
        <Row className="g-3">
          {tilesResolved.map((t, i) => (
            <Col key={i} xs={12} sm={6} md={4}>
              <Card as={Link} to={t.to} className="h-100 text-decoration-none shadow-sm">
                <div style={{ height: 160, overflow: 'hidden' }}>
                  {t.img ? (
                    <Card.Img
                      src={t.img}
                      alt={t.title}
                      loading="lazy"
                      decoding="async"
                      style={{ objectFit: 'cover', height: 160 }}
                    />
                  ) : (
                    <div
                      className="d-flex align-items-center justify-content-center text-muted small bg-light"
                      style={{ height: 160 }}
                    >
                      Cargando imagenes...
                    </div>
                  )}
                </div>
                <Card.Body className="d-flex flex-column">
                  <Card.Title className="mb-2 h6">{t.title}</Card.Title>
                  <Button onClick={() => navigate(t.to)} variant="primary" className="mt-auto" size="sm">
                    Ver productos
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Colecciones destacadas (tira intermedia) */}
      <Container className="pb-4">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h2 className="h5 mb-0">Colecciones destacadas</h2>
          <Button as={Link} to="/productos" variant="outline-secondary" size="sm">
            Ver todo
          </Button>
        </div>
        <Row className="g-3">
          {featuredResolved.map((f, i) => (
            <Col key={i} xs={12} sm={6} md={3}>
              <Card as={Link} to={f.to} className="h-100 text-decoration-none shadow-sm">
                <div style={{ height: 130, overflow: 'hidden' }}>
                  {f.img ? (
                    <Card.Img
                      src={f.img}
                      alt={f.title}
                      loading="lazy"
                      decoding="async"
                      style={{ objectFit: 'cover', height: 130 }}
                    />
                  ) : (
                    <div
                      className="d-flex align-items-center justify-content-center text-muted small bg-light"
                      style={{ height: 130 }}
                    >
                      Cargando imagenes...
                    </div>
                  )}
                </div>
                <Card.Body className="py-2">
                  <Card.Title className="h6 mb-0 text-truncate">{f.title}</Card.Title>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      {/* Cómo comprar (pasos simples) */}
      <Container className="pb-5">
        <Row className="g-3 align-items-stretch">
          <Col md={4}>
            <Card className="h-100 border-0 bg-light">
              <Card.Body className="text-center">
                <div className="display-6 mb-2">1️⃣</div>
                <Card.Title className="h6">Registrate o iniciá sesión</Card.Title>
                <Card.Text className="text-muted small">
                  Accedé a la lista mayorista y guardá tus pedidos.
                </Card.Text>
                <div className="d-flex gap-2 justify-content-center">
                  <Button as={Link} to="/login" size="sm" variant="primary">Iniciar sesión</Button>
                  <Button as={Link} to="/register" size="sm" variant="outline-primary">Crear cuenta</Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 border-0 bg-light">
              <Card.Body className="text-center">
                <div className="display-6 mb-2">2️⃣</div>
                <Card.Title className="h6">Armá tu carrito</Card.Title>
                <Card.Text className="text-muted small">
                  Filtrá por categoría, buscá por nombre y elegí cantidades.
                </Card.Text>
                <Button as={Link} to="/productos" size="sm" variant="primary">Ir a la tienda</Button>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 border-0 bg-light">
              <Card.Body className="text-center">
                <div className="display-6 mb-2">3️⃣</div>
                <Card.Title className="h6">Coordinamos entrega</Card.Title>
                <Card.Text className="text-muted small">
                  Te contactamos para envío o retiro y cerrar el pedido.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Banner CTA mayorista */}
      <Container className="pb-5">
        <Card className="border-0 shadow-sm">
          <Card.Body className="d-flex flex-column flex-md-row align-items-center justify-content-between">
            <div className="mb-3 mb-md-0">
              <h3 className="h5 mb-1">¿Tenés un local de cotillón o estás por abrir uno?</h3>
              <p className="mb-0 text-muted">
                Contactanos para listas personalizadas y stock mayorista disponible.
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button as="a" href="https://wa.me/5491139581816" target="_blank" rel="noopener noreferrer" variant="success">
                Escribinos por WhatsApp
              </Button>
              <Button as={Link} to="/productos" variant="outline-success">
                Ver catálogo
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Container>
      </main>
    </>
  );
};

export default Home;
