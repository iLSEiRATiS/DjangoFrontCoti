import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Col, Container, Row, Table, Alert, Spinner, Form } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { API_BASE } from '../lib/api';

const TABS_BASE = [
  { key: 'dashboard', label: 'Resumen' },
  { key: 'productos', label: 'Productos' },
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'pedidos', label: 'Pedidos' },
  { key: 'ofertas', label: 'Ofertas' },
  { key: 'cuenta', label: 'Mi cuenta' },
];

const ORDER_STATUS_LABELS = {
  created: 'Creado',
  approved: 'Aprobado',
  pending_payment: 'Falta pago',
  paid: 'Pagado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  draft: 'Borrador',
};

const normalizeAdminImageUrls = (raw) => {
  if (!raw) return [];
  return String(raw)
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

function OverviewCard({ title, value, muted, onClick }) {
  return (
    <button
      type="button"
      className="p-3 border rounded h-100 w-100 text-start bg-white"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="text-muted small">{title}</div>
      <div className="fs-4 fw-bold">{value ?? '-'}</div>
      {muted ? <div className="text-muted small mt-1">{muted}</div> : null}
    </button>
  );
}

const approvalLabel = (status) => {
  if (status === 'approved') return 'Aprobado';
  if (status === 'rejected') return 'Rechazado';
  return 'Pendiente';
};

const approvalVariant = (status) => {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warning';
};

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
      if ((t.key === 'dashboard' || t.key === 'productos' || t.key === 'usuarios' || t.key === 'pedidos') && !canManageProducts) {
        return false;
      }
      return true;
    });
  }, [canManageProducts]);

  const [overview, setOverview] = useState(null);
  const [ovLoading, setOvLoading] = useState(false);
  const [ovErr, setOvErr] = useState('');

  const [catLoading, setCatLoading] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [catErr, setCatErr] = useState('');

  const [prodLoading, setProdLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [prodErr, setProdErr] = useState('');
  const [prodSearch, setProdSearch] = useState('');
  const [prodCategory, setProdCategory] = useState('');
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

  const [usersLoading, setUsersLoading] = useState(false);
  const [usersErr, setUsersErr] = useState('');
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userSavingId, setUserSavingId] = useState(null);

  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState('');
  const [orders, setOrders] = useState([]);
  const [orderStatus, setOrderStatus] = useState('');

  const [offerLoading, setOfferLoading] = useState(false);
  const [offers, setOffers] = useState([]);
  const [offerErr, setOfferErr] = useState('');

  useEffect(() => {
    if (!canManageProducts || tab !== 'dashboard') return;
    let alive = true;
    async function load() {
      setOvErr('');
      setOvLoading(true);
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

  useEffect(() => {
    if (!canManageProducts || (tab !== 'dashboard' && tab !== 'productos')) return;
    let alive = true;
    async function load() {
      setCatErr('');
      setCatLoading(true);
      try {
        const data = await api.products.categories();
        const items = Array.isArray(data?.results) ? data.results : (Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []));
        if (alive) setCategorias(items);
      } catch (e) {
        if (alive) setCatErr(e.message || 'No se pudieron cargar categorias');
      } finally {
        if (alive) setCatLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [tab, canManageProducts]);

  async function fetchAllPanelProducts() {
    const limit = 100;
    let page = 1;
    let pages = 1;
    const all = [];
    do {
      const data = await api.admin.listProducts(token, { page, limit });
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      all.push(...items);
      pages = Number(data?.pages) || 1;
      page += 1;
    } while (page <= pages);
    return all;
  }

  useEffect(() => {
    if (!canManageProducts || tab !== 'productos') return;
    let alive = true;
    async function load() {
      setProdErr('');
      setProdLoading(true);
      try {
        const items = await fetchAllPanelProducts();
        if (alive) setProductos(items);
      } catch (e) {
        if (alive) setProdErr(e.message || 'No se pudieron cargar productos');
      } finally {
        if (alive) setProdLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [tab, token, canManageProducts]);

  useEffect(() => {
    if (!canManageProducts || tab !== 'usuarios') return;
    let alive = true;
    async function load() {
      setUsersErr('');
      setUsersLoading(true);
      try {
        const data = await api.admin.listUsers(token, { q: userSearch || undefined, limit: 100 });
        const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        if (alive) setUsers(items);
      } catch (e) {
        if (alive) setUsersErr(e.message || 'No se pudieron cargar usuarios');
      } finally {
        if (alive) setUsersLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [tab, token, canManageProducts, userSearch]);

  useEffect(() => {
    if (!canManageProducts || tab !== 'pedidos') return;
    let alive = true;
    async function load() {
      setOrdersErr('');
      setOrdersLoading(true);
      try {
        const data = await api.admin.listOrders(token, { status: orderStatus || undefined, limit: 100 });
        const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data?.orders) ? data.orders : (Array.isArray(data) ? data : []));
        if (alive) setOrders(items);
      } catch (e) {
        if (alive) setOrdersErr(e.message || 'No se pudieron cargar pedidos');
      } finally {
        if (alive) setOrdersLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [tab, token, canManageProducts, orderStatus]);

  useEffect(() => {
    if (!canManageProducts || tab !== 'ofertas') return;
    let alive = true;
    async function load() {
      setOfferErr('');
      setOfferLoading(true);
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

  const categoryDescendants = useMemo(() => {
    if (!prodCategory) return null;
    const children = new Map();
    categorias.forEach((c) => {
      const id = String(c.id || c._id || '');
      const parent = String(c.parent || c.parent_id || c.parentId || c.parent?.id || c.parent?._id || '');
      if (!id) return;
      if (parent) {
        if (!children.has(parent)) children.set(parent, []);
        children.get(parent).push(id);
      }
    });
    const out = new Set();
    const stack = [String(prodCategory)];
    while (stack.length) {
      const current = stack.pop();
      if (out.has(current)) continue;
      out.add(current);
      (children.get(current) || []).forEach((child) => stack.push(child));
    }
    return out;
  }, [prodCategory, categorias]);

  const filteredProducts = useMemo(() => {
    const q = prodSearch.trim().toLowerCase();
    return productos.filter((p) => {
      const name = String(p.name || p.nombre || '').toLowerCase();
      const catId = String(p.category?.id || p.category?._id || p.categoria?.id || p.categoria?._id || '');
      const matchesName = !q || name.includes(q);
      const matchesCategory = !prodCategory || (catId && (catId === String(prodCategory) || categoryDescendants?.has(catId)));
      return matchesName && matchesCategory;
    });
  }, [productos, prodSearch, prodCategory, categoryDescendants]);

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
      const images = [...normalizeAdminImageUrls(prodForm.imagesText), ...uploadedUrls];
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
      setProductos((prev) => prev.map((p) => (String(p.id || p._id) === String(editingProductId) ? updated : p)));
      cancelEditProduct();
    } catch (e) {
      setProdSaveErr(e?.message || 'No se pudo guardar el producto');
    } finally {
      setProdSaving(false);
    }
  };

  const updateUserApproval = async (targetUser, approvalStatus) => {
    const id = targetUser?.id || targetUser?._id;
    if (!id) return;
    try {
      setUserSavingId(id);
      const updated = await api.admin.updateUser(token, id, { approvalStatus });
      setUsers((prev) => prev.map((item) => (String(item.id || item._id) === String(id) ? updated : item)));
    } catch (e) {
      setUsersErr(e?.message || 'No se pudo actualizar la aprobacion del usuario');
    } finally {
      setUserSavingId(null);
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
          <Button variant="outline-secondary" size="sm" href={`${API_BASE}/admin/`} target="_blank" rel="noreferrer">
            Abrir Django admin
          </Button>
          <Button variant="outline-secondary" size="sm" href="/">
            Ir a tienda
          </Button>
        </div>
      </div>

      {ovErr ? <Alert variant="danger" className="mb-0">{ovErr}</Alert> : null}
      {catErr ? <Alert variant="danger" className="mb-0">{catErr}</Alert> : null}
      {ovLoading ? <div className="text-center py-4"><Spinner animation="border" /></div> : null}

      <Row className="g-3">
        <Col md={3}><OverviewCard title="Productos" value={overview?.counts?.products} muted="Catalogo activo" onClick={() => setTab('productos')} /></Col>
        <Col md={3}><OverviewCard title="Categorias" value={overview?.counts?.categories ?? (catLoading ? '-' : categorias.length)} muted="Navegables en productos" onClick={() => setTab('productos')} /></Col>
        <Col md={3}><OverviewCard title="Usuarios" value={overview?.counts?.users} muted="Clientes registrados" onClick={() => setTab('usuarios')} /></Col>
        <Col md={3}><OverviewCard title="Pedidos" value={overview?.counts?.orders} muted="Totales registrados" onClick={() => setTab('pedidos')} /></Col>
      </Row>

      <Row className="g-3">
        <Col md={6}>
          <div className="p-3 border rounded h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div className="fw-semibold">Ultimos usuarios</div>
                <div className="small text-muted">Altas mas recientes</div>
              </div>
              <Button size="sm" variant="outline-secondary" onClick={() => setTab('usuarios')}>Ver usuarios</Button>
            </div>
            <Table size="sm" responsive className="mb-0">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.recentUsers || []).map((u) => (
                  <tr key={u.id || u._id}>
                    <td>{u.name || '-'}</td>
                    <td>{u.email || '-'}</td>
                    <td><Badge bg={approvalVariant(u.approvalStatus)}>{approvalLabel(u.approvalStatus)}</Badge></td>
                  </tr>
                ))}
                {(!overview?.recentUsers || overview.recentUsers.length === 0) ? (
                  <tr><td colSpan={3} className="text-center text-muted">Sin usuarios recientes.</td></tr>
                ) : null}
              </tbody>
            </Table>
          </div>
        </Col>
        <Col md={6}>
          <div className="p-3 border rounded h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div className="fw-semibold">Ultimos pedidos</div>
                <div className="small text-muted">Actividad reciente de la tienda</div>
              </div>
              <Button size="sm" variant="outline-secondary" onClick={() => setTab('pedidos')}>Ver pedidos</Button>
            </div>
            <Table size="sm" responsive className="mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.lastOrders || []).map((o) => (
                  <tr key={o._id}>
                    <td>#{o._id}</td>
                    <td>{o.user?.name || o.user?.email || 'Cliente'}</td>
                    <td><Badge bg="secondary">{o.statusLabel || ORDER_STATUS_LABELS[o.status] || o.status}</Badge></td>
                  </tr>
                ))}
                {(!overview?.lastOrders || overview.lastOrders.length === 0) ? (
                  <tr><td colSpan={3} className="text-center text-muted">Sin pedidos recientes.</td></tr>
                ) : null}
              </tbody>
            </Table>
          </div>
        </Col>
      </Row>
    </div>
  );

  const renderProductos = () => (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h4 className="mb-0">Productos</h4>
          <small className="text-muted">Navega el catalogo por categoria y busca por nombre.</small>
        </div>
        <div className="d-flex gap-2">
          <Button size="sm" variant="primary" href={`${API_BASE}/admin/products/product/`} target="_blank" rel="noreferrer">
            Crear desde Django
          </Button>
          <Button size="sm" variant="outline-secondary" href="/productos">
            Ver en tienda
          </Button>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-2">
        <div className="d-flex flex-wrap gap-2">
          <Form.Control
            size="sm"
            placeholder="Buscar producto por nombre"
            value={prodSearch}
            onChange={(e) => setProdSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <Form.Select
            size="sm"
            value={prodCategory}
            onChange={(e) => setProdCategory(e.target.value)}
            style={{ width: 280 }}
          >
            <option value="">Todas las categorias</option>
            {categorias
              .map((c) => ({
                id: String(c.id || c._id || ''),
                label: c.pathName || c.name || c.nombre || c.label || '',
              }))
              .filter((c) => c.id && c.label)
              .sort((a, b) => a.label.localeCompare(b.label, 'es'))
              .map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
          </Form.Select>
        </div>
        {prodErr ? <span className="text-danger small">{prodErr}</span> : null}
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
              {filteredProducts.map((p) => (
                <tr key={p.id || p.slug || p.name}>
                  <td>{p.name || p.nombre}</td>
                  <td>{p.category?.pathName || p.category?.name || p.categoria?.pathName || p.categoria?.name || p.categoria || '-'}</td>
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
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-muted">Sin productos.</td></tr>
              ) : null}
            </tbody>
          </Table>
        </div>
      )}

      {editingProductId ? (
        <div className="border rounded p-3 bg-light">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">Editar producto</h6>
            <Button size="sm" variant="outline-secondary" onClick={cancelEditProduct}>Cancelar</Button>
          </div>
          {prodSaveErr ? <Alert variant="danger" className="py-2">{prodSaveErr}</Alert> : null}
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
                    {c.pathName || c.name || c.nombre || c.label}
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
              <Form.Control as="textarea" rows={2} value={prodForm.description} onChange={(e) => setProdForm((f) => ({ ...f, description: e.target.value }))} />
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
                onChange={(e) => setProdForm((f) => ({ ...f, imageFiles: Array.from(e.target.files || []) }))}
              />
              {prodForm.imageFiles.length ? <div className="small text-muted mt-1">{prodForm.imageFiles.length} archivo(s) listos para subir</div> : null}
            </Col>
          </Row>
          <div className="d-flex justify-content-end mt-3">
            <Button size="sm" onClick={saveProductFromPanel} disabled={prodSaving}>
              {prodSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderUsuarios = () => (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h4 className="mb-0">Usuarios</h4>
          <small className="text-muted">Aprobacion y vista general de clientes desde el panel.</small>
        </div>
        <Form.Control
          size="sm"
          placeholder="Buscar por nombre o email"
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          style={{ width: 260 }}
        />
      </div>

      {usersErr ? <Alert variant="danger" className="mb-0">{usersErr}</Alert> : null}
      {usersLoading ? (
        <div className="text-center py-4"><Spinner animation="border" /></div>
      ) : (
        <div className="table-responsive">
          <Table striped hover size="sm" className="align-middle">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Fecha de registro</th>
                <th>Estado de aprobacion</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id || u._id}>
                  <td>{u.name || '-'}</td>
                  <td>{u.email || '-'}</td>
                  <td>{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</td>
                  <td><Badge bg={approvalVariant(u.approvalStatus)}>{approvalLabel(u.approvalStatus)}</Badge></td>
                  <td className="text-end d-flex gap-2 justify-content-end">
                    <Button
                      size="sm"
                      variant="outline-success"
                      disabled={userSavingId === (u.id || u._id) || u.approvalStatus === 'approved'}
                      onClick={() => updateUserApproval(u, 'approved')}
                    >
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={userSavingId === (u.id || u._id) || u.approvalStatus === 'rejected'}
                      onClick={() => updateUserApproval(u, 'rejected')}
                    >
                      Desaprobar
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted">Sin usuarios.</td></tr>
              ) : null}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );

  const renderPedidos = () => (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h4 className="mb-0">Pedidos</h4>
          <small className="text-muted">Listado general y acceso rapido al admin Django.</small>
        </div>
        <Form.Select size="sm" value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)} style={{ width: 220 }}>
          <option value="">Todos los estados</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Form.Select>
      </div>

      {ordersErr ? <Alert variant="danger" className="mb-0">{ordersErr}</Alert> : null}
      {ordersLoading ? (
        <div className="text-center py-4"><Spinner animation="border" /></div>
      ) : (
        <div className="table-responsive">
          <Table striped hover size="sm" className="align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Fecha de creacion</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id}>
                  <td>#{o._id}</td>
                  <td>{o.user?.name || o.user?.email || 'Cliente'}</td>
                  <td>{o.createdAt ? new Date(o.createdAt).toLocaleString() : '-'}</td>
                  <td><Badge bg="secondary">{o.statusLabel || ORDER_STATUS_LABELS[o.status] || o.status}</Badge></td>
                  <td className="text-end">
                    <Button size="sm" variant="outline-secondary" href={`https://api.cotistore.com.ar/panel-seguro-2026-Coti-Store/orders/order/${o._id}/change/`} target="_blank" rel="noreferrer">
                      Abrir en Django
                    </Button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted">Sin pedidos.</td></tr>
              ) : null}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );

  const renderOfertas = () => (
    <div className="d-flex flex-column gap-3">
      <div className="d-flex align-items-center justify-content-between">
        <div>
          <h4 className="mb-0">Ofertas</h4>
          <small className="text-muted">Descuentos por producto o categoria.</small>
        </div>
        <Button size="sm" variant="outline-secondary" href="https://api.cotistore.com.ar/panel-seguro-2026-Coti-Store/products/offer/" target="_blank" rel="noreferrer">
          Gestionar en Django
        </Button>
      </div>

      {offerErr ? <Alert variant="danger" className="mb-0">{offerErr}</Alert> : null}
      {offerLoading ? <div className="text-center py-4"><Spinner animation="border" /></div> : null}

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
            {offers.length === 0 && !offerLoading ? (
              <tr><td colSpan={5} className="text-center text-muted">Sin ofertas</td></tr>
            ) : null}
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
        <div className="mb-2"><strong>Nombre:</strong> {user?.name || user?.username || '-'}</div>
        <div className="mb-2"><strong>Email:</strong> {user?.email || '-'}</div>
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
            {tab === 'dashboard' && canManageProducts ? renderDashboard() : null}
            {tab === 'productos' && canManageProducts ? renderProductos() : null}
            {tab === 'usuarios' && canManageProducts ? renderUsuarios() : null}
            {tab === 'pedidos' && canManageProducts ? renderPedidos() : null}
            {tab === 'ofertas' && canManageProducts ? renderOfertas() : null}
            {tab === 'cuenta' ? renderCuenta() : null}
            {!canManageProducts && tab !== 'cuenta' ? (
              <Alert variant="warning">No tenes permisos para esta seccion.</Alert>
            ) : null}
          </div>
        </Col>
      </Row>
    </Container>
  );
}
