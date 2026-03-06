import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Col, Container, Row, Table, Alert, Spinner, Form } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const TABS_BASE = [
  { key: 'dashboard', label: 'Resumen' },
  { key: 'productos', label: 'Productos' },
  { key: 'categorias', label: 'Categorias' },
  { key: 'ofertas', label: 'Ofertas' },
  { key: 'cuenta', label: 'Mi cuenta' },
];

const normalizeAdminImageUrls = (raw) => {
  if (!raw) return [];
  const text = String(raw);
  return text
    .split(/\r?\n|,|;|\|/)
    .map((x) => x.trim())
    .filter(Boolean);
};

function TabButton({ active, onClick, children }) {
  return (
    <button
      className={`w-100 text-start btn btn-sm ${active ? 'btn-primary' : 'btn-light'} mb-2`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function OverviewCard({ title, value, muted }) {
  return (
    <div className="p-3 border rounded h-100">
      <div className="text-muted small">{title}</div>
      <div className="fs-4 fw-bold">{value ?? '-'}</div>
      {muted && <div className="text-muted small mt-1">{muted}</div>}
    </div>
  );
}

export default function Panel() {
  const { user, token, logout } = useAuth();
  const [params, setParams] = useSearchParams();
  const role = user?.role || 'customer';
  const isAdmin = role === 'admin';
  const canManageProducts = isAdmin;

  const defaultTab = canManageProducts ? 'dashboard' : 'cuenta';
  const [tab, setTab] = useState(params.get('tab') || defaultTab);

  useEffect(() => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [tab, setParams]);

  const tabs = useMemo(() => {
    return TABS_BASE.filter((t) => {
      if ((t.key === 'productos' || t.key === 'categorias' || t.key === 'dashboard') && !canManageProducts) return false;
      return true;
    });
  }, [canManageProducts]);

  // Overview
  const [ovLoading, setOvLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [ovErr, setOvErr] = useState('');

  useEffect(() => {
    if (!canManageProducts || tab !== 'dashboard') return;
    let alive = true;
    async function load() {
      setOvErr(''); setOvLoading(true);
      try {
        const data = await api.admin.overview(token);
        if (alive) setOverview(data);
      } catch (e) {
        if (alive) setOvErr(e.message || 'No se pudo cargar el resumen');
      } finally {
        if (alive) setOvLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [tab, token, canManageProducts]);

  // Productos
  const [prodLoading, setProdLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [prodErr, setProdErr] = useState('');
  const [prodSearch, setProdSearch] = useState('');
  const [editingProductId, setEditingProductId] = useState(null);
  const [prodSaving, setProdSaving] = useState(false);
  const [prodSaveErr, setProdSaveErr] = useState('');
  const [prodForm, setProdForm] = useState({
    name: '',
    price: '',
    stock: '',
    active: true,
    description: '',
    category: '',
    imagesText: '',
    imageFiles: [],
  });

  useEffect(() => {
    if (!canManageProducts || tab !== 'productos') return;
    let alive = true;
    async function load() {
      setProdErr(''); setProdLoading(true);
      try {
        const data = await api.admin.listProducts(token, { q: prodSearch || undefined, limit: 30 });
        const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        if (alive) setProductos(items);
      } catch (e) {
        if (alive) setProdErr(e.message || 'No se pudieron cargar productos');
      } finally {
        if (alive) setProdLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [tab, prodSearch, token, canManageProducts]);

  // Categorias
  const [catLoading, setCatLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [catErr, setCatErr] = useState('');

  // Ofertas
  const [offerLoading, setOfferLoading] = useState(false);
  const [offers, setOffers] = useState([]);
  const [offerErr, setOfferErr] = useState('');

  useEffect(() => {
    if (!canManageProducts || (tab !== 'categorias' && tab !== 'productos')) return;
    let alive = true;
    async function load() {
      setCatErr(''); setCatLoading(true);
      try {
        const data = await api.products.categories();
        if (alive) setCategorias(Array.isArray(data) ? data : []);
      } catch (e) {
        if (alive) setCatErr(e.message || 'No se pudieron cargar categorias');
      } finally {
        if (alive) setCatLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [tab, canManageProducts]);

  useEffect(() => {
    if (!canManageProducts || tab !== 'ofertas') return;
    let alive = true;
    async function load() {
      setOfferErr(''); setOfferLoading(true);
      try {
        const data = await api.admin.listOffers(token);
        const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        if (alive) setOffers(items);
      } catch (e) {
        if (alive) setOfferErr(e.message || 'No se pudieron cargar ofertas');
      } finally {
        if (alive) setOfferLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [tab, token, canManageProducts]);

  const startEditProduct = (p) => {
    const id = p.id || p._id;
    const images = Array.isArray(p.images) ? p.images : [];
    const first = p.imageUrl || p.image_url || '';
    const merged = [first, ...images].filter(Boolean);
    setEditingProductId(id);
    setProdSaveErr('');
    setProdForm({
      name: p.name || p.nombre || '',
      price: String(p.price ?? p.precio ?? ''),
      stock: String(p.stock ?? 0),
      active: (p.active ?? p.activo ?? true) !== false,
      description: p.description || p.descripcion || '',
      category: String(p.category?.id || p.categoria?.id || p.categoria_id || ''),
      imagesText: merged.join('\n'),
      imageFiles: [],
    });
  };

  const cancelEditProduct = () => {
    setEditingProductId(null);
    setProdSaveErr('');
    setProdForm({
      name: '',
      price: '',
      stock: '',
      active: true,
      description: '',
      category: '',
      imagesText: '',
      imageFiles: [],
    });
  };

  const saveProductFromPanel = async () => {
    if (!editingProductId) return;
    setProdSaving(true);
    setProdSaveErr('');
    try {
      let uploadedUrls = [];
      for (const file of prodForm.imageFiles || []) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await api.admin.uploadImage(token, fd);
        const url = up?.url || up?.path || '';
        if (url) uploadedUrls.push(url);
      }
      const images = [
        ...normalizeAdminImageUrls(prodForm.imagesText),
        ...uploadedUrls,
      ];
      const uniqueImages = [...new Set(images)];

      const payload = {
        name: prodForm.name,
        price: prodForm.price,
        stock: Number(prodForm.stock || 0),
        active: !!prodForm.active,
        description: prodForm.description,
        category: prodForm.category || null,
        images: uniqueImages,
      };
      const updated = await api.admin.updateProduct(token, editingProductId, payload);
      setProductos((prev) => prev.map((p) => (
        String(p.id || p._id) === String(editingProductId) ? updated : p
      )));
      cancelEditProduct();
    } catch (e) {
      setProdSaveErr(e?.message || 'No se pudo guardar el producto');
    } finally {
      setProdSaving(false);
    }
  };

  const renderDashboard = () => (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h4 className="mb-0">Resumen</h4>
          <small className="text-muted">Vista rapida para administradores</small>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Button variant="outline-secondary" size="sm" href="http://localhost:8000/admin/" target="_blank" rel="noreferrer">
            Abrir Django admin
          </Button>
          <Button variant="outline-secondary" size="sm" href="/" >
            Ir a tienda
          </Button>
        </div>
      </div>

      {ovErr && <Alert variant="danger" className="mb-0">{ovErr}</Alert>}
      {ovLoading && <div className="text-center py-4"><Spinner animation="border" /></div>}

      <Row className="g-3">
        <Col md={3}><OverviewCard title="Productos" value={overview?.products} /></Col>
        <Col md={3}><OverviewCard title="Categorias" value={overview?.categories} /></Col>
        <Col md={3}><OverviewCard title="Usuarios" value={overview?.users} /></Col>
        <Col md={3}><OverviewCard title="Ordenes" value={overview?.orders} muted="Totales registrados" /></Col>
      </Row>
    </div>
  );

  const renderProductos = () => (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h4 className="mb-0">Productos</h4>
          <small className="text-muted">Gestion rapida con edicion y galeria de imagenes.</small>
        </div>
        <div className="d-flex gap-2">
          <Button size="sm" variant="primary" href="http://localhost:8000/admin/products/product/" target="_blank" rel="noreferrer">
            Crear desde Django
          </Button>
          <Button size="sm" variant="outline-secondary" href="/productos">
            Ver en tienda
          </Button>
        </div>
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <Form className="d-flex" onSubmit={(e) => e.preventDefault()}>
          <Form.Control
            size="sm"
            placeholder="Buscar producto"
            value={prodSearch}
            onChange={(e) => setProdSearch(e.target.value)}
            style={{ width: 240 }}
          />
        </Form>
        {prodErr && <span className="text-danger small">{prodErr}</span>}
      </div>

      {prodLoading ? (
        <div className="text-center py-4"><Spinner animation="border" /></div>
      ) : (
        <div className="table-responsive">
          <Table striped hover size="sm" className="align-middle">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Categoria</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Imagenes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (
                <tr key={p.id || p.slug || p.name}>
                  <td>{p.name || p.nombre}</td>
                  <td>{p.category?.name || p.categoria || '-'}</td>
                  <td>{p.price != null ? `$ ${p.price}` : '-'}</td>
                  <td>{p.stock ?? '-'}</td>
                  <td>{Array.isArray(p.images) ? p.images.length : (p.imageUrl || p.image_url ? 1 : 0)}</td>
                  <td className="text-end">
                    <Button size="sm" variant="outline-primary" onClick={() => startEditProduct(p)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {productos.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted">Sin productos</td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      )}

      {editingProductId && (
        <div className="border rounded p-3 bg-light">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Editar producto</h6>
            <Button size="sm" variant="outline-secondary" onClick={cancelEditProduct}>Cancelar</Button>
          </div>
          {prodSaveErr && <Alert variant="danger" className="py-2">{prodSaveErr}</Alert>}
          <Row className="g-2">
            <Col md={6}>
              <Form.Label>Nombre</Form.Label>
              <Form.Control value={prodForm.name} onChange={(e) => setProdForm((f) => ({ ...f, name: e.target.value }))} />
            </Col>
            <Col md={3}>
              <Form.Label>Precio</Form.Label>
              <Form.Control type="number" step="0.01" value={prodForm.price} onChange={(e) => setProdForm((f) => ({ ...f, price: e.target.value }))} />
            </Col>
            <Col md={3}>
              <Form.Label>Stock</Form.Label>
              <Form.Control type="number" min="0" value={prodForm.stock} onChange={(e) => setProdForm((f) => ({ ...f, stock: e.target.value }))} />
            </Col>
            <Col md={6}>
              <Form.Label>Categoria</Form.Label>
              <Form.Select value={prodForm.category} onChange={(e) => setProdForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="">Sin categoria</option>
                {categorias.map((c) => (
                  <option key={String(c.id || c._id)} value={String(c.id || c._id)}>
                    {c.nombre || c.name || c.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6} className="d-flex align-items-end">
              <Form.Check
                type="switch"
                id="prod-active"
                label="Activo"
                checked={!!prodForm.active}
                onChange={(e) => setProdForm((f) => ({ ...f, active: e.target.checked }))}
              />
            </Col>
            <Col md={12}>
              <Form.Label>Descripcion</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={prodForm.description}
                onChange={(e) => setProdForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Col>
            <Col md={12}>
              <Form.Label>URLs de imagen (una por linea)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={prodForm.imagesText}
                onChange={(e) => setProdForm((f) => ({ ...f, imagesText: e.target.value }))}
                placeholder="https://.../img1.jpg&#10;https://.../img2.jpg"
              />
            </Col>
            <Col md={12}>
              <Form.Label>Subir imagenes (multiples)</Form.Label>
              <Form.Control
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setProdForm((f) => ({ ...f, imageFiles: files }));
                }}
              />
              {!!prodForm.imageFiles.length && (
                <div className="small text-muted mt-1">{prodForm.imageFiles.length} archivo(s) listos para subir</div>
              )}
            </Col>
          </Row>
          <div className="d-flex justify-content-end mt-3">
            <Button size="sm" onClick={saveProductFromPanel} disabled={prodSaving}>
              {prodSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderCategorias = () => (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h4 className="mb-0">Categorias</h4>
          <small className="text-muted">Cargadas en Django, visibles en el frontend.</small>
        </div>
        <Button size="sm" variant="outline-secondary" href="http://localhost:8000/admin/categories/category/" target="_blank" rel="noreferrer">
          Editar en Django
        </Button>
      </div>

      {catErr && <Alert variant="danger" className="mb-0">{catErr}</Alert>}
      {catLoading && <div className="text-center py-4"><Spinner animation="border" /></div>}

      <ul className="list-group">
        {categorias.map((c) => (
          <li key={c.id || c.slug} className="list-group-item d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">{c.nombre}</div>
              {c.slug && <small className="text-muted">/{c.slug}</small>}
            </div>
            {c.parent && <Badge bg="light" text="dark">Depende de {c.parent}</Badge>}
          </li>
        ))}
        {categorias.length === 0 && !catLoading && (
          <li className="list-group-item text-center text-muted">No hay categorias cargadas.</li>
        )}
      </ul>
    </div>
  );

  const renderOfertas = () => (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h4 className="mb-0">Ofertas</h4>
          <small className="text-muted">Descuentos por producto o categoria.</small>
        </div>
        <Button size="sm" variant="outline-secondary" href="http://localhost:8000/admin/products/offer/" target="_blank" rel="noreferrer">
          Gestionar en Django
        </Button>
      </div>

      {offerErr && <Alert variant="danger" className="mb-0">{offerErr}</Alert>}
      {offerLoading && <div className="text-center py-4"><Spinner animation="border" /></div>}

      <div className="table-responsive">
        <Table striped hover size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>%</th>
              <th>Producto</th>
              <th>Categoria</th>
              <th>Activo</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id || o.slug}>
                <td>{o.name}</td>
                <td>{o.percent}%</td>
                <td>{o.product?.name || '-'}</td>
                <td>{o.category?.name || '-'}</td>
                <td>{o.active ? 'Si' : 'No'}</td>
              </tr>
            ))}
            {offers.length === 0 && !offerLoading && (
              <tr><td colSpan={5} className="text-center text-muted">Sin ofertas</td></tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );

  const renderCuenta = () => (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h4 className="mb-0">Mi cuenta</h4>
          <small className="text-muted">Datos basicos de tu perfil.</small>
        </div>
        <Button variant="outline-danger" size="sm" onClick={logout}>Cerrar sesion</Button>
      </div>

      <div className="border rounded p-3">
        <div className="mb-2"><strong>Nombre:</strong> {user?.name || user?.username || '—'}</div>
        <div className="mb-2"><strong>Email:</strong> {user?.email || '—'}</div>
        <div className="mb-2"><strong>Rol:</strong> {user?.role || 'usuario'}</div>
      </div>
    </div>
  );

  return (
    <Container fluid className="py-4">
      <Row className="g-3">
        <Col lg={3}>
          <div className="border rounded p-3">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div>
                <div className="fw-bold">{user?.name || user?.email || 'Usuario'}</div>
                <small className="text-muted text-uppercase">{role}</small>
              </div>
              <Badge bg="secondary">{user ? 'Activo' : 'Desconectado'}</Badge>
            </div>
            {tabs.map((t) => (
              <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </TabButton>
            ))}
          </div>
        </Col>
        <Col lg={9}>
          <div className="border rounded p-4 bg-white shadow-sm">
            {tab === 'dashboard' && canManageProducts && renderDashboard()}
            {tab === 'productos' && canManageProducts && renderProductos()}
            {tab === 'categorias' && canManageProducts && renderCategorias()}
            {tab === 'ofertas' && canManageProducts && renderOfertas()}
            {tab === 'cuenta' && renderCuenta()}
            {!canManageProducts && tab !== 'cuenta' && (
              <Alert variant="warning">No tenes permisos para esta seccion.</Alert>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
}

