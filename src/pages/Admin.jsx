import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Alert, Spinner, Button, Tabs, Tab, Form, Row, Col, Badge, Pagination, Modal } from 'react-bootstrap';
import { API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const STATUSES = ['created', 'approved', 'pending_payment', 'paid', 'shipped', 'delivered', 'cancelled'];
const STATUS_LABELS = {
  created: 'Creado',
  approved: 'Aprobado',
  pending_payment: 'Falta pago',
  paid: 'Pagado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};
const STATUS_VARIANTS = {
  created: 'secondary',
  approved: 'info',
  pending_payment: 'warning',
  paid: 'success',
  shipped: 'primary',
  delivered: 'success',
  cancelled: 'danger',
};

const norm = (s = '') =>
  s
    .toString()
    .trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const isSizeGroupLabel = (label = '') =>
  ['9 pulgadas', '10 pulgadas', '12 pulgadas'].includes(norm(label));

const sizeGroupMatchesProduct = (product, label = '') => {
  if (!isSizeGroupLabel(label)) return false;
  const key = norm(label);
  const name = norm(product?.name || product?.nombre || '');
  const catName = norm(product?.category?.name || product?.category?.nombre || product?.categoria?.name || product?.categoria?.nombre || '');
  const subName = norm(product?.subcategory?.name || product?.subcategory?.nombre || product?.subcategoria || '');
  if (name.includes(key)) return true;
  // match variants like 9" or 9'' or 9 pulgadas in name
  const num = key.split(' ')[0]; // "9", "10", "12"
  if (num && (name.includes(`${num}"`) || name.includes(`${num}''`) || name.includes(`${num} pulgadas`))) return true;
  if (catName.includes(key) || subName.includes(key)) return true;
  return false;
};

export default function Admin() {
  const { token, user } = useAuth();
  const [tab, setTab] = useState('overview');

  // overview
  const [ovrLoading, setOvrLoading] = useState(true);
  const [ovrErr, setOvrErr] = useState('');
  const [overview, setOverview] = useState(null);

  // users
  const [uLoading, setULoading] = useState(true);
  const [uErr, setUErr] = useState('');
  const [users, setUsers] = useState([]);
  const [userQ, setUserQ] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });

  // orders
  const [oLoading, setOLoading] = useState(true);
  const [oErr, setOErr] = useState('');
  const [orders, setOrders] = useState([]);
  const [orderStatus, setOrderStatus] = useState('');
  const [editOrder, setEditOrder] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editStatus, setEditStatus] = useState('');

  // products
  const [pLoading, setPLoading] = useState(true);
  const [pErr, setPErr] = useState('');
  const [products, setProducts] = useState([]);
  const [productQ, setProductQ] = useState('');
  const [productCatQ, setProductCatQ] = useState('');
  const [productCategories, setProductCategories] = useState([]);
  const [productPage, setProductPage] = useState(1);
  const perPageProducts = 24;
  const [editSearchQ, setEditSearchQ] = useState('');
  const [editSearchCat, setEditSearchCat] = useState('');
  const [editSearchPage, setEditSearchPage] = useState(1);
  const perPageEditSearch = 8;

  const selectedProductCategory = useMemo(() => {
    if (!productCatQ) return null;
    return productCategories.find((c) => String(c.id || c._id) === String(productCatQ)) || null;
  }, [productCatQ, productCategories]);

  const selectedEditSearchCategory = useMemo(() => {
    if (!editSearchCat) return null;
    return productCategories.find((c) => String(c.id || c._id) === String(editSearchCat)) || null;
  }, [editSearchCat, productCategories]);

  const productCatDescendants = useMemo(() => {
    if (!productCatQ) return null;
    const children = new Map();
    productCategories.forEach((c) => {
      const id = String(c.id || c._id || '');
      const parent = String(c.parent || c.parent_id || c.parentId || '');
      if (!id) return;
      if (parent) {
        if (!children.has(parent)) children.set(parent, []);
        children.get(parent).push(id);
      }
    });
    const out = new Set();
    const stack = [String(productCatQ)];
    while (stack.length) {
      const current = stack.pop();
      if (out.has(current)) continue;
      out.add(current);
      const kids = children.get(current) || [];
      kids.forEach((k) => stack.push(k));
    }
    return out;
  }, [productCatQ, productCategories]);

  const editSearchDescendants = useMemo(() => {
    if (!editSearchCat) return null;
    const children = new Map();
    productCategories.forEach((c) => {
      const id = String(c.id || c._id || '');
      const parent = String(c.parent || c.parent_id || c.parentId || '');
      if (!id) return;
      if (parent) {
        if (!children.has(parent)) children.set(parent, []);
        children.get(parent).push(id);
      }
    });
    const out = new Set();
    const stack = [String(editSearchCat)];
    while (stack.length) {
      const current = stack.pop();
      if (out.has(current)) continue;
      out.add(current);
      const kids = children.get(current) || [];
      kids.forEach((k) => stack.push(k));
    }
    return out;
  }, [editSearchCat, productCategories]);

  const editSearchFilteredProducts = useMemo(() => {
    if (!editOrder) return [];
    const selectedLabel = selectedEditSearchCategory
      ? (selectedEditSearchCategory.nombre || selectedEditSearchCategory.name || selectedEditSearchCategory.label || '')
      : '';
    const sizeGroup = isSizeGroupLabel(selectedLabel);
    const q = editSearchQ.trim().toLowerCase();
    return products.filter((p) => {
      const name = (p.name || p.nombre || '').toLowerCase();
      const catId = String(p.category?.id || p.category?._id || p.categoria?.id || p.categoria?._id || '');
      const nameOk = !q || name.includes(q);
      const catOk = !editSearchCat.trim()
        || (catId && (catId === String(editSearchCat) || (editSearchDescendants && editSearchDescendants.has(catId))))
        || (sizeGroup && sizeGroupMatchesProduct(p, selectedLabel));
      return nameOk && catOk;
    });
  }, [editOrder, products, editSearchQ, editSearchCat, editSearchDescendants, selectedEditSearchCategory]);

  async function fetchAllProducts(params = {}) {
    const limit = 100;
    let page = 1;
    let pages = 1;
    const all = [];
    do {
      const data = await api.admin.listProducts(token, { ...params, page, limit });
      const items = Array.isArray(data) ? data : (data?.items || []);
      all.push(...items);
      pages = Number(data?.pages) || 1;
      page += 1;
    } while (page <= pages);
    return all;
  }

  async function refreshOverview() {
    if (!token) return;
    try {
      const data = await api.admin.overview(token);
      setOverview(data);
      setOvrErr('');
    } catch (e) {
      setOvrErr(e?.message || 'Error al cargar el resumen');
    }
  }

  useEffect(() => {
    let alive = true;
    async function loadAll() {
      try {
        const data = await api.admin.overview(token);
        if (alive) setOverview(data);
      } catch (e) {
        if (alive) setOvrErr(e?.message || 'Error al cargar el resumen');
      } finally {
        if (alive) setOvrLoading(false);
      }

      try {
        const data = await api.admin.listUsers(token, { q: userQ });
        const items = Array.isArray(data) ? data : (data?.items || []);
        if (alive) setUsers(items);
      } catch (e) {
        if (alive) setUErr(e?.message || 'Error al cargar usuarios');
      } finally {
        if (alive) setULoading(false);
      }

      try {
        const data = await api.admin.listOrders(token, { status: orderStatus || undefined });
        const items = Array.isArray(data) ? data : (data?.items || data?.orders || []);
        if (alive) setOrders(items);
      } catch (e) {
        if (alive) setOErr(e?.message || 'Error al cargar pedidos');
      } finally {
        if (alive) setOLoading(false);
      }

      try {
        const items = await fetchAllProducts({ q: productQ || undefined });
        if (alive) setProducts(items);
      } catch (e) {
        if (alive) setPErr(e?.message || 'Error al cargar productos');
      } finally {
        if (alive) setPLoading(false);
      }

      try {
        const data = await api.products.categories();
        const items = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
        if (alive) setProductCategories(items);
      } catch {
        if (alive) setProductCategories([]);
      }
    }
    if (token) loadAll();
    return () => { alive = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDeleteUser(id) {
    if (!id) return;
    if (user && (user.id === id || user._id === id)) {
      window.alert('No podés borrarte a vos mismo.');
      return;
    }
    if (!window.confirm('¿Eliminar este usuario y sus pedidos?')) return;
    try {
      await api.admin.deleteUser(token, id);
      setUsers(prev => prev.filter(u => (u._id || u.id) !== id));
      setOrders(prev => prev.filter(o => String(o.user) !== String(id)));
    } catch (e) {
      window.alert(e?.message || 'No se pudo eliminar.');
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    try {
      const created = await api.admin.createUser(token, newUser);
      setUsers(prev => [created, ...prev]);
      setNewUser({ name: '', email: '', password: '' });
    } catch (e) {
      window.alert(e?.message || 'No se pudo crear el usuario.');
    }
  }

  async function handleOrderAction(order, nextStatus) {
    try {
      const updated = await api.admin.updateOrder(token, order._id, { status: nextStatus });
      setOrders(prev => prev.map(o => (o._id === order._id ? updated : o)));
      await refreshOverview();
    } catch (e) {
      window.alert(e?.message || 'No se pudo actualizar el estado.');
    }
  }

  const downloadOrderPdf = async (orderId) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pedido-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      window.alert(e?.message || 'No se pudo descargar el PDF.');
    }
  };

  const openEditOrder = (order) => {
    setEditOrder(order);
    setEditStatus(order.status);
    const items = (order.items || []).map((it, idx) => ({
      key: `${order._id}-${idx}`,
      productId: it.productId || it.product || it.id || it._id,
      name: it.name || 'Producto',
      price: Number(it.price ?? 0),
      qty: Number(it.qty ?? 1),
      attributes: it.attributes || {},
    }));
    setEditItems(items);
    setEditSearchQ('');
    setEditSearchCat('');
    setEditSearchPage(1);
  };

  const closeEditOrder = () => {
    setEditOrder(null);
    setEditItems([]);
    setEditStatus('');
  };

  const addProductToEditOrder = (product) => {
    const productId = product._id || product.id;
    if (!productId) return;
    const price = Number(product.price ?? product.precio ?? 0);
    const name = product.name || product.nombre || 'Producto';
    setEditItems((prev) => {
      const idx = prev.findIndex((it) => String(it.productId) === String(productId) && (!it.attributes || Object.keys(it.attributes).length === 0));
      if (idx >= 0) {
        return prev.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, Number(it.qty || 1) + 1) } : it));
      }
      return [
        ...prev,
        {
          key: `${productId}-${Date.now()}`,
          productId,
          name,
          price,
          qty: 1,
          attributes: {},
        },
      ];
    });
  };

  const saveEditOrder = async () => {
    if (!editOrder) return;
    try {
      const payloadItems = editItems.map((it) => ({
        productId: it.productId,
        name: it.name,
        price: Number(it.price ?? 0),
        qty: Math.max(1, Number(it.qty ?? 1)),
        attributes: it.attributes || {},
      }));
      const updated = await api.admin.updateOrder(token, editOrder._id, {
        status: editStatus || editOrder.status,
        items: payloadItems,
      });
      setOrders((prev) => prev.map((o) => (o._id === editOrder._id ? updated : o)));
      await refreshOverview();
      closeEditOrder();
    } catch (e) {
      window.alert(e?.message || 'No se pudo actualizar el pedido.');
    }
  };

  if (user && user.role !== 'admin') {
    return <Alert variant="warning" className="m-3">Acceso restringido.</Alert>;
  }

  const renderOrders = () => (
    <>
      {oErr && <Alert variant="danger" className="mb-3">{oErr}</Alert>}
      <Form onSubmit={(e)=>e.preventDefault()} className="mb-2">
        <Row className="g-2 align-items-end">
          <Col md>
            <Form.Label>Estado</Form.Label>
            <Form.Select value={orderStatus} onChange={e=>setOrderStatus(e.target.value)}>
              <option value="">Todos</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </Form.Select>
          </Col>
          <Col md="auto" className="pt-4">
            <Button variant="outline-primary" onClick={async () => {
              setOLoading(true);
              try {
                const data = await api.admin.listOrders(token, { status: orderStatus || undefined });
                const items = Array.isArray(data) ? data : (data?.items || data?.orders || []);
                setOrders(items);
              } catch (e) {
                setOErr(e?.message || 'Error al cargar pedidos');
              } finally {
                setOLoading(false);
              }
            }}>Filtrar</Button>
          </Col>
        </Row>
      </Form>
      {oLoading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Monto</th>
              <th>Items</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o._id}>
                <td>{o._id}</td>
                <td>{o.user?.name || o.user?.email || String(o.user)}</td>
                <td>${o.totals?.amount}</td>
                <td>{o.items?.length || 0}</td>
                <td>
                  <Badge bg={STATUS_VARIANTS[o.status] || 'secondary'}>
                    {STATUS_LABELS[o.status] || o.status}
                  </Badge>
                </td>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
                <td className="text-end d-flex flex-wrap gap-1 justify-content-end">
                  <Form.Select
                    size="sm"
                    style={{maxWidth:160}}
                    value={o.status}
                    onChange={e=>handleOrderAction(o, e.target.value)}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </Form.Select>
                  <Button size="sm" variant="outline-success" onClick={() => handleOrderAction(o, 'approved')}>Aprobar</Button>
                  <Button size="sm" variant="outline-primary" onClick={() => handleOrderAction(o, 'paid')}>Marcar pago</Button>
                  <Button size="sm" variant="outline-danger" onClick={() => handleOrderAction(o, 'cancelled')}>Cancelar</Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => openEditOrder(o)}>Ver / Editar</Button>
                  <Button size="sm" variant="outline-dark" onClick={() => downloadOrderPdf(o._id)}>PDF</Button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="text-center py-3">Sin pedidos.</td></tr>
            )}
          </tbody>
        </Table>
      )}
    </>
  );

  const renderUsers = () => (
    <>
      {uErr && <Alert variant="danger" className="mb-3">{uErr}</Alert>}
      <Form onSubmit={(e)=>{e.preventDefault();}} className="mb-2">
        <Row className="g-2 align-items-end">
          <Col md>
            <Form.Label>Buscar</Form.Label>
            <Form.Control placeholder="Nombre o email" value={userQ} onChange={e=>setUserQ(e.target.value)} />
          </Col>
          <Col md="auto" className="pt-4">
            <Button variant="outline-primary" onClick={async () => {
              setULoading(true);
              try {
                const data = await api.admin.listUsers(token, { q: userQ });
                const items = Array.isArray(data) ? data : (data?.items || []);
                setUsers(items);
              } catch (e) {
                setUErr(e?.message || 'Error al cargar usuarios');
              } finally {
                setULoading(false);
              }
            }}>Buscar</Button>
          </Col>
        </Row>
      </Form>
      <Form onSubmit={handleCreateUser} className="mb-3">
        <Row className="g-2 align-items-end">
          <Col md>
            <Form.Label>Nombre</Form.Label>
            <Form.Control value={newUser.name} onChange={e=>setNewUser(v=>({...v, name:e.target.value}))} required />
          </Col>
          <Col md>
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={newUser.email} onChange={e=>setNewUser(v=>({...v, email:e.target.value}))} required />
          </Col>
          <Col md>
            <Form.Label>Contraseña</Form.Label>
            <Form.Control type="password" value={newUser.password} onChange={e=>setNewUser(v=>({...v, password:e.target.value}))} required />
          </Col>
          <Col md="auto">
            <Button type="submit">Crear usuario</Button>
          </Col>
        </Row>
      </Form>
      {uLoading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Creado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const id = u._id || u.id;
              let avatar = u.profile?.avatar || '';
              if (avatar && avatar.startsWith('/')) avatar = `${API_BASE}${avatar}`;
              const phone = u.profile?.phone || u.shipping?.phone || '';
              const addr = [u.shipping?.address, u.shipping?.city, u.shipping?.zip].filter(Boolean).join(', ');
              return (
                <tr key={id}>
                  <td>{avatar ? <img src={avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} /> : null}</td>
                  <td>{u.name || '-'}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{phone}</td>
                  <td>{addr || '-'}</td>
                  <td>{new Date(u.createdAt).toLocaleString()}</td>
                  <td className="text-end">
                    <Button size="sm" variant="outline-danger" onClick={() => handleDeleteUser(id)}>Borrar</Button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr><td colSpan={8} className="text-center py-3">Sin usuarios.</td></tr>
            )}
          </tbody>
        </Table>
      )}
    </>
  );

  const renderOverview = () => (
    <>
      {ovrErr && <Alert variant="danger" className="mb-3">{ovrErr}</Alert>}
      {ovrLoading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        overview && (
          <>
            <Row className="g-3 mb-3">
              <Col md>
                <Card className="h-100"><Card.Body>
                  <div className="text-muted">Usuarios</div>
                  <div className="fs-3 fw-bold">{overview.counts?.users ?? '-'}</div>
                </Card.Body></Card>
              </Col>
              <Col md>
                <Card className="h-100"><Card.Body>
                  <div className="text-muted">Productos</div>
                  <div className="fs-3 fw-bold">{overview.counts?.products ?? '-'}</div>
                </Card.Body></Card>
              </Col>
              <Col md>
                <Card className="h-100"><Card.Body>
                  <div className="text-muted">Pedidos (30d)</div>
                  <div className="fs-5">{overview.last30d?.orders ?? 0} pedidos</div>
                  <div className="text-success fw-bold">
                    ${Number(overview.last30d?.revenue ?? 0).toFixed(2)}
                  </div>
                </Card.Body></Card>
              </Col>
            </Row>
            <h6 className="mb-2">Notificaciones</h6>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Card className="h-100">
                  <Card.Body>
                    <div className="fw-semibold mb-2">Pedidos por aprobar</div>
                    <div className="small text-muted mb-2">Últimos pendientes</div>
                    <ul className="mb-0">
                      {(overview.pendingOrders || []).map(o => (
                        <li key={o._id}>#{o._id} · {o.user?.name || o.user?.email || 'Cliente'} · ${o.totals?.amount}</li>
                      ))}
                      {(!overview.pendingOrders || overview.pendingOrders.length===0) && (
                        <li>Sin pedidos pendientes.</li>
                      )}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="h-100">
                  <Card.Body>
                    <div className="fw-semibold mb-2">Últimos usuarios registrados</div>
                    <div className="small text-muted mb-2">Altas recientes</div>
                    <ul className="mb-0">
                      {(overview.recentUsers || []).map(u => (
                        <li key={u.id || u._id}>{u.name || u.email}</li>
                      ))}
                      {(!overview.recentUsers || overview.recentUsers.length===0) && (
                        <li>Sin nuevos usuarios.</li>
                      )}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <h6 className="mb-2">Últimos pedidos</h6>
            <Table size="sm" striped bordered hover responsive>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {(overview.lastOrders || []).map(o => (
                  <tr key={o._id}>
                    <td>{o._id}</td>
                    <td>{o.user?.name || o.user?.email || String(o.user)}</td>
                    <td>${o.totals?.amount}</td>
                    <td>
                      <Badge bg={STATUS_VARIANTS[o.status] || 'secondary'}>
                        {STATUS_LABELS[o.status] || o.status}
                      </Badge>
                    </td>
                    <td>{new Date(o.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {(!overview.lastOrders || overview.lastOrders.length===0) && (
                  <tr><td colSpan={5} className="text-center py-3">Sin datos.</td></tr>
                )}
              </tbody>
            </Table>
          </>
        )
      )}
    </>
  );

  const renderProducts = () => (
    <>
      {pErr && <Alert variant="danger" className="mb-3">{pErr}</Alert>}
      <Form onSubmit={(e)=>{e.preventDefault();}} className="mb-2">
        <Row className="g-2 align-items-end">
          <Col md>
            <Form.Label>Buscar por nombre</Form.Label>
            <Form.Control placeholder="Ej: vela" value={productQ} onChange={e=>setProductQ(e.target.value)} />
          </Col>
          <Col md>
            <Form.Label>Buscar por categoría</Form.Label>
            <Form.Select value={productCatQ} onChange={e=>setProductCatQ(e.target.value)}>
              <option value="">Todas</option>
              {productCategories
                .map(c => ({
                  id: c.id || c._id,
                  label: (c.nombre || c.name || c.label || '').trim(),
                }))
                .filter(c => c.id && c.label)
                .sort((a, b) => a.label.localeCompare(b.label, 'es'))
                .map(c => (
                  <option key={c.id} value={String(c.id)}>{c.label}</option>
                ))}
            </Form.Select>
          </Col>
          <Col md="auto" className="pt-4">
            <Button variant="outline-primary" onClick={async () => {
              setPLoading(true);
              try {
                const items = await fetchAllProducts({ q: productQ || undefined });
                setProducts(items);
                setProductPage(1);
              } catch (e) {
                setPErr(e?.message || 'Error al cargar productos');
              } finally {
                setPLoading(false);
              }
            }}>Buscar</Button>
          </Col>
        </Row>
      </Form>
      {pLoading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Imagen</th>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Activo</th>
              <th>Categoría</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
                const selectedLabel = selectedProductCategory
                  ? (selectedProductCategory.nombre || selectedProductCategory.name || selectedProductCategory.label || '')
                  : '';
                const sizeGroup = isSizeGroupLabel(selectedLabel);
                const filtered = products.filter(p => {
                  const name = (p.name || p.nombre || '').toLowerCase();
                  const catId = String(p.category?.id || p.category?._id || p.categoria?.id || p.categoria?._id || '');
                  const nameOk = !productQ.trim() || name.includes(productQ.trim().toLowerCase());
                  const catOk = !productCatQ.trim()
                    || (catId && (catId === String(productCatQ) || (productCatDescendants && productCatDescendants.has(catId))))
                    || (sizeGroup && sizeGroupMatchesProduct(p, selectedLabel));
                  return nameOk && catOk;
                });
              const totalPages = Math.max(1, Math.ceil(filtered.length / perPageProducts));
              const safePage = Math.min(productPage, totalPages);
              const start = (safePage - 1) * perPageProducts;
              const paginated = filtered.slice(start, start + perPageProducts);
              return paginated.map(p => {
                let img = p.imagen || p.imageUrl || p.image_url || (Array.isArray(p.images) && p.images[0]) || '';
                if (typeof img === 'string' && img.startsWith('/')) img = `${API_BASE}${img}`;
                const cat = p.category?.name || p.category?.nombre || p.categoria?.name || p.categoria?.nombre || '-';
                return (
                  <tr key={p._id || p.id}>
                    <td>{img ? <img alt={p.name} src={img} style={{width:40,height:40,objectFit:'cover'}} /> : null}</td>
                    <td>{p.name}</td>
                    <td>${Number(p.price ?? p.precio ?? 0).toFixed(2)}</td>
                    <td>{p.stock}</td>
                    <td>{p.active ? 'Sí' : 'No'}</td>
                    <td>{cat}</td>
                  </tr>
                );
              });
            })()}
            {products.length === 0 && (
              <tr><td colSpan={6} className="text-center py-3">Sin productos.</td></tr>
            )}
          </tbody>
        </Table>
      )}
      {!pLoading && products.length > 0 && (() => {
        const selectedLabel = selectedProductCategory
          ? (selectedProductCategory.nombre || selectedProductCategory.name || selectedProductCategory.label || '')
          : '';
        const sizeGroup = isSizeGroupLabel(selectedLabel);
        const filtered = products.filter(p => {
          const name = (p.name || p.nombre || '').toLowerCase();
          const catId = String(p.category?.id || p.category?._id || p.categoria?.id || p.categoria?._id || '');
          const nameOk = !productQ.trim() || name.includes(productQ.trim().toLowerCase());
          const catOk = !productCatQ.trim()
            || (catId && (catId === String(productCatQ) || (productCatDescendants && productCatDescendants.has(catId))))
            || (sizeGroup && sizeGroupMatchesProduct(p, selectedLabel));
          return nameOk && catOk;
        });
        const totalPages = Math.max(1, Math.ceil(filtered.length / perPageProducts));
        if (totalPages <= 1) return null;
        return (
          <div className="d-flex justify-content-between align-items-center mt-2">
            <div className="text-muted small">Página {productPage} de {totalPages}</div>
            <Pagination className="mb-0">
              <Pagination.First disabled={productPage <= 1} onClick={() => setProductPage(1)} />
              <Pagination.Prev disabled={productPage <= 1} onClick={() => setProductPage(p => Math.max(1, p - 1))} />
              <Pagination.Next disabled={productPage >= totalPages} onClick={() => setProductPage(p => Math.min(totalPages, p + 1))} />
              <Pagination.Last disabled={productPage >= totalPages} onClick={() => setProductPage(totalPages)} />
            </Pagination>
          </div>
        );
      })()}
    </>
  );

  return (
    <div className="container my-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="m-0">Administración</h5>
        <a
          className="btn btn-outline-secondary btn-sm"
          href={`${API_BASE}/admin/`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir Django admin
        </a>
      </div>
      <Card>
        <Card.Header><strong>Panel de control</strong></Card.Header>
        <Card.Body>
          <Tabs activeKey={tab} onSelect={(k) => setTab(k || 'overview')} className="mb-3">
            <Tab eventKey="overview" title="Resumen">
              {renderOverview()}
            </Tab>
            <Tab eventKey="orders" title="Pedidos">
              {renderOrders()}
            </Tab>
            <Tab eventKey="users" title="Usuarios">
              {renderUsers()}
            </Tab>
            <Tab eventKey="products" title="Productos">
              {renderProducts()}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      <Modal show={!!editOrder} onHide={closeEditOrder} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Pedido {editOrder ? `#${editOrder._id}` : ''}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editOrder && (
            <>
              <div className="mb-3">
                <div className="text-muted small">Cliente</div>
                <div className="fw-semibold">
                  {editOrder.user?.name || editOrder.user?.email || 'Cliente'}
                </div>
              </div>
              {editOrder.note && (
                <div className="mb-3">
                  <div className="text-muted small">Comentario del cliente</div>
                  <div>{editOrder.note}</div>
                </div>
              )}

              <Form.Label>Estado</Form.Label>
              <Form.Select className="mb-3" value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </Form.Select>

              <Table bordered size="sm" responsive>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ width: 110 }}>Precio</th>
                    <th style={{ width: 90 }}>Cantidad</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((it, idx) => (
                    <tr key={it.key}>
                      <td>
                        <div>{it.name}</div>
                        {it.attributes && Object.keys(it.attributes).length > 0 && (
                          <div className="text-muted small">
                            {Object.entries(it.attributes)
                              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                              .join(' · ')}
                          </div>
                        )}
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.price}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            setEditItems((prev) => prev.map((p, i) => (i === idx ? { ...p, price: val } : p)));
                          }}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          min={1}
                          step="1"
                          value={it.qty}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value) || 1);
                            setEditItems((prev) => prev.map((p, i) => (i === idx ? { ...p, qty: val } : p)));
                          }}
                        />
                      </td>
                      <td className="text-end">
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => setEditItems((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          Quitar
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {editItems.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-3">Sin items.</td></tr>
                  )}
                </tbody>
              </Table>

              <hr />
              <h6 className="mb-2">Agregar producto al pedido</h6>
              <Row className="g-2 align-items-end mb-2">
                <Col md={7}>
                  <Form.Label>Buscar por nombre</Form.Label>
                  <Form.Control
                    placeholder="Ej: vela, globo, bandeja..."
                    value={editSearchQ}
                    onChange={(e) => {
                      setEditSearchQ(e.target.value);
                      setEditSearchPage(1);
                    }}
                  />
                </Col>
                <Col md={5}>
                  <Form.Label>Categoría</Form.Label>
                  <Form.Select
                    value={editSearchCat}
                    onChange={(e) => {
                      setEditSearchCat(e.target.value);
                      setEditSearchPage(1);
                    }}
                  >
                    <option value="">Todas</option>
                    {productCategories
                      .map((c) => ({
                        id: c.id || c._id,
                        label: (c.nombre || c.name || c.label || '').trim(),
                      }))
                      .filter((c) => c.id && c.label)
                      .sort((a, b) => a.label.localeCompare(b.label, 'es'))
                      .map((c) => (
                        <option key={`edit-cat-${c.id}`} value={String(c.id)}>{c.label}</option>
                      ))}
                  </Form.Select>
                </Col>
              </Row>

              <Table bordered size="sm" responsive>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style={{ width: 120 }}>Precio</th>
                    <th style={{ width: 110 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const totalPages = Math.max(1, Math.ceil(editSearchFilteredProducts.length / perPageEditSearch));
                    const safePage = Math.min(editSearchPage, totalPages);
                    const start = (safePage - 1) * perPageEditSearch;
                    const pageItems = editSearchFilteredProducts.slice(start, start + perPageEditSearch);
                    if (pageItems.length === 0) {
                      return <tr><td colSpan={3} className="text-center py-2">Sin productos para agregar.</td></tr>;
                    }
                    return pageItems.map((p) => (
                      <tr key={`edit-add-${p._id || p.id}`}>
                        <td>{p.name || p.nombre}</td>
                        <td>${Number(p.price ?? p.precio ?? 0).toFixed(2)}</td>
                        <td className="text-end">
                          <Button size="sm" variant="outline-primary" onClick={() => addProductToEditOrder(p)}>
                            Agregar
                          </Button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </Table>
              {editSearchFilteredProducts.length > perPageEditSearch && (
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <div className="text-muted small">
                    Página {Math.min(editSearchPage, Math.max(1, Math.ceil(editSearchFilteredProducts.length / perPageEditSearch)))} de {Math.max(1, Math.ceil(editSearchFilteredProducts.length / perPageEditSearch))}
                  </div>
                  <Pagination className="mb-0">
                    <Pagination.First
                      disabled={editSearchPage <= 1}
                      onClick={() => setEditSearchPage(1)}
                    />
                    <Pagination.Prev
                      disabled={editSearchPage <= 1}
                      onClick={() => setEditSearchPage((p) => Math.max(1, p - 1))}
                    />
                    <Pagination.Next
                      disabled={editSearchPage >= Math.max(1, Math.ceil(editSearchFilteredProducts.length / perPageEditSearch))}
                      onClick={() => setEditSearchPage((p) => Math.min(Math.max(1, Math.ceil(editSearchFilteredProducts.length / perPageEditSearch)), p + 1))}
                    />
                    <Pagination.Last
                      disabled={editSearchPage >= Math.max(1, Math.ceil(editSearchFilteredProducts.length / perPageEditSearch))}
                      onClick={() => setEditSearchPage(Math.max(1, Math.ceil(editSearchFilteredProducts.length / perPageEditSearch)))}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeEditOrder}>Cerrar</Button>
          <Button variant="primary" onClick={saveEditOrder} disabled={!editItems.length}>Guardar cambios</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
