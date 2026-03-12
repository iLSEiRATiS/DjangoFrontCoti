import { useState } from 'react';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../lib/api';
import Seo from '../components/Seo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      setLoading(true);
      const res = await api.auth.forgotPassword({ email });
      setMsg(res?.detail || 'Si el email existe, enviamos instrucciones para restablecer la contrasena.');
    } catch (e2) {
      setErr(e2?.message || 'No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Seo title="Recuperar contrasena" description="Recuperacion de acceso de cuenta." path="/forgot-password" noindex />
      <div className="container my-5" style={{ maxWidth: 520 }}>
        <Card>
          <Card.Body>
            <h4 className="mb-3">Recuperar contrasena</h4>
            {err && <Alert variant="danger">{err}</Alert>}
            {msg && <Alert variant="success">{msg}</Alert>}
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                />
              </Form.Group>
              <Button type="submit" disabled={loading} className="w-100">
                {loading ? <Spinner size="sm" animation="border" /> : 'Enviar enlace'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </>
  );
}

