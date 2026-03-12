import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import api from '../lib/api';
import Seo from '../components/Seo';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setMsg('');

    if (!token) {
      setErr('El enlace no es valido o esta incompleto.');
      return;
    }
    if (password !== confirmPassword) {
      setErr('Las contrasenas no coinciden.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.auth.resetPassword({ token, newPassword: password });
      setMsg(res?.detail || 'Contrasena actualizada.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => navigate('/login'), 1200);
    } catch (e2) {
      setErr(e2?.message || 'No se pudo actualizar la contrasena');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Seo title="Restablecer contrasena" description="Formulario para restablecer acceso." path="/reset-password" noindex />
      <div className="container my-5" style={{ maxWidth: 520 }}>
        <Card>
          <Card.Body>
            <h4 className="mb-3">Cambiar contrasena</h4>
            {err && <Alert variant="danger">{err}</Alert>}
            {msg && <Alert variant="success">{msg}</Alert>}
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Nueva contrasena</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Repetir nueva contrasena</Form.Label>
                <Form.Control
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Form.Group>
              <Button type="submit" disabled={loading} className="w-100">
                {loading ? <Spinner size="sm" animation="border" /> : 'Guardar nueva contrasena'}
              </Button>
            </Form>
            <div className="mt-3 text-center">
              <Link to="/login">Volver a iniciar sesion</Link>
            </div>
          </Card.Body>
        </Card>
      </div>
    </>
  );
}
