import { useEffect, useState } from 'react';
import { Card, Table, Alert, Spinner, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const STATUS_LABELS = {
  created: 'Creado',
  approved: 'Aprobado',
  paid: 'Pagado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export default function Orders() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [rows, setRows] = useState([]);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleAuthError = (error) => {
    if (!error?.isAuthError) return false;
    logout?.();
    navigate('/login?redirect=/orders', { replace: true });
    return true;
  };

  const translateStatus = (raw) => {
    const s = (raw || '').trim().toLowerCase();
    const direct = STATUS_LABELS[s];
    if (direct) return direct;
    if (s.includes('approve')) return 'Aprobado';
    if (s.includes('create')) return 'Creado';
    if (s.includes('pay')) return 'Pagado';
    if (s.includes('ship')) return 'Enviado';
    if (s.includes('deliver')) return 'Entregado';
    if (s.includes('cancel')) return 'Cancelado';
    return raw || '-';
  };

  useEffect(() => {
    let alive = true;
    async function run() {
      setErr(''); setLoading(true);
      try {
        const data = await api.orders.mine(token);
        if (alive) setRows(Array.isArray(data?.orders) ? data.orders : []);
      } catch (e) {
        if (handleAuthError(e)) return;
        if (alive) setErr(e?.message || 'No se pudieron cargar los pedidos');
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (token) run();
    return () => { alive = false; };
  }, [token]);

  const downloadOrderPdf = async (order) => {
    const oid = order?.id || order?._id;
    if (!oid) return;
    try {
      setDownloadingId(String(oid));
      const blob = await api.orders.downloadPdf(token, oid);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pedido-${oid}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      if (handleAuthError(e)) return;
      window.alert(e?.message || 'No se pudo descargar el PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="container my-4">
      <Card>
        <Card.Header><strong>Mis pedidos</strong></Card.Header>
        <Card.Body>
          {err && <Alert variant="danger" className="mb-3">{err}</Alert>}
          {loading ? (
            <div className="text-center py-5"><Spinner animation="border" /></div>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Items</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(o => {
                  const raw = (o.status || '').toLowerCase();
                  const label = STATUS_LABELS[raw] || o.statusLabel || translateStatus(o.status);
                  const oid = o.id || o._id;
                  return (
                    <tr key={oid}>
                      <td>{oid}</td>
                      <td>{o.totals?.items}</td>
                      <td>${o.totals?.amount?.toFixed ? o.totals.amount.toFixed(2) : o.totals?.amount}</td>
                      <td>{label || (o.status || '').toLowerCase()}</td>
                      <td>{new Date(o.createdAt).toLocaleString()}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={downloadingId === String(oid)}
                          onClick={() => downloadOrderPdf(o)}
                        >
                          {downloadingId === String(oid) ? 'Descargando...' : 'Descargar PDF'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-3">Sin pedidos.</td></tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
