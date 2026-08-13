import { useState, useEffect } from 'react';
import { Form, Row, Col, Button, Spinner, Card } from 'react-bootstrap';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import DailySalesModal from './DailySalesModal';

export default function SalesCalendar() {
  const { token, logout } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedDate, setSelectedDate] = useState(null);
  
  const handleAuthError = (e) => {
    if (e?.isAuthError) {
      logout?.();
      return true;
    }
    return false;
  };

  const fetchCalendar = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.salesCalendar(token, year, month);
      setData(res || {});
    } catch (e) {
      if (handleAuthError(e)) return;
      setError(e.message || 'Error al cargar el calendario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, token]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
  
  const formatMoney = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  
  // Create grid cells
  const grid = [];
  for (let i = 0; i < firstDay; i++) {
    grid.push(<div key={`empty-${i}`} className="p-2 border bg-light text-muted" style={{ minHeight: '100px' }} />);
  }
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayData = data[dateStr];
    
    grid.push(
      <div 
        key={`day-${d}`} 
        className={`p-2 border position-relative ${dayData ? 'bg-white cursor-pointer hover-shadow' : 'bg-white'}`}
        style={{ minHeight: '100px', cursor: dayData ? 'pointer' : 'default' }}
        onClick={() => dayData && setSelectedDate(dateStr)}
      >
        <div className="fw-bold mb-1">{d}</div>
        {dayData && (
          <div className="text-success small fw-semibold">
            {formatMoney(dayData.total)}
            <br />
            <span className="text-muted">{dayData.orders} pedidos</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <Row className="mb-4 align-items-end">
        <Col md="auto">
          <Form.Group>
            <Form.Label>Año</Form.Label>
            <Form.Control type="number" value={year} onChange={e => setYear(Number(e.target.value))} />
          </Form.Group>
        </Col>
        <Col md="auto">
          <Form.Group>
            <Form.Label>Mes</Form.Label>
            <Form.Select value={month} onChange={e => setMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }).map((_, i) => {
                const mName = new Date(2000, i, 1).toLocaleString('es-ES', { month: 'long' });
                return <option key={i+1} value={i+1}>{mName.charAt(0).toUpperCase() + mName.slice(1)}</option>
              })}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md="auto" className="pb-1">
          <Button variant="outline-primary" onClick={fetchCalendar} disabled={loading}>
            Actualizar
          </Button>
        </Col>
      </Row>
      
      {error && <div className="alert alert-danger">{error}</div>}
      
      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Card>
          <Card.Body className="p-0">
            <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="p-2 border-bottom fw-bold text-center bg-light">{d}</div>
              ))}
              {grid}
            </div>
          </Card.Body>
        </Card>
      )}
      
      <style>{`
        .hover-shadow:hover { box-shadow: inset 0 0 0 2px #0d6efd; z-index: 1; }
        .cursor-pointer { cursor: pointer; }
      `}</style>
      
      {selectedDate && (
        <DailySalesModal 
          date={selectedDate} 
          onClose={() => setSelectedDate(null)} 
        />
      )}
    </div>
  );
}
