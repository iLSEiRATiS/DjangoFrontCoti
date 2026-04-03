import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Col, Container, Form, InputGroup, Modal, Row, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Seo from '../components/Seo';
import { getGenericVariantPrice } from '../lib/productVariants';
import { normalizeText, toAbsoluteUrl } from '../lib/seo';

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

const norm = (s = '') =>
  s
    .toString()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const getAttributeOptions = (attrName, values, productName) => {
  const list = Array.isArray(values) ? values : (values ? [values] : []);
  const cleaned = list.map((v) => String(v).trim()).filter(Boolean);
  const normalizedName = norm(attrName || '');
  const asksNumberInName = norm(productName || '').includes('elegir numero');
  const placeholderLike = cleaned.length <= 1 && cleaned.some((v) => /elegir|numero|n[úu]mero/i.test(v));
  if (normalizedName.includes('numero') && (asksNumberInName || placeholderLike || cleaned.length <= 1)) {
    return Array.from({ length: 10 }, (_, i) => String(i));
  }
  return cleaned;
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedAttrs, setSelectedAttrs] = useState({});

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const p = await api.products.get(id);
        if (!alive) return;
        const rawImages = Array.isArray(p.images) ? p.images : [];
        const normalizedImages = rawImages.map((x) => normalizeImageUrl(x)).filter(Boolean);
        const fallbackImage = normalizeImageUrl(p.imageUrl || p.image_url || p.imagen || '');
        const images = [...new Set([fallbackImage, ...normalizedImages].filter(Boolean))];
        const mapped = {
          id: p._id || p.id || p.slug,
          name: p.name || p.nombre || 'Producto',
          description: p.description || p.descripcion || '',
          price: Number(p.price ?? p.precio ?? 0),
          priceOriginal: Number(p.priceOriginal ?? p.precioOriginal ?? p.price ?? p.precio ?? 0),
          discount: p.discount || p.descuento || null,
          stock: Number(p.stock ?? 0),
          attributes: p.attributes || p.atributos || {},
          attributesPrice: p.attributes_price || p.atributos_precio || {},
          categoryName: p.category?.name || p.category?.nombre || '',
          categorySlug: p.category?.slug || '',
          videoUrl: p.videoUrl || p.video_url || '',
          images,
        };
        const initialAttrs = {};
        Object.entries(mapped.attributes).forEach(([k, v]) => {
          const opts = getAttributeOptions(k, v, mapped.name);
          if (opts.length) initialAttrs[k] = String(opts[0]);
        });
        setSelectedAttrs(initialAttrs);
        setProduct(mapped);
        setSelectedImage(images[0] || '');
        setSelectedImageIndex(0);
      } catch (e) {
        if (alive) setError(e?.message || 'No se pudo cargar el producto');
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (id) load();
    return () => { alive = false; };
  }, [id]);

  const effectivePriceOriginal = useMemo(() => {
    if (!product) return 0;
    const genericVariantPrice = getGenericVariantPrice(product, selectedAttrs);
    if (Number.isFinite(Number(genericVariantPrice)) && Number(genericVariantPrice) > 0) {
      return Number(genericVariantPrice);
    }
    const original = Number(product.priceOriginal || 0);
    const base = Number(product.price || 0);
    return original > 0 ? original : base;
  }, [product, selectedAttrs]);

  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    const discountPct = Number(product?.discount?.percent || 0);
    if (discountPct > 0 && effectivePriceOriginal > 0) {
      return +(effectivePriceOriginal * (1 - discountPct / 100)).toFixed(2);
    }
    const base = Number(product.price || 0);
    return base > 0 ? base : effectivePriceOriginal;
  }, [effectivePriceOriginal, product]);

  const hasDiscount = useMemo(() => effectivePriceOriginal > effectivePrice, [effectivePrice, effectivePriceOriginal]);
  const videoEmbed = useMemo(() => getVideoEmbed(product?.videoUrl), [product?.videoUrl]);
  const seoTitle = product ? `${product.name} - mayorista` : 'Detalle de producto';
  const seoDescription = normalizeText(product?.description || `Compra ${product?.name || 'producto'} en CotiStore mayorista.`);
  const seoImage = product?.images?.[0] || '';
  const seoPath = `/productos/${encodeURIComponent(id || '')}`;
  const seoSchema = useMemo(() => {
    if (!product) return null;
    const stockState = Number(product.stock || 0) > 0 ? 'InStock' : 'OutOfStock';
    return {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: seoDescription,
      image: (product.images || []).map((img) => toAbsoluteUrl(img)),
      sku: String(product.id || id || ''),
      brand: { '@type': 'Brand', name: 'CotiStore' },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'ARS',
        price: Number(effectivePrice || 0),
        availability: `https://schema.org/${stockState}`,
        url: toAbsoluteUrl(seoPath),
      },
    };
  }, [effectivePrice, id, product, seoDescription, seoPath]);

  const selectImageByIndex = (idx) => {
    if (!product?.images?.length) return;
    const safe = ((idx % product.images.length) + product.images.length) % product.images.length;
    setSelectedImageIndex(safe);
    setSelectedImage(product.images[safe] || '');
  };

  const openZoom = () => {
    if (!selectedImage) return;
    setZoomOpen(true);
  };

  if (loading) {
    return (
      <>
        <Seo title="Cargando producto" description="Cargando detalle de producto." path={seoPath} noindex />
        <Container className="py-4 text-center">
          <Spinner animation="border" />
        </Container>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Seo title="Producto no encontrado" description="El producto solicitado no existe." path={seoPath} noindex />
        <Container className="py-4">
          <Alert variant="danger">{error || 'Producto no encontrado'}</Alert>
          <Button variant="outline-secondary" onClick={() => navigate('/productos')}>Volver a productos</Button>
        </Container>
      </>
    );
  }

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} path={seoPath} image={seoImage} type="product" jsonLd={seoSchema} />
      <Container className="py-3">
        <div className="detail-breadcrumb mb-2">
          <Link to="/">Inicio</Link>
          <span>/</span>
          <Link to="/productos">Productos</Link>
          {!!product.categoryName && (
            <>
              <span>/</span>
              <Link to={product.categorySlug ? `/productos?cat=${encodeURIComponent(product.categorySlug)}` : '/productos'}>
                {product.categoryName}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-muted">{product.name}</span>
        </div>

        <div className="product-detail-shell">
          <Row className="g-3">
            <Col lg={7}>
              <div className="detail-gallery">
                <div className="detail-thumbs">
                  {product.videoUrl ? (
                    <button
                      type="button"
                      className={`detail-thumb-btn ${!selectedImage ? 'is-active' : ''}`}
                      onClick={() => setSelectedImage('')}
                    >
                      <div className="detail-video-thumb">Video</div>
                    </button>
                  ) : null}
                  {product.images.map((img, idx) => (
                    <button
                      key={`thumb-${idx}`}
                      type="button"
                      className={`detail-thumb-btn ${selectedImage === img ? 'is-active' : ''}`}
                      onClick={() => selectImageByIndex(idx)}
                    >
                      <img src={img} alt={`${product.name} ${idx + 1}`} />
                    </button>
                  ))}
                </div>
                <div className="detail-main-image">
                  {selectedImage ? (
                    <>
                      <button type="button" className="detail-main-nav detail-main-prev" onClick={() => selectImageByIndex(selectedImageIndex - 1)} aria-label="Imagen anterior">
                        ‹
                      </button>
                      <img src={selectedImage} alt={product.name} />
                      <button type="button" className="detail-main-nav detail-main-next" onClick={() => selectImageByIndex(selectedImageIndex + 1)} aria-label="Imagen siguiente">
                        ›
                      </button>
                      <button type="button" className="detail-zoom-btn" aria-label="Ampliar imagen" onClick={openZoom}>
                        ⤢
                      </button>
                    </>
                  ) : videoEmbed ? (
                    videoEmbed.type === 'video' ? (
                      <video className="detail-video-player" controls preload="metadata">
                        <source src={videoEmbed.src} />
                        Tu navegador no soporta video HTML5.
                      </video>
                    ) : (
                      <iframe
                        className="detail-video-player"
                        src={videoEmbed.src}
                        title={`Video de ${product.name}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    )
                  ) : (
                    <div className="detail-empty-image">Sin imagen</div>
                  )}
                </div>
              </div>
            </Col>
            <Col lg={5}>
              <div className="detail-info">
                <h2 className="detail-title">{product.name}</h2>
                {!isLoggedIn ? (
                  <div className="detail-price mb-3">
                    <span className="text-muted small">Inicia sesion para ver precios</span>
                  </div>
                ) : hasDiscount ? (
                  <div className="mb-3">
                    <div className="text-muted text-decoration-line-through small">{money.format(effectivePriceOriginal)}</div>
                    <div className="d-flex align-items-center gap-2">
                      <div className="detail-price">{money.format(effectivePrice)}</div>
                      <Badge bg="success">-{product.discount.percent}%</Badge>
                    </div>
                  </div>
                ) : (
                  <div className="detail-price mb-3">{money.format(effectivePrice)}</div>
                )}

                {Object.keys(product.attributes || {}).length > 0 && (
                  <div className="mb-3">
                    {Object.entries(product.attributes).map(([attrName, values]) => {
                      const options = getAttributeOptions(attrName, values, product.name);
                      if (!options.length) return null;
                      return (
                        <Form.Group className="mb-2" key={attrName}>
                          <Form.Label className="small text-muted">{attrName}</Form.Label>
                          <Form.Select value={selectedAttrs[attrName] || options[0]} onChange={(e) => setSelectedAttrs((prev) => ({ ...prev, [attrName]: e.target.value }))}>
                            {options.map((opt) => <option key={`${attrName}-${opt}`} value={opt}>{opt}</option>)}
                          </Form.Select>
                        </Form.Group>
                      );
                    })}
                  </div>
                )}

                <div className="mb-3">
                  <Form.Label className="small text-muted">Cantidad</Form.Label>
                  <InputGroup style={{ maxWidth: 180 }}>
                    <Form.Control type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
                  </InputGroup>
                </div>

                {!isLoggedIn ? (
                  <Alert variant="warning" className="small mb-0">Inicia sesion para ver precios y comprar.</Alert>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => addToCart(
                      {
                        id: product.id,
                        nombre: product.name,
                        precio: effectivePrice,
                        precioOriginal: effectivePriceOriginal,
                        imagen: product.images[0] || '',
                      },
                      qty,
                      selectedAttrs
                    )}
                  >
                    Agregar al carrito
                  </Button>
                )}

                {!!product.videoUrl && (
                  <div className="mt-3">
                    <Button variant="outline-secondary" size="sm" onClick={() => setSelectedImage('')}>
                      Ver video del producto
                    </Button>
                  </div>
                )}

                {!!product.description && (
                  <div className="mt-3 small text-muted">{product.description}</div>
                )}
              </div>
            </Col>
          </Row>
        </div>

        <Modal show={zoomOpen} onHide={() => setZoomOpen(false)} centered size="xl">
          <Modal.Header closeButton>
            <Modal.Title>{product.name}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0">
            <div className="detail-zoom-wrap">
              {selectedImage ? <img src={selectedImage} alt={product.name} /> : null}
            </div>
          </Modal.Body>
        </Modal>
      </Container>
    </>
  );
}
