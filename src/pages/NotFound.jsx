import { Button, Card, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import Seo from '../components/Seo';

export default function NotFound() {
  const location = useLocation();

  return (
    <Container className="py-5">
      <Seo
        title="Pagina no encontrada"
        description="La pagina solicitada no existe en CotiStore."
        path={location.pathname || '/404'}
        noindex
      />
      <Card className="border-0 shadow-sm mx-auto" style={{ maxWidth: 680 }}>
        <Card.Body className="p-4 p-md-5 text-center">
          <p className="text-uppercase small fw-bold text-muted mb-2">Error 404</p>
          <h1 className="h3 mb-3">Pagina no encontrada</h1>
          <p className="text-muted mb-4">
            La direccion que abriste no existe o ya no esta disponible. Podes volver al inicio
            o seguir navegando por la tienda.
          </p>
          <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
            <Button as={Link} to="/" variant="primary">
              Ir al inicio
            </Button>
            <Button as={Link} to="/productos" variant="outline-primary">
              Ver productos
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
