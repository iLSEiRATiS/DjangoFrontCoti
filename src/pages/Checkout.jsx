import { useEffect, useMemo, useState } from 'react';
import { Card, Table, Alert, Button, Form, Spinner, Badge } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const money = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

export default function Checkout() {
  const { token, user, updateUser, logout } = useAuth();
  const { cartItems, clearCart } = useCart();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState(100000);
  const [shipping, setShipping] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.profile?.phone || user?.shipping?.phone || '',
    address: user?.shipping?.address || '',
    city: user?.shipping?.city || '',
    zip: user?.shipping?.zip || '',
  });
  const [comment, setComment] = useState('');
  const [createdOrder, setCreatedOrder] = useState(null);

  const items = Array.isArray(cartItems) ? cartItems : [];
  const computed = useMemo(() => {
    const list = items.map((it) => {
      const qty = Number(it.cantidad ?? it.quantity ?? it.qty ?? 1);
      const price = Number(it.precio ?? it.price ?? 0);
      const name = it.nombre || it.name || it.title || 'Producto';
      const rawId = String(it.productId || it._id || it.id || '');
      const baseId = rawId.includes('::') ? rawId.split('::')[0] : rawId;
      const mergedMatch = /^merged-(?:[^-]+)-(.+)$/i.exec(baseId);
      const productId = String((mergedMatch && mergedMatch[1]) || baseId || '');
      const attributes = it.atributos || it.attributes || {};
      return { productId, name, price, qty, attributes };
    });
    const totals = list.reduce((acc, it) => {
      acc.items += it.qty;
      acc.amount += it.qty * it.price;
      return acc;
    }, { items: 0, amount: 0 });
    totals.amount = +totals.amount.toFixed(2);
    return { list, totals };
  }, [items]);

  useEffect(() => {
    let alive = true;
    api.products.storeConfig()
      .then((data) => {
        if (!alive) return;
        setMinOrderAmount(Number(data?.minOrderAmount || 100000));
      })
      .catch(() => {
        if (!alive) return;
        setMinOrderAmount(100000);
      });
    return () => { alive = false; };
  }, []);

  const belowMinimum = computed.totals.amount < minOrderAmount;
  const missingFields = [
    !shipping.name && 'nombre',
    !shipping.email && 'email',
    !shipping.phone && 'telefono',
    !shipping.address && 'direccion',
    !shipping.city && 'ciudad',
    !shipping.zip && 'cp',
  ].filter(Boolean);
  const canSubmit = !loading
    && computed.list.length > 0
    && missingFields.length === 0
    && !computed.list.some((it) => Number(it.price ?? 0) <= 0)
    && !belowMinimum;

  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (!token) {
      navigate('/login?redirect=/checkout', { replace: true });
      return;
    }
    if (!computed.list.length) {
      setErr('Tu carrito esta vacio.');
      return;
    }
    if (missingFields.length > 0) {
      setErr('Completa los datos del cliente para continuar.');
      return;
    }
    if (computed.list.some((it) => Number(it.price ?? 0) <= 0)) {
      setErr('Hay productos sin precio.');
      return;
    }
    if (belowMinimum) {
      setErr(`¡Ya casi terminás tu compra! El mínimo es de ${money.format(minOrderAmount)}. Podés agregar algunos productos más para alcanzarlo. ¡Gracias!`);
      return;
    }

    setErr('');
    setLoading(true);
    try {
      const profileResp = await api.account.updateProfile(token, {
        name: shipping.name,
        email: shipping.email,
        shipping: {
          name: shipping.name,
          address: shipping.address,
          city: shipping.city,
          zip: shipping.zip,
          phone: shipping.phone,
        },
        profile: { phone: shipping.phone },
      });
      if (profileResp?.user && typeof updateUser === 'function') {
        updateUser(profileResp.user);
      }

      const resp = await api.orders.create(token, {
        items: computed.list,
        shipping,
        note: comment.trim(),
        payment: { method: 'manual' },
      });
      if (typeof clearCart === 'function') clearCart();
      try {
        localStorage.removeItem('cart');
      } catch {}
      setCreatedOrder(resp.order || null);
    } catch (e) {
      if (e?.isAuthError) {
        logout?.();
        navigate('/login?redirect=/checkout', { replace: true });
        return;
      }
      setErr(e?.message || 'No se pudo crear el pedido');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkPaid() {
    if (!createdOrder) return;
    setErr('');
    setLoading(true);
    try {
      const resp = await api.orders.pay(token, createdOrder.id || createdOrder._id);
      setCreatedOrder(resp.order || createdOrder);
      navigate('/', { replace: true });
    } catch (e) {
      if (e?.isAuthError) {
        logout?.();
        navigate('/login?redirect=/checkout', { replace: true });
        return;
      }
      setErr(e?.message || 'No se pudo marcar como pagado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container my-4">
      <Card>
        <Card.Header><strong>Checkout</strong></Card.Header>
        <Card.Body>
          {err && <Alert variant="danger" className="mb-3">{err}</Alert>}
          {missingFields.length > 0 && (
            <Alert variant="warning" className="mb-3">
              Faltan datos del cliente: {missingFields.join(', ')}.
            </Alert>
          )}
          {computed.list.length > 0 && belowMinimum && (
            <Alert variant="warning" className="mb-3">
              ¡Ya casi terminás tu compra! El mínimo es de {money.format(minOrderAmount)}. Podés agregar algunos productos más para alcanzarlo. ¡Gracias!
            </Alert>
          )}
          {createdOrder && (
            <Alert variant="success" className="mb-3">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <div className="fw-bold mb-1">Pedido #{createdOrder.id || createdOrder._id}</div>
                  <div className="text-muted small">Estado: <Badge bg="info">{createdOrder.status}</Badge></div>
                  <div className="text-muted small">Enviamos el PDF por correo.</div>
                </div>
                <div className="d-flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={(createdOrder.status !== 'approved') || loading}
                    onClick={handleMarkPaid}
                  >
                    Ya pague
                  </Button>
                  <Button variant="outline-secondary" size="sm" onClick={() => navigate('/', { replace: true })}>
                    Ir al inicio
                  </Button>
                </div>
              </div>
              {createdOrder.status !== 'approved' && (
                <div className="text-muted small mt-2">
                  Espera la aprobacion del administrador para marcar como pagado.
                </div>
              )}
            </Alert>
          )}

          <h6 className="mb-2">Resumen</h6>
          <Table size="sm" bordered responsive>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="text-end">Precio</th>
                <th className="text-end">Cantidad</th>
                <th className="text-end">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {computed.list.map((it, i) => (
                <tr key={i}>
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
                  <td className="text-end">{money.format(it.price)}</td>
                  <td className="text-end">{it.qty}</td>
                  <td className="text-end">{money.format(it.qty * it.price)}</td>
                </tr>
              ))}
              {computed.list.length === 0 && (
                <tr><td colSpan={4} className="text-center py-3">Sin items.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={2}></th>
                <th className="text-end">{computed.totals.items}</th>
                <th className="text-end">{money.format(computed.totals.amount)}</th>
              </tr>
            </tfoot>
          </Table>

          <hr />

          <Form onSubmit={handlePlaceOrder}>
            <h6 className="mb-2">Envio</h6>
            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Label>Nombre</Form.Label>
                <Form.Control value={shipping.name} onChange={(e) => setShipping((s) => ({ ...s, name: e.target.value }))} required />
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" value={shipping.email} onChange={(e) => setShipping((s) => ({ ...s, email: e.target.value }))} required />
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Telefono</Form.Label>
                <Form.Control value={shipping.phone} onChange={(e) => setShipping((s) => ({ ...s, phone: e.target.value }))} required />
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Direccion</Form.Label>
                <Form.Control value={shipping.address} onChange={(e) => setShipping((s) => ({ ...s, address: e.target.value }))} required />
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Ciudad</Form.Label>
                <Form.Control value={shipping.city} onChange={(e) => setShipping((s) => ({ ...s, city: e.target.value }))} required />
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Codigo Postal</Form.Label>
                <Form.Control value={shipping.zip} onChange={(e) => setShipping((s) => ({ ...s, zip: e.target.value }))} required />
              </div>
              <div className="col-12 mb-3">
                <Form.Label>Comentario del pedido (opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  maxLength={1000}
                  placeholder="Ej: horario de entrega, referencia del pedido, observaciones."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>

            <Button className="w-100" type="submit" disabled={!canSubmit} aria-busy={loading}>
              {loading ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Procesando...</> : 'Confirmar pedido'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
