// src/pages/Home.jsx
import { useEffect, useMemo, useState } from 'react';
import { Container, Row, Col, Card, Button, Carousel, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import velasImg from '../assets/Velas.png';
import decoImg from '../assets/deco.png';
import luminososImg from '../assets/luminosos.png';
import api from '../lib/api';

/** Hero con imágenes locales */
const heroImages = [velasImg, decoImg, luminososImg];

/** Mosaico principal de categorías (enlaza a /productos con filtros) */
const tiles = [
  { key: 'tile-cotillon-velas', title: 'Cotillon / Velas', to: '/productos?cat=cotillon&subcat=velas', img: 'https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg' },
  { key: 'tile-globos-pinatas', title: 'Globos y Pinatas', to: '/productos?cat=globos-y-pinatas', img: 'https://images.pexels.com/photos/17811/pexels-photo.jpg' },
  { key: 'tile-guirnaldas-led', title: 'Guirnaldas LED', to: '/productos?cat=decoracion-led', img: 'https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg' },
  { key: 'tile-disfraces', title: 'Disfraces', to: '/productos?cat=disfraces', img: 'https://images.pexels.com/photos/134469/pexels-photo-134469.jpeg' },
  { key: 'tile-descartables', title: 'Descartables', to: '/productos?cat=descartables', img: 'https://images.pexels.com/photos/3952047/pexels-photo-3952047.jpeg' },
  { key: 'tile-reposteria', title: 'Reposteria', to: '/productos?cat=reposteria', img: 'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg' },
];

const heroOverrideKeys = ['hero-1', 'hero-2', 'hero-3'];

/** Tiras adicionales de colecciones destacadas */
const featured = [
  { key: 'featured-numeros-metalizados', title: 'Numeros metalizados', to: '/productos?cat=globos-y-pinatas&subcat=numero-metalizados', img: 'https://images.pexels.com/photos/796606/pexels-photo-796606.jpeg' },
  { key: 'featured-set-de-globos', title: 'Set de globos', to: '/productos?cat=globos-y-pinatas&subcat=set-de-globos', img: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg' },
  { key: 'featured-platos-bandejas', title: 'Platos y bandejas', to: '/productos?cat=descartables&subcat=platos', img: 'https://images.pexels.com/photos/5946080/pexels-photo-5946080.jpeg' },
  { key: 'featured-maquillaje', title: 'Maquillaje', to: '/productos?cat=disfraces&subcat=maquillaje', img: 'https://images.pexels.com/photos/1359301/pexels-photo-1359301.jpeg' },
];

const Home = () => {
  const navigate = useNavigate();
  const [imageOverrides, setImageOverrides] = useState({});
  const [targetOverrides, setTargetOverrides] = useState({});

  useEffect(() => {
    let alive = true;
    async function loadImages() {
      try {
        const data = await api.products.homeImages();
        if (!alive) return;
        setImageOverrides(data?.byKey || {});
        setTargetOverrides(data?.byKeyTarget || {});
      } catch {
        if (!alive) return;
        setImageOverrides({});
        setTargetOverrides({});
      }
    }
    loadImages();
    return () => { alive = false; };
  }, []);

  const heroImagesResolved = useMemo(
    () => heroImages.map((src, idx) => imageOverrides[heroOverrideKeys[idx]] || src),
    [imageOverrides]
  );

  const tilesResolved = useMemo(
    () =>
      tiles.map((tile) => ({
        ...tile,
        img: imageOverrides[tile.key] || tile.img,
      })),
    [imageOverrides]
  );

  const featuredResolved = useMemo(
    () =>
      featured.map((item) => ({
        ...item,
        img: imageOverrides[item.key] || item.img,
        to: targetOverrides[item.key] || item.to,
      })),
    [imageOverrides, targetOverrides]
  );


  return (
    <main role="main">
      {/* HERO */}
      <Carousel variant="dark" className="mb-4" fade interval={4500}>
        {heroImagesResolved.map((src, i) => (
          <Carousel.Item key={i}>
            <div style={{ maxHeight: 440, overflow: 'hidden' }}>
              <img
                src={src}
                alt={`Slide ${i + 1}`}
                className="d-block w-100"
                style={{ objectFit: 'cover', height: 440 }}
              />
            </div>
            <Carousel.Caption className="d-flex flex-column align-items-center text-center">
              <h3
                className="px-3 py-2 rounded fw-bold"
                style={{
                  background: 'rgba(255, 255, 255, 0.78)',
                  color: '#111',
                  textShadow: '0 1px 0 rgba(255,255,255,0.6)',
                  display: 'inline-block',
                }}
              >
                CotiStore Mayorista
              </h3>
              <p
                className="px-3 py-2 rounded mb-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.7)',
                  color: '#111',
                  textShadow: '0 1px 0 rgba(255,255,255,0.6)',
                  display: 'inline-block',
                  marginTop: 8,
                }}
              >
                Todo para tu fiesta, al mejor precio.
              </p>
            </Carousel.Caption>
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
                  <Card.Img
                    src={t.img}
                    alt={t.title}
                    style={{ objectFit: 'cover', height: 160 }}
                  />
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
                  <Card.Img
                    src={`${f.img}?auto=compress&cs=tinysrgb&w=1000`}
                    alt={f.title}
                    style={{ objectFit: 'cover', height: 130 }}
                  />
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
  );
};

export default Home;
