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

// Normalización estricta para comparaciones
const cleanString = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getAttributeOptions = (attrName, values, productName) => {
  const list = Array.isArray(values) ? values : (values ? [values] : []);
  const cleaned = list.map((v) => String(v).trim()).filter(Boolean);
  const normName = cleanString(attrName);
  const asksNumberInName = cleanString(productName).includes('elegir numero');
  const placeholderLike = cleaned.length <= 1 && cleaned.some((v) => /elegir|numero|n[úu]mero/i.test(v));
  if (normName.includes('numero') && (asksNumberInName || placeholderLike || cleaned.length <= 1)) {
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
          id: p.id || id,
          name: p.nombre || p.name || 'Producto',
          description: p.descripcion || p.description || '',
          price: Number(p.precio ?? p.price ?? 0),
          priceOriginal: Number(p.priceOriginal ?? p.precioOriginal ?? p.precio ?? p.price ?? 0),
          discount: p.descuento || p.discount || null,
          stock: Number(p.stock ?? 0),
          sinStock: !!(p.sin_stock || p.sinStock),
          attributes: p.atributos || p.attributes || {},
          attributesSinStock: p.atributos_sin_stock || p.attributes_sin_stock || {},
          images,
          videoUrl: p.video_url || p.videoUrl || '',
          categoryName: p.categoria?.nombre || p.category?.name || '',
          categorySlug: p.categoria?.slug || p.category?.slug || '',
        };

        const initialAttrs = {};
        Object.entries(mapped.attributes).forEach(([attrKey, values]) => {
          const allOptions = getAttributeOptions(attrKey, values, mapped.name);
          const disabledList = mapped.attributesSinStock[attrKey] || [];
          const disabledClean = disabledList.map(v => clean(v));
          
          // Filtrar las opciones que NO están sin stock
          const visibleOptions = allOptions.filter(opt => !disabledClean.includes(clean(opt)));

          if (visibleOptions.length > 0) {
            initialAttrs[attrKey] = String(visibleOptions[0]);
          } else if (allOptions.length > 0) {
            initialAttrs[attrKey] = String(allOptions[0]);
          }
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
    return product.priceOriginal > 0 ? product.priceOriginal : product.price;
  }, [product, selectedAttrs]);

  const effectivePrice = useMemo(() => {
    if (!product) return 0;
    const discountPct = Number(product.discount?.percent || 0);
    if (discountPct > 0 && effectivePriceOriginal > 0) {
      return +(effectivePriceOriginal * (1 - discountPct / 100)).toFixed(2);
    }
    return product.price > 0 ? product.price : effectivePriceOriginal;
  }, [effectivePriceOriginal, product]);

  const hasDiscount = useMemo(() => effectivePriceOriginal > effectivePrice, [effectivePrice, effectivePriceOriginal]);
  
  // LOGICA CLAVE: Verificar si la variante actualmente seleccionada está "Sin stock"
  const isSelectedVariantOutOfStock = useMemo(() => {
    if (!product) return false;
    
    // Si el producto ENTERO está sin stock, siempre devolvemos true
    if (product.sinStock) return true;

    // Revisar los atributos seleccionados
    for (const [attrName, selectedVal] of Object.entries(selectedAttrs)) {
      const disabledList = product.attributesSinStock[attrName] || [];
      const disabledClean = disabledList.map(v => cleanString(v));
      
      if (disabledClean.includes(cleanString(selectedVal))) {
        return true; // Esta variante específica fue marcada sin stock
      }
    }
    
    return false;
  }, [product, selectedAttrs]);


  if (loading) return <Container className="py-5 text-center"><Spinner animation="border" /></Container>;
  if (error || !product) return <Container className="py-5"><Alert variant="danger">{error || 'No encontrado'}</Alert></Container>;

  return (
    <>
      <Seo title={`${product.name} - mayorista`} description={product.description} path={`/productos/${id}`} image={product.images[0]} type="product" />
      <Container className="py-3">
        <div className="mb-3"><Link to="/">Inicio</Link> / <Link to="/productos">Productos</Link> / <span className="text-muted">{product.name}</span></div>

        <Row className="g-4">
          <Col lg={7}>
            <div className="border rounded bg-white p-2 mb-3 text-center" style={{ minHeight: 400 }}>
              {selectedImage ? <img src={selectedImage} alt="" style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }} /> : 'Sin imagen'}
            </div>
            <div className="d-flex gap-2 flex-wrap">
              {product.images.map((img, idx) => (
                <img key={idx} src={img} alt="" className={`border rounded p-1 ${selectedImageIndex === idx ? 'border-primary' : ''}`} style={{ width: 60, height: 60, cursor: 'pointer', objectFit: 'cover' }} onClick={() => { setSelectedImage(img); setSelectedImageIndex(idx); }} />
              ))}
            </div>
          </Col>

          <Col lg={5}>
            <h1 className="h3 mb-3">{product.name}</h1>
            
            <div className="mb-4">
              {!isLoggedIn ? <div className="text-muted">Inicia sesión para ver precios</div> : (
                <div>
                    {hasDiscount && <div className="text-muted text-decoration-line-through small">{money.format(effectivePriceOriginal)}</div>}
                    <div className="d-flex align-items-center gap-2">
                      <span className="h3 text-primary mb-0">{money.format(effectivePrice)}</span>
                      {hasDiscount && <Badge bg="success">-{product.discount.percent}% OFF</Badge>}
                    </div>
                </div>
              )}
            </div>

            {/* SECCIÓN DE ATRIBUTOS COMPLETOS */}
            {Object.entries(product.attributes).map(([attrKey, values]) => {
              const allOptions = getAttributeOptions(attrKey, values, product.name);
              const disabledValues = product.attributesSinStock[attrKey] || [];
              const disabledCleaned = disabledValues.map(v => cleanString(v));
              
              // Filtrar para que las opciones sin stock NO APAREZCAN
              const availableOptions = allOptions.filter(opt => !disabledCleaned.includes(cleanString(opt)));

              if (availableOptions.length === 0) return null;

              return (
                <Form.Group className="mb-3" key={attrKey}>
                  <Form.Label className="small text-muted">{attrKey}</Form.Label>
                  <Form.Select value={selectedAttrs[attrKey] || ''} onChange={(e) => setSelectedAttrs(prev => ({ ...prev, [attrKey]: e.target.value }))}>
                    {availableOptions.map(opt => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              );
            })}

            <div className="mb-4">
              <Form.Label className="small text-muted">Cantidad</Form.Label>
              <Form.Control type="number" min={1} style={{ maxWidth: 80 }} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
            </div>

            {/* BOTÓN DINÁMICO SEGÚN EL STOCK DE LA VARIANTE SELECCIONADA */}
            {isSelectedVariantOutOfStock ? (
              <Button variant="secondary" disabled className="w-100 py-2">PRODUCTO SIN STOCK</Button>
            ) : (
              <Button variant="primary" className="w-100 py-2" onClick={() => addToCart({ id: product.id, nombre: product.name, precio: effectivePrice, imagen: product.images[0] }, qty, selectedAttrs)}>
                AGREGAR AL CARRITO
              </Button>
            )}

            {product.description && <div className="mt-4 small text-muted border-top pt-3">{product.description}</div>}
          </Col>
        </Row>
      </Container>
    </>
  );
}
