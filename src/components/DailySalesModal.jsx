import { useState, useEffect } from 'react';
import { Modal, Button, Table, Spinner } from 'react-bootstrap';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function DailySalesModal({ date, onClose }) {
  const { token, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.admin.dailySales(token, date);
        setData(res);
      } catch (e) {
        if (e?.isAuthError) return logout?.();
        setError(e.message || 'Error al cargar detalles del día');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [date, token, logout]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await api.admin.downloadDailySalesPdf(token, date);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ventas-${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      if (e?.isAuthError) return logout?.();
      alert('Error al descargar el PDF: ' + e.message);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal show onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Detalle de Ventas - {date}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-4"><Spinner animation="border" /></div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : data ? (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h5 className="mb-0">Monto Total: <span className="text-success">{formatMoney(data.total)}</span></h5>
                <div className="text-muted">{data.orders?.length || 0} pedidos</div>
              </div>
              <Button variant="primary" onClick={handleDownloadPdf} disabled={downloading}>
                {downloading ? 'Generando...' : 'Descargar PDF'}
              </Button>
            </div>
            
            <h6 className="border-bottom pb-2">Pedidos ({data.orders?.length || 0})</h6>
            {data.orders?.map(o => (
              <div key={o.id} className="mb-4">
                <div className="bg-light p-2 rounded mb-2 d-flex justify-content-between">
                  <div>
                    <strong>Pedido #{o.id}</strong> - {o.user}
                  </div>
                  <div>
                    <span className="me-3">{o.time}</span>
                    <strong className="text-success">{formatMoney(o.total)}</strong>
                  </div>
                </div>
                <Table size="sm" striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {o.products?.map((p, i) => (
                      <tr key={i}>
                        <td>{p.name}</td>
                        <td>{p.qty}</td>
                        <td>{formatMoney(p.total)}</td>
                      </tr>
                    ))}
                    {!o.products?.length && <tr><td colSpan="3" className="text-center">Sin productos</td></tr>}
                  </tbody>
                </Table>
              </div>
            ))}
            {!data.orders?.length && <div className="text-center text-muted">Sin pedidos</div>}
          </div>
        ) : null}
      </Modal.Body>
    </Modal>
  );
}
